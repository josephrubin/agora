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
      <>
        <h1>
          {"You've signed up! Go ahead and log right in!"}
        </h1>
        <p>
          <Link to="/log-in">Continue to log in</Link>
        </p>
      </>
    );
  }
  else {
    return (
      <Form method="post" className="flex flex-col gap-4 my-8">
        <h1>Sign Up</h1>
        <div>
          <label className="mr-4 font-bold">Username</label>
          <input name="username" type="text" />
        </div>
        <div>
          <label className="mr-4 font-bold">Password</label>
          <input name="password" type="password" />
        </div>
        { actionData?.error && <p className="error">{actionData.error}</p> }
        <input type="submit" />
      </Form>
    );
  }
}
