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
      <Form method="post" className="flex flex-col gap-4 my-8">
        <h1>Sign Up</h1>
        <p>
          Join to start creating and trading NFTs.
        </p>
        <div>
          <input name="username" placeholder="Username" type="text" />
        </div>
        <div>
          <input name="password" placeholder="Password" type="password" />
        </div>
        { actionData?.error && <p className="error">{actionData.error}</p> }
        <input type="submit" value="Sign Up" />
      </Form>
    );
  }
}
