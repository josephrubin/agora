import { Construct } from "constructs";
import {
  CfnOutput,
  StackProps,
  Environment,
  Stack
} from "aws-cdk-lib";
import { AgoraWebappConstruct } from "./agora-webapp-construct";
import { AgoraDataConstruct } from "./agora-data-construct";
import { AgoraAuthConstruct } from "./agora-auth-construct";
import { AgoraGraphqlConstruct } from "./agora-graphql-construct";
import { AgoraMediaConstruct } from "./agora-media-construct";

interface AgoraInfrastructureStackProps extends Omit<StackProps, "env"> {
  // The DNS name that the Agora web app should be hosted at.
  readonly webappDomainName: string;
  // Path to the file that contains the graphql schema for our API.
  readonly graphqlSchemaFile: string;
  // Override the parent type to make env deeply required.
  readonly env: Required<Environment>;
}

export class AgoraInfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props: AgoraInfrastructureStackProps) {
    super(scope, id, props);

    // ------------------------------------------------------------------------
    // Auth (user account authentication and authorization).
    // ------------------------------------------------------------------------

    const authConstruct = new AgoraAuthConstruct(this, "AgoraAuthConstruct");

    // ------------------------------------------------------------------------
    // Data (application permanent storage, except for media).
    // ------------------------------------------------------------------------

    const dataConstruct = new AgoraDataConstruct(this, "AgoraDataConstruct");

    // ------------------------------------------------------------------------
    // API (internal bridge between client and data).
    // ------------------------------------------------------------------------

    const graphqlConstruct = new AgoraGraphqlConstruct(this, "AgoraGraphqlConstruct", {
      graphqlSchemaFile: props.graphqlSchemaFile,
      authConstruct: authConstruct,
      dataConstruct: dataConstruct,
      region: props.env.region,
    });

    // ------------------------------------------------------------------------
    // Media (file uploads and transformations).
    // ------------------------------------------------------------------------

    const mediaConstruct = new AgoraMediaConstruct(this, "AgoraMediaConstruct", {
      userPool: authConstruct.userPool,
      userPoolClient: graphqlConstruct.userPoolClient,
      graphqlApi: graphqlConstruct.api,
      region: props.env.region,
    });

    // ------------------------------------------------------------------------
    // WWW (web app front end).
    // ------------------------------------------------------------------------

    const webappConstruct = new AgoraWebappConstruct(this, "AgoraWebappConstruct", {
      domainName: props.webappDomainName,
      dockerAppDirectory: ".",
      dockerAppPort: 3000,
      graphqlApi: graphqlConstruct.api,
      presignedUrlApi: mediaConstruct.mediaPresignedUrlApi,
    });

    // ------------------------------------------------------------------------
    // Output (results from this stack's synthesis).
    // ------------------------------------------------------------------------

    new CfnOutput(this, "AgoraGraphqlUrl", {
      description: "The URL of the Agora internal GraphQL service.",
      value: graphqlConstruct.api.graphqlUrl,
    });

    new CfnOutput(this, "AgoraGraphqlDevApiKey", {
      description: "The development API key of the AgoraGraphql API.",
      value: graphqlConstruct.api.apiKey || "",
    });
  }
}
