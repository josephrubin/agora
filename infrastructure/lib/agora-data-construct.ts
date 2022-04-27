import { Construct } from "constructs";
import {
  RemovalPolicy,
  aws_dynamodb as dynamodb
} from "aws-cdk-lib";

/**
 * Infrastructure for Agora front end web application. This includes the Remix container
 * itself along with the container orchistration and SSL certificate.
 */
export class AgoraDataConstruct extends Construct {
  private _castTable: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // The table that keeps track of our NFT casts.
    this._castTable = new dynamodb.Table(this, "CastTable", {
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      contributorInsightsEnabled: true,
    });
    // We want to be able to query this table by the user
    // that the casts are associated with.
    this._castTable.addGlobalSecondaryIndex({
      indexName: "userId_index",
      partitionKey: {
        name: "userId",
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }

  get castTable() {
    return this._castTable;
  }
}
