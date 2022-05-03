import { Construct } from "constructs";
import {
  Duration,
  aws_cognito as cognito,
  aws_iam as iam
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { makeNodejsLambda } from "./make-defaults";
import { AgoraAuthConstruct } from "./agora-auth-construct";
import { AgoraDataConstruct } from "./agora-data-construct";

interface AgoraGraphqlConstructProps {
  readonly graphqlSchemaFile: string;
  readonly authConstruct: AgoraAuthConstruct;
  readonly dataConstruct: AgoraDataConstruct;
  readonly region: string;
}

const QUERY_TYPE = "Query";
const MUTATION_TYPE = "Mutation";

/**
 * Infrastructure for the GraphQL API layer.
 */
export class AgoraGraphqlConstruct extends Construct {
  private _api: appsync.GraphqlApi;
  private _userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AgoraGraphqlConstructProps) {
    super(scope, id);

    // ------------------------------------------------------------------------
    // Authorizer.
    // ------------------------------------------------------------------------

    // Use lambda authorization. See the lambda code for more details on this choice.
    const graphqlApiAuthorizer = makeNodejsLambda(this, "AgoraGraphqlApiAuthorizer", {
      entry: "graphql/authorizer.ts",
      description: "Agora - authorization for our GraphQL API.",
      timeout: Duration.seconds(1),
    });

    graphqlApiAuthorizer.addPermission("AppSyncServicePrincipalPermission", {
      principal: new iam.ServicePrincipal("appsync.amazonaws.com"),
      action: "lambda:InvokeFunction",
    });

    // ------------------------------------------------------------------------
    // Interface.
    // ------------------------------------------------------------------------

    // The GraphQL API for our data.
    this._api = new appsync.GraphqlApi(this, "AgoraApi", {
      name: "AgoraApi",
      // Path to our graphql schema. We don't use the cdk code-first approach because
      // having a schema file allows us to use graphql tooling throughout our project.
      schema: appsync.Schema.fromAsset(props.graphqlSchemaFile),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.LAMBDA,
          lambdaAuthorizerConfig: {
            handler: graphqlApiAuthorizer,
            resultsCacheTtl: Duration.minutes(10),
          },
        },
      },
      xrayEnabled: true,
    });

    // Our GraphQL resolver is a client of the user pool, meaning it can invoke user pool
    // operations. Since we set generateSecret to true, its requests must come with a
    // MAC to ensure it is not impersonated.
    this._userPoolClient = props.authConstruct.userPool.addClient("AgoraGraphqlClient", {
      generateSecret: true,
      refreshTokenValidity: Duration.days(30),
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      enableTokenRevocation: true,
      preventUserExistenceErrors: true,
      authFlows: {
        // Enables server-side username / password authentication.
        adminUserPassword: true,
      },
    });

    // ------------------------------------------------------------------------
    // Resolution.
    // ------------------------------------------------------------------------

    // The lambda resolver that we use for all our GraphQL queries and mutations.
    // We don't use dynamodb data sources and resolver templates because they don't work.
    const apiResolverLambda = makeNodejsLambda(this, "ApiResolverLambda", {
      entry: "graphql/resolvers/resolve.ts",
      description: "Agora - resolve GraphQL requests.",

      timeout: Duration.seconds(30),

      environment: {
        AGORA_DYNAMODB_REGION: props.region,
        AGORA_COGNITO_REGION: props.region,
        AGORA_CAST_TABLE: props.dataConstruct.castTable.tableName,
        AGORA_USER_POOL_ID: props.authConstruct.userPool.userPoolId,
        AGORA_USER_POOL_CLIENT_ID: this._userPoolClient.userPoolClientId,
      },
    });
    // Add some resource permissions to our resolver.
    props.dataConstruct.castTable.grantReadWriteData(apiResolverLambda);
    // Add some additional cognito permissions to our resolver.
    const resolverCognitoPolicy = new iam.PolicyStatement();
    resolverCognitoPolicy.addResources(props.authConstruct.userPool.userPoolArn);
    resolverCognitoPolicy.addActions(
      "cognito-idp:DescribeUserPoolClient",
      "cognito-idp:AdminConfirmSignUp",
      "cognito-idp:AdminInitiateAuth",
      "cognito-idp:AdminGetUser"
    );
    apiResolverLambda.addToRolePolicy(resolverCognitoPolicy);

    // The data source that our lambda resolves. We currently use it for all queries and mutations.
    const apiLambdaDataSource = this._api.addLambdaDataSource("ApiLambdaDataSource", apiResolverLambda);

    /* GraphQL field resolvers. We don't have to define a resolver for every type, since fields
     * can be resolved by default if their parent query contains a field that matches its name.
     * For all other cases, we define resolvers to fetch our custom types. */

    // Query parent.
    apiLambdaDataSource.createResolver({
      typeName: QUERY_TYPE,
      fieldName: "readAuthenticate",
    });

    // Mutation parent.
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "createCast",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "reorderCast",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "transferCast",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "exportCast",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "createUser",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "createSession",
    });
    apiLambdaDataSource.createResolver({
      typeName: MUTATION_TYPE,
      fieldName: "refreshSession",
    });

    // AuthenticatedUser parent.
    apiLambdaDataSource.createResolver({
      typeName: "AuthenticatedUser",
      fieldName: "casts",
    });
    apiLambdaDataSource.createResolver({
      typeName: "AuthenticatedUser",
      fieldName: "readCast",
    });
  }

  get api() {
    return this._api;
  }

  get userPoolClient() {
    return this._userPoolClient;
  }
}
