#!/usr/bin/env node
import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { AgoraInfrastructureStack } from "../lib/agora-infrastructure-stack";

const app = new App();
new AgoraInfrastructureStack(app, "AgoraInfrastructureStack", {
  webappDomainName: "www.josephrubin.dev",
  graphqlSchemaFile: "graphql/schema.graphql",
  env: {
    account: "987352247039",
    region: "us-east-1",
  },
});
