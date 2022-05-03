/**
 * Right now we just have this single resolver which handles
 * all queries and mutations.
 */

import { Cast, Mutation, MutationCreateSessionArgs, MutationCreateUserArgs, MutationCreateCastArgs, User, Session, MutationRefreshSessionArgs, QueryReadAuthenticateArgs, AuthenticatedUser, AuthenticatedUserReadCastArgs, MutationTransferCastArgs, MutationExportCastArgs } from "~/generated/graphql-schema";
import { AsrLambdaHandler, DecodedAccessToken } from "./appsync-resolver-types";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProvider, AuthFlowType } from "@aws-sdk/client-cognito-identity-provider";
import { v4 as uuidv4 } from "uuid";
import { error } from "aws-cdk/lib/logging";
import * as crypto from "crypto";
import { NoUnusedVariablesRule } from "graphql";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import jwt_decode from "jwt-decode";

// TODO: add mutations for dealing with casts.

// See https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-dynamodb.

// Our infra file guarantees certain env variables form the
// otherwise unknown environment.
interface AgoraEnv {
  readonly AGORA_DYNAMODB_REGION: string;
  readonly AGORA_COGNITO_REGION: string;
  readonly AGORA_CAST_TABLE: string;
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
        console.log("Access token verified.");
      }
      catch {
        console.log("Verification error when trying to authenticate a user.");
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      const authenticatedUser: Omit<AuthenticatedUser, "user" | "casts"> = {
        accessToken: accessToken,
        userId: decodedAccessToken.sub,
        username: decodedAccessToken.username,
      };

      return authenticatedUser;
    }
  }
  else if (parentTypeName === "Mutation") {
    if (fieldName === "createCast") {
      const createCastArgs = args as MutationCreateCastArgs;

      // Ensure that the caller is verified.
      const accessToken = createCastArgs.accessToken;
      try {
        await accessTokenVerifier.verify(accessToken);
      }
      catch {
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      // TODO: deal with index later.
      const cast: Cast = {
        id: uuidv4(),
        index: -1,
        mimeType: createCastArgs.input.mimeType,
        uri: createCastArgs.input.uri,
        centralizedUri: createCastArgs.input.centralizedUri,
        history: [],
      };

      // Store the cast.
      try {
        await dynamoDbDocumentClient.put({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          Item: {
            userId: decodedAccessToken.sub,
            ...cast,
          },
        });
      }
      catch (err) {
        throw `Error storing cast with id ${cast.id}.`;
      }

      return cast;
    }
    else if (fieldName === "reorderCast") {
      /* Change the order of the cast's on a user's page. Low priority. */
      throw "Not implemented";
    }
    else if (fieldName === "transferCast") {
      const transferCastArgs = args as MutationTransferCastArgs;

      // Ensure that the caller is verified.
      const accessToken = transferCastArgs.accessToken;
      try {
        await accessTokenVerifier.verify(accessToken);
      }
      catch {
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      // The user input contains the destination username, we need to find the userId.
      const user = await cognitoClient.adminGetUser({
        UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
        Username: transferCastArgs.username,
      });
      if (!user.UserAttributes) {
        throw `Couldn't find recipient ${transferCastArgs.username}`;
      }
      let sub;
      for (let i = 0; i < user.UserAttributes.length; i++) {
        if (user.UserAttributes[i].Name === "sub") {
          sub = user.UserAttributes[i].Value;
        }
      }
      if (!sub) {
        throw `Couldn't find sub for recipient ${transferCastArgs.username}`;
      }

      // Transfer the cast.
      try {
        const updatedCast = await dynamoDbDocumentClient.update({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          Key: {
            userId: decodedAccessToken.sub,
            id: transferCastArgs.id,
          },
          UpdateExpression: "SET userId = :u, SET history = list_append(if_not_exists(history, :empty_list), :h)",
          ExpressionAttributeValues: {
            ":u": sub,
            ":empty_list": [],
            ":h": [{
              epoch: Math.floor(new Date().getTime() / 1000),
              event: "transfer",
              target: transferCastArgs.username,
            }],
          },
          ReturnValues: "ALL_NEW",
        });

        // Now that we've transfered the Cast, return the new object.
        return updatedCast.Attributes;
      }
      catch {
        throw `Could not transfer cast ${transferCastArgs.id}`;
      }
    }
    else if (fieldName === "exportCast") {
      /* We export the NFT to Solana on the frontend, but we will also mark this as completed on the backend. */
      const exportCastArgs = args as MutationExportCastArgs;

      // Ensure that the caller is verified.
      const accessToken = exportCastArgs.accessToken;
      try {
        await accessTokenVerifier.verify(accessToken);
      }
      catch {
        return null;
      }

      const decodedAccessToken = jwt_decode(accessToken) as DecodedAccessToken;

      // Transfer the cast.
      try {
        const updatedCast = await dynamoDbDocumentClient.update({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          Key: {
            userId: decodedAccessToken.sub,
            id: exportCastArgs.id,
          },
          UpdateExpression: "SET txId = :s, SET history = list_append(if_not_exists(history, :empty_list), :h)",
          ExpressionAttributeValues: {
            ":s": exportCastArgs.txId,
            ":empty_list": [],
            ":h": [{
              epoch: Math.floor(new Date().getTime() / 1000),
              event: "export",
              target: exportCastArgs.address,
            }],
          },
          ReturnValues: "ALL_NEW",
        });

        // Now that we've transfered the Cast, return the new object.
        return updatedCast.Attributes;
      }
      catch {
        throw `Could not export cast ${exportCastArgs.id}`;
      }
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

        // For now, we will confirm every user. In the future we may
        // wish to have users confirm their email address.
        await cognitoClient.adminConfirmSignUp({
          UserPoolId: agoraEnv.AGORA_USER_POOL_ID,
          Username: username,
        });

        const user: User = {
          username: username,
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
            username: username,
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
            username: username,
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
    if (fieldName === "casts") {
      try {
        const { Items: casts } = await dynamoDbDocumentClient.query({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          IndexName: "userId_index",
          KeyConditionExpression: "userId = :uid",
          ExpressionAttributeValues: {
            ":uid": (source as AuthenticatedUser).userId,
          },
        });
        return casts;
      }
      catch {
        throw "Error fetching casts.";
      }
    }
    else if (fieldName === "readCast") {
      try {
        const { Item: cast } = await dynamoDbDocumentClient.get({
          TableName: agoraEnv.AGORA_CAST_TABLE,
          Key: {
            userId: (source as AuthenticatedUser).userId,
            id: (args as AuthenticatedUserReadCastArgs).id,
          },
        });
        return cast;
      }
      catch {
        throw "Error fetching cast.";
      }
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

async function verifyAccessTokenOrThrow(accessToken: string): Promise<DecodedAccessToken> {
  try {
    await accessTokenVerifier.verify(accessToken);
  }
  catch {
    throw "Invalid access token.";
  }
  return jwt_decode(accessToken) as DecodedAccessToken;
}

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

exports.lambdaHandler = lambdaHandler;
