import { Construct } from "constructs";
import {
  aws_apigateway as apigateway,
  aws_certificatemanager as acm,
  aws_iam as iam,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_ecr_assets as ecr_assets
} from "aws-cdk-lib";
import * as appsync from "@aws-cdk/aws-appsync-alpha";

interface AgoraWebappConstructProps {
  readonly domainName: string;
  readonly dockerAppDirectory: string;
  readonly dockerAppPort: number;
  readonly graphqlApi: appsync.GraphqlApi;
  readonly presignedUrlApi: apigateway.RestApi;
}

/**
 * Infrastructure for Agora front end web application. This includes the Remix container
 * itself along with the container orchistration and SSL certificate.
 */
export class AgoraWebappConstruct extends Construct {
  private _certificate: acm.Certificate;
  private _role: iam.Role;
  private _fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

  constructor(scope: Construct, id: string, props: AgoraWebappConstructProps) {
    super(scope, id);

    this._certificate = new acm.Certificate(this, "AgoraWebappCertificate", {
      domainName: props.domainName,
      validation: acm.CertificateValidation.fromDns(),
    });
    this._role = new iam.Role(this, "WebappRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    const agoraCluster = new ecs.Cluster(this, "AgoraCluster", {
      clusterName: "AgoraCluster",
    });
    this._fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "AgoraWebappFargateService", {
      cluster: agoraCluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 1,
      publicLoadBalancer: true,
      certificate: this._certificate,
      redirectHTTP: true,
      recordType: ecs_patterns.ApplicationLoadBalancedServiceRecordType.NONE,
      taskImageOptions: {
        image: ecs.ContainerImage.fromDockerImageAsset(
          new ecr_assets.DockerImageAsset(this, "WebappDockerImageAsset", {
            directory: props.dockerAppDirectory,
          })
        ),
        containerPort: props.dockerAppPort,
        taskRole: this._role,
        environment: {
          AGORA_GRAPHQL_URL: props.graphqlApi.graphqlUrl,
          AGORA_PRESIGNED_URL_API_URL: props.presignedUrlApi.url,
        },
      },
    });
  }

  get certificate() {
    return this._certificate;
  }

  get role() {
    return this._role;
  }

  get fargateService() {
    return this._fargateService;
  }
}
