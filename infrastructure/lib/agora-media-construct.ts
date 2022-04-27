import { Construct } from "constructs";
import {
  Duration,
  RemovalPolicy,
  aws_apigateway as apigateway,
  aws_cognito as cognito,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as cloudfront_origins,
  aws_s3 as s3
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";
import { makeNodejsLambda } from "./make-defaults";

interface AgoraMediaConstructProps {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  graphqlApi: appsync.GraphqlApi;
  region: string;
}

/**
 * Infrastructure for Agora audio processing and upload. This construct handles
 * upload, storage, logic, processing, and data synthesis relating to audio.
 */
export class AgoraMediaConstruct extends Construct {
  private _mediaPresignedUrlApi: apigateway.RestApi;
  private _mediaServeDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: AgoraMediaConstructProps) {
    super(scope, id);

    // ------------------------------------------------------------------------
    // Serve.
    // ------------------------------------------------------------------------

    // In this model, users upload directly to this bucket and pull from the
    // cloudfront distribution attached to it.
    const mediaStorageBucket = new s3.Bucket(this, "MediaStorageBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,

      cors: [{
        allowedOrigins: ["*"],
        allowedMethods: [s3.HttpMethods.PUT],
        allowedHeaders: ["*"],
      }],

      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this._mediaServeDistribution = new cloudfront.Distribution(this, "MediaServeDistribution", {
      defaultBehavior: {
        // Cloudfront will automatically grant itself access to the bucket.
        origin: new cloudfront_origins.S3Origin(mediaStorageBucket),
        // We don't allow any HTTP requests to this distribution. Our front-end
        // will always use HTTPS.
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },
      comment: "Serves and caches Agora media files.",
      httpVersion: cloudfront.HttpVersion.HTTP2,
      enabled: true,
      // Using the cheapest price class for now while developing, but can switch
      // to PRICE_CLASS_ALL later.
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // ------------------------------------------------------------------------
    // Upload.
    // ------------------------------------------------------------------------

    // The lambda to generate presigned S3 URLs for the client.
    const createUploadSignedUrlLambda = makeNodejsLambda(this, "CreateUploadSignedUrlLambda", {
      entry: "media/upload/create-upload-signed-url.ts",
      description: "Agora - generate presigned S3 URLs for client audio upload.",

      timeout: Duration.seconds(3),

      environment: {
        AGORA_S3_REGION: props.region,
        AGORA_CLIENT_MEDIA_UPLOAD_BUCKET: mediaStorageBucket.bucketName,
        AGORA_GRAPHQL_URL: props.graphqlApi.graphqlUrl,
      },
    });
    mediaStorageBucket.grantWrite(createUploadSignedUrlLambda);

    // An API Gateway to expose the presigned URL generator lambda.
    this._mediaPresignedUrlApi = new apigateway.RestApi(this, "AgoraMediaPresignedUrlApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["POST"],
      },
    });
    const upload = this._mediaPresignedUrlApi.root.addResource("upload");
    upload.addMethod("POST", new apigateway.LambdaIntegration(createUploadSignedUrlLambda));
  }

  get mediaPresignedUrlApi() {
    return this._mediaPresignedUrlApi;
  }

  get mediaServeDistribution() {
    return this._mediaServeDistribution;
  }
}
