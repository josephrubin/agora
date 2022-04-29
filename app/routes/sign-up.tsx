import { ActionFunction, Form, useActionData } from "remix";
import { createUser } from "~/modules/users.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();

  // TODO: form validation
  const username = String(formData.get("username"));
  const password = String(formData.get("password"));

  // For now we assume no errors. TODO - fix this.

  const user = await createUser({username: username, password: password});

  return user;
};

export default function SignUp() {
  const user = useActionData();
  if (user) {
    return (
      <>
        <p>
          You&apos;ve signed up! Here are the details:
        </p>
        <p>
          {JSON.stringify(user)}
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
        <input type="submit" />
      </Form>
    );
  }
}
