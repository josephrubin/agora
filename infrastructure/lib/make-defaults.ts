import { Construct } from "constructs";
import {
  aws_lambda as lambda,
  aws_lambda_nodejs as node_lambda
} from "aws-cdk-lib";

/** Return a NodeJS lambda with defaults that we like for Agora. */
export function makeNodejsLambda(scope: Construct, id: string, props: Partial<node_lambda.NodejsFunctionProps>) {
  return new node_lambda.NodejsFunction(scope, id, {
    runtime: lambda.Runtime.NODEJS_14_X,
    handler: "lambdaHandler",
    tracing: lambda.Tracing.ACTIVE,

    bundling: {
      minify: false, /* TODO: true. *?/
      banner: "/* (c) Agora; minified and bundled. */",
    },

    ...props,
  });
}
