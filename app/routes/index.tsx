import { LoaderFunction, redirect } from "remix";
import { getAccessToken } from "~/modules/users.server";

// https://remix.run/docs/en/v1/api/conventions#loader
export const loader: LoaderFunction = async ({request}) => {
  const isLoggedIn = await getAccessToken(request);
  return (isLoggedIn === null) ? redirect("/log-in") : redirect("home");
};
