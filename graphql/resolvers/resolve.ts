/**
 * Right now we just have this single resolver which handles
 * all queries and mutations.
 */

import { Cast, Collection, Mutation, MutationCreateCollectionArgs, MutationCreateSessionArgs, MutationCreateUserArgs, QueryReadCollectionArgs, User, Session, MutationRefreshSessionArgs, QueryReadAuthenticateArgs, AuthenticatedUser, Principal } from "~/generated/graphql-schema";
import { AsrLambdaHandler, DecodedAccessToken } from "./appsync-resolver-types";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProvider, AuthFlowType } from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";
import { error } from "aws-cdk/lib/logging";
import * as crypto from "crypto";
import { NoUnusedVariablesRule } from "graphql";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import * as stx from "./stacks";
import jwt_decode from "jwt-decode";

// See https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb.

// Our infra file guarantees certain env variables form the
// otherwise unknown environment.
interface AgoraEnv {
  readonly AGORA_DYNAMODB_REGION: string;
  readonly AGORA_COGNITO_REGION: string;
  readonly AGORA_COLLECTION_TABLE: string;
  readonly AGORA_CAST_TABLE: string;
  readonly AGORA_PRINCIPAL_TABLE: string;
  readonly AGORA_USER_POOL_ID: string;
  readonly AGORA_USER_POOL_CLIENT_ID: string;
}
const agoraEnv = process.env as unknown as AgoraEnv;

// Our connection to DynamoDB. Created when this lambda starts.
const dynamoDbDocumentClient = DynamoDBDocument.from(
  new DynamoDB({ region: agoraEnv.AGORA_DYNAMODB_REGION })
);

// Our connection to Cognito.
const cognitoClient = new CognitoIdentityProvider({
  region: agoraEnv.AGORA_COGNITO_REGION,
});

// A verifier that can validate Cognito JWTS.
const accessTokenVerifier = CognitoJwtVerifier.create({
  userPoolId: agoraEnv.AGORA_USER_POOL_ID,
  clientId: agoraEnv.AGORA_USER_POOL_CLIENT_ID,
  tokenUse: "access",
});

// A GraphQL schema type that has at least an id.
interface TypeWithId {
  readonly id: string
}

/**
 * Resolve the AppSync data request.
 * @param event the AppSync event.
 * @param context the lambda execution context.
 * @param callback the function to call with errors / results.
 */
