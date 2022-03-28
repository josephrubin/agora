#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { AgoraInfrastructureStack } from "../lib/agora-infrastructure-stack";

const app = new cdk.App();
new AgoraInfrastructureStack(app, "AgoraInfrastructureStack", {
  webappDomainName: "www.agora.app",
  graphqlSchemaFile: "graphql/schema.graphql",
  env: {
    account: "987352247039",
    region: "us-east-1",
  },
});
