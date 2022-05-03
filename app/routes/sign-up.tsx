import { Link } from "@remix-run/react";
import { ActionFunction, Form, useActionData } from "remix";
import { createUser } from "~/modules/users.server";

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

  try {
    await createUser({username: username, password: password});
  }
  catch {
    return {
      error: "Invalid username or password. Maybe your password was too short?",
    };
  }

  return {};
};

export default function SignUp() {
  const actionData = useActionData<ActionData | null>();

  if (actionData && !actionData.error) {
    return (
      <div className="flex flex-col items-center gap-8 mx-auto mt-32 w-80">
        <h1 className="text-center">
          You&apos;ve signed up! <br />
          Go ahead and log right in!
        </h1>
        <p>
          <Link to="/log-in" className="underline">Continue to log in</Link>
        </p>
      </div>
    );
  }
  else {
    return (
      <div className="flex flex-col items-center gap-8 my-16">
        <div className="flex flex-row justify-center w-full h-24 gap-4">
          <h1 className="title">Agora</h1>
        </div>
        <h3>Join to start creating and transferring NFTs on Solana</h3>
        <Form method="post" className="flex flex-col items-center gap-y-4">
          <div>
            <input className="w-80" name="username" placeholder="Username" type="text" />
          </div>
          <div>
            <input className="w-80" name="password" placeholder="Password" type="password" />
          </div>
          <div className="flex items-center gap-4">
            { actionData?.error && <p className="error">{actionData.error}</p> }
            <input type="submit" value="Sign Up" />
          </div>
        </Form>
      </div>
    );
  }
}
