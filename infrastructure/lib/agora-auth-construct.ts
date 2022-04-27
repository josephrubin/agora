import { Construct } from "constructs";
import {
  aws_cognito as cognito
} from "aws-cdk-lib";

/**
 * Infrastructure for Agora user authentication and authorization.
 */
export class AgoraAuthConstruct extends Construct {
  private _userPool: cognito.UserPool;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // The user pool for our app's auth.
    this._userPool = new cognito.UserPool(this, "AgoraUserPool", {
      selfSignUpEnabled: true,
      userVerification: {
        emailSubject: "Verify your account for Agora!",
        emailBody: "Thanks for signing up for Agora! Your verification code is {####}",
        emailStyle: cognito.VerificationEmailStyle.CODE,
        smsMessage: "Thanks for signing up for Agora! Your verification code is {####}",
      },
      userInvitation: {
        emailSubject: "Invite to join Agora!",
        emailBody: "Hello {username}, you have been invited to join Agora! Your temporary password is {####}",
        smsMessage: "Hello {username}, your temporary password for Agora is {####}",
      },
      signInAliases: {
        username: true,
        email: true,
      },
      passwordPolicy: {
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
        minLength: 6,
      },
    });
  }

  get userPool() {
    return this._userPool;
  }
}
