import { ActionFunction, Form, useActionData } from "remix";
import { createSession, createSessionRedirect } from "~/modules/users.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // TODO: form validation
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));

  // For now we assume no errors. TODO - fix this.

  const session = await createSession({
    username: username,
    password: password,
  });

  if (session && session.accessToken) {
    return createSessionRedirect(session, "/");
  } else {
    return {
      error: "Could not make session",
    };
  }
};

export default function Login() {
  const actionData = useActionData();

  if (actionData && actionData.error) {
    return <p>{actionData.error}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-8 my-16">
      <h1 className="title">Agora</h1>
      <h2>Your Community NFT Hub!</h2>
      <Form method="post" className="flex flex-col gap-y-4 items-center">
        <div>
          <input name="username" type="text" placeholder="Email Address" />
        </div>
        <div>
          <input name="password" type="password" placeholder="Password" />
        </div>
        <input type="submit" value="Log In" />
      </Form>
    </div>
  );
}