const lambdaHandler: AsrLambdaHandler = async (event) => {
  // The name of the parent we are resolving inside and the field we're resolving.
  const { parentTypeName, fieldName } = event.info;
  // Arguments to the GraphQL field.
  const args = event.arguments;
  // The parent object (as it was returned from the resolver) if this is a subquery.
  // Thus we are not guaranteed to have this object. If we do, it contains every
  // attribute that was returned from the resolver. If we optimize in the future, we
  // cannot guarantee what fields will be present. But we will always want to have at
  // least the id here for types with id so we will never optimize that away (so we can
  // find related sub-objects).
  const source = event.source;

  console.log(`Resolve field ${fieldName} on parent ${parentTypeName}.`);

  function returnError(errorMessage: string): never {
    throw errorMessage;
  }

  // Our Cognito client app secret used to auth requests to Cognito.
  // We get it on every request because it might change.
  // TODO - only get it for requests that we might need it.
  const cognitoAppSecret = (await cognitoClient.describeUserPoolClient({
    UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
    ClientId: agoraEnv.AGORA_USER_POOL_CLIENT_ID,
  })).UserPoolClient?.ClientSecret;
  if (!cognitoAppSecret) {
    throw "Error getting Cognito app secret.";
  }
  function calculateSecretHash(message: string): string {
    if (cognitoAppSecret) {
      return calculateSecretHashWithKey(message, cognitoAppSecret);
    }
    else {
      throw "Attempt to calculate secret hash without Cognito app secret.";
    }
  }

  // First we find the name of the parent type that this request is coming from,
  // then we find the name of the field we are trying to resolve.
  if (parentTypeName === "Query") {
    if (fieldName === "readAuthenticate") {
      const readAuthenticateArgs = (args as QueryReadAuthenticateArgs);

      const accessToken = readAuthenticateArgs.accessToken;
      try {
        await accessTokenVerifier.verify(accessToken);
        console.log("Access token verified.")
      }
      catch {
        console.log("Verification error when trying to authenticate a user.");
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      const authenticatedUser: Omit<AuthenticatedUser, "user" | "collections"> = {
        accessToken: accessToken,
        userId: decodedAccessToken.sub,
        username: decodedAccessToken.username,
      };

      return authenticatedUser;
    }
    else if (fieldName === "readCollections") {
      // Return all collections.
      try {
        const { Items: collections } = await dynamoDbDocumentClient.scan({
          TableName: agoraEnv.AGORA_COLLECTION_TABLE,
        });
        return collections;
      }
      catch (err) {
        returnError(`Error reading collections: ${String(err)}`);
      }
    }
    else if (fieldName === "readCollection") {
      // Return a single collection by id.
      const { id } = args as QueryReadCollectionArgs;

      try {
        const { Item: collection } = await dynamoDbDocumentClient.get({
          TableName: agoraEnv.AGORA_COLLECTION_TABLE,
          Key: {
            id: id,
          },
        });
        // Return the collection we found or null to signal that we didn't find one.
        return collection;
      }
      catch (err) {
        returnError(`Error fetching collection with id ${id}: ${String(err)}`);
      }
    }
  }
  else if (parentTypeName === "Mutation") {
    if (fieldName === "createCollection") {
      const createCollectionArgs = (args as MutationCreateCollectionArgs);

      // Ensure that the caller is verified.
      const accessToken = createCollectionArgs.accessToken;
      try {
        await accessTokenVerifier.verify(accessToken);
      }
      catch {
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      // Create a new collection object without custom nested types that we need to
      // store elsewhere (such as casts).
      const collectionBase = objectWithoutKeys({
        id: uuidv4(),
        userId: decodedAccessToken.sub,
        ...createCollectionArgs.input,
      }, ["casts"]);

      // First store the nested casts in DynamoDB...
      const savedCasts: Cast[] = [];
      const storeCastPromises = [];
      for (let i = 0; i < createCollectionArgs.input.casts.length; i++) {
        const castInput = createCollectionArgs.input.casts[i];

        // Create a new cast object for each cast in the input, assign it the input
        // data, and give it some default values.
        const cast: Cast = {
          id: uuidv4(),
          isClaimed: false,
          assignedPrincipal: null,
          ...castInput,
        };
        savedCasts.push(cast);

        // Save the cast, making sure to add values for our global secondary indices.
        const putPromise = dynamoDbDocumentClient.put({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          Item: {
            collectionId: collectionBase.id,
            userId: decodedAccessToken.sub,
            ...cast,
          },
        });
        storeCastPromises.push(putPromise);
      }
      try {
        await Promise.all(storeCastPromises);
      }
      catch (err) {
        error("Error storing at least one cast.");
      }

      // ...then store the collection.
      try {
        await dynamoDbDocumentClient.put({
          TableName: agoraEnv.AGORA_COLLECTION_TABLE,
          Item: collectionBase,
        });
      }
      catch (err) {
        error(`Error storing collection with id ${collectionBase.id}.`);
      }

      // Now we must create the actual collection on the blockchain.
      const { Item: principal } = await dynamoDbDocumentClient.get({
        TableName: agoraEnv.AGORA_PRINCIPAL_TABLE,
        Key: {
          userId: decodedAccessToken.sub,
        },
      });
      if (!principal) {
        returnError("Could not retrieve user's principal.");
      }
      const classResponse = await stx.createNftClass(principal as Principal, createCollectionArgs.input.title);
      console.log("Create NFT class response:", classResponse);

      if (!classResponse.error) {
        // The NFT class created successfully. We now want to create the NFTs themselves.
        console.log("Looks like the NFT class was created.");
        console.log("Attempting to create NFTs.");

        const lastClass = await stx.readFromContract(principal as Principal, "read-class-count", []) - 1;
        console.log("Attempt to read from contract. Got back", lastClass);

        for (const cast in savedCasts) {
          if (Object.prototype.hasOwnProperty.call(savedCasts, cast)) {
            const element = savedCasts[cast];

            await stx.createNft(lastClass, element.data.uri, principal as Principal);
            console.log("Attempt to create NFT in class.");
          }
        }
      }

      // We also have to return the new Collection that we created with the mutation.
      // We've been saving this information in RAM so we can do it easily. Note that
      // we may be tempted to just recurse on a Query, but DynamoDB is only eventually
      // consistent so that might not even work anyway.
      const collection: Collection = {
        ...collectionBase,
        casts: savedCasts,
      };
      return collection;
    }
    else if (fieldName === "createUser") {
      const { username, password } = (args as MutationCreateUserArgs);

      try {
        // Try to sign up the user in cognito.
        const signUpResponse = await cognitoClient.signUp({
          ClientId: agoraEnv.AGORA_USER_POOL_CLIENT_ID,
          SecretHash: calculateSecretHash(username),
          Username: username,
          Password: password,
        });

        // Now that the user has been signed up, generate and store the user's
        // new Principal.
        const principal = await stx.createPrincipal(password);
        try {
          await dynamoDbDocumentClient.put({
            TableName: agoraEnv.AGORA_PRINCIPAL_TABLE,
            Item: {
              publicAddress: principal.publicAddress,
              password: principal.password,
              secretKey: principal.secretKey,
              stxPrivateKey: principal.stxPrivateKey,
              userId: signUpResponse.UserSub,
            },
          });
        }
        catch (err) {
          error(`Error storing Principal for user ${signUpResponse.UserSub}.`);
        }

        // For now, we will confirm every user. In the future we may
        // wish to have users confirm their email address.
        await cognitoClient.adminConfirmSignUp({
          UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
          Username: username,
        });

        const user: User = {
          username: username,
          principal: {
            ...principal,
            nfts: [],
          },
        };
        return user;
      }
      catch (err) {
        returnError(`Error creating user: ${String(err)}.`);
      }
    }
    else if (fieldName === "createSession") {
      const { username, password } = (args as MutationCreateSessionArgs);

      try {
        const initiateAuthResult = await cognitoClient.adminInitiateAuth({
          ClientId: agoraEnv.AGORA_USER_POOL_CLIENT_ID,
          UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
          AuthFlow: AuthFlowType.ADMIN_USER_PASSWORD_AUTH,
          AuthParameters: {
            USERNAME: username,
            SECRET_HASH: calculateSecretHash(username),
            PASSWORD: password,
          },
        });

        const accessToken = initiateAuthResult.AuthenticationResult?.AccessToken;
        const refreshToken = initiateAuthResult.AuthenticationResult?.RefreshToken;
        if (accessToken && refreshToken) {
          // Authentication success! Return the tokens as the session.
          const session: Session = {
            accessToken: accessToken,
            refreshToken: refreshToken,
          };
          return session;
        }
        else {
          // Authentication worked but no tokens were created.
          throw "Authentication did not fail but tokens were not created.";
        }
      }
      catch {
        return null;
      }
    }
    else if (fieldName === "refreshSession") {
      const { username, refreshToken:inputRefreshToken } = (args as MutationRefreshSessionArgs);

      try {
        const initiateAuthResult = await cognitoClient.adminInitiateAuth({
          ClientId: agoraEnv.AGORA_USER_POOL_CLIENT_ID,
          UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
          AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
          AuthParameters: {
            REFRESH_TOKEN: inputRefreshToken,
            SECRET_HASH: calculateSecretHash(username),
          },
        });

        const accessToken = initiateAuthResult.AuthenticationResult?.AccessToken;
        const refreshToken = initiateAuthResult.AuthenticationResult?.RefreshToken;
        if (accessToken && refreshToken) {
          // Authentication success! Return the tokens as the session.
          const session: Session = {
            accessToken: accessToken,
            refreshToken: refreshToken,
          };
          return session;
        }
        else {
          // Authentication worked but no tokens were created.
          throw "Authentication did not fail but tokens were not created.";
        }
      }
      catch {
        // Authentication failed.
        return null;
      }
    }
  }
  else if (parentTypeName === "AuthenticatedUser") {
    if (fieldName === "collections") {
      try {
        const { Items: collections } = await dynamoDbDocumentClient.query({
          TableName: agoraEnv.AGORA_COLLECTION_TABLE,
          IndexName: "userId_index",
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: {
            ":uid": (source as AuthenticatedUser).userId,
          },
        });
        return collections;
      }
      catch {
        throw "Error fetching collections.";
      }
    }
  }
  else if (parentTypeName === "Collection") {
    if (fieldName === "casts") {
      // Return all casts in the parent collection. There's no need to define
      // a resolver for the cast data field because it will be stored in the cast table
      // and subject to the default resolver.
      const { Items: casts } = await dynamoDbDocumentClient.query({
        TableName: agoraEnv.AGORA_CAST_TABLE,
        IndexName: "collectionId_index",
        KeyConditionExpression: "collectionId = :cid",
        ExpressionAttributeValues: {
          ":cid": (source as TypeWithId).id,
        },
      });

      return casts;
    }
  }
  else {
    throw `Invalid parentTypeName ${parentTypeName}.`;
  }

  // If we reach here, we have not yet called result or error
  // (synchronously) so we must report an error.
  throw `No resolver found for field ${fieldName} from parent type ${parentTypeName}.`;

  // TODO: keep scanning until we get all the elements for reads.
  // TODO: use requested vars to limit scan for more efficiency
  //  rather than wait for gql to filter it out using
  //  event.info.selectionSetList.
};

/**
 * API calls to our Cognito User Pool must be authenticated with the secret key that our client
 * app has. (This is optional, but we've added to it enhance security.) This function will
 * sign (HMAC) a message with that key.
 */
function calculateSecretHashWithKey(message: string, key: string) {
  return crypto.createHmac("sha256", key)
    .update(message)
    .update(agoraEnv.AGORA_USER_POOL_CLIENT_ID)
    .digest("base64");
}

/**
 * Returns the source object with the specified keys removed.
 * Respects the types to produce a correctly typed output. We use
 * a cast or two (this can be avoided with more clever type
 * metaprogramming) but this should be valid and is much simpler.
 */
function objectWithoutKeys<T extends object, K extends keyof T>(source: T, keysToRemove: K[]): Omit<T, K> {
  return Object.fromEntries(
    Object.entries(source).filter(([key, _value]) => !keysToRemove.includes(key as K))
  ) as Omit<T, K>;
}

exports.lambdaHandler = lambdaHandler;
