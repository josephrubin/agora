import { LoaderFunction, redirect } from "remix";

// https://remix.run/docs/en/v1/api/conventions#loader
export const loader: LoaderFunction = async () => {
  const isLoggedIn = true;
  return isLoggedIn ? redirect("/login") : redirect("home");
};
