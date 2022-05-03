import { ActionFunction, Form, useActionData, useTransition } from "remix";
import { Spinner } from "~/components/spinner";
import { createAgoraSession, createSessionRedirectResponse } from "~/modules/session.server";

import AgoraLogoImage from "../../public/agora-logo.svg";
interface ActionData {
  readonly error?: string;
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  const username = String(formData.get("username"));
  const password = String(formData.get("password"));

  if (!username || !password) {
    return {
      error: "Missing username or password.",
    };
  }

  const session = await createAgoraSession({
    username: username,
    password: password,
  });

  if (session && session.accessToken) {
    return await createSessionRedirectResponse(session, "/");
  } else {
    return {
      error: "Could not make session",
    };
  }
};

export default function LogIn() {
  const actionData = useActionData<ActionData | null>();
  const transition = useTransition();

  return (
    <div className="flex flex-col items-center gap-8 my-16">
      <div className="flex flex-row h-24 gap-4">
        <img className="max-h-full" height="fit" src={AgoraLogoImage}/>
        <h1 className="title">Agora</h1>
      </div>
      <h2>Your Community NFT Hub!</h2>
      <Form method="post" className="flex flex-col items-center gap-y-4">
        <div>
          <input className="w-80" name="username" type="text" placeholder="Email Address" />
        </div>
        <div>
          <input className="w-80" name="password" type="password" placeholder="Password" />
        </div>
        { actionData?.error && <p className="error">{actionData.error}</p> }
        <div className="flex items-center gap-4">
          {transition.state === "idle"
            ? <input type="submit" value="Log In" disabled={transition.state !== "idle"} />
            : <Spinner /> }
        </div>
      </Form>
    </div>
  );
}
