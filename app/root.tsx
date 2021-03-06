import {
  Link,
  NavLink,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  LoaderFunction,
  useLoaderData
} from "remix";

import styles from "./tailwind.css";
import walletContextStyles from "~/styles/wallet.css";

import { LinksFunction } from "@remix-run/react/routeModules";
import { getAccessToken, refreshAccessTokenIfNeeded } from "./modules/session.server";
import { useAccessToken } from "./modules/session";

import AgoraLogoImage from "../public/agora-logo.svg";
import { useEffect } from "react";

interface LoaderData {
  readonly accessToken: string;
}

/**
 * This loader will run on every GET page request because it is at the root.
 * The main task is to see if the user is logged in. If they are, make sure
 * that they don't have an obviously expired accessToken. If they do, refresh
 * it.
 *
 * If they are not logged in, that's okay too. All child routes will be able
 * to use the useAccessToken hook to get the accessToken (or null if the
 * user is not logged in).
 */
export const loader: LoaderFunction = async ({request}) => {
  // The root loader gets the user's accessToken so all child
  // routes can access it through useAccessToken!
  const accessToken = await getAccessToken(request);

  // If we actually got an access token (the user is logged in),
  // ensure that it's a valid access token, and refresh it if
  // needed.
  if (accessToken !== null) {
    await refreshAccessTokenIfNeeded(request);
  }

  return { accessToken };
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: walletContextStyles },
];

// https://remix.run/api/conventions#default-export
// https://remix.run/api/conventions#route-filenames
export default function App() {
  return (
    <Document title="Agora">
      <Layout>
        <Outlet />
      </Layout>
    </Document>
  );
}

// https://remix.run/docs/en/v1/api/conventions#errorboundary
export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Document title="Error!">
      <Layout>
        <div className="flex flex-col justify-center w-full gap-4 mt-24 text-center">
          <h1>There was an error!</h1>
          <p>Please try again</p>
          {/* <h1>There was an error</h1>
          <p>{error.message}</p>
          <hr />
          <p>
            Hey, developer, you should replace this with what you want your
            users to see.
          </p> */}
        </div>
      </Layout>
    </Document>
  );
}

// https://remix.run/docs/en/v1/api/conventions#catchboundary
export function CatchBoundary() {
  const caught = useCatch();

  let message;
  switch (caught.status) {
    case 401:
      message = (
        <p>
          Oops! Looks like you tried to visit a page that you do not have access
          to.
        </p>
      );
      break;
    case 404:
      message = (
        <p>Oops! Looks like you tried to visit a page that does not exist.</p>
      );
      break;

    default:
      throw new Error(caught.data || caught.statusText);
  }

  return (
    <Document title={`${caught.status} ${caught.statusText}`}>
      <Layout>
        <h1>
          {caught.status}: {caught.statusText}
        </h1>
        {message}
      </Layout>
    </Document>
  );
}

function Document({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const accessToken = useAccessToken();

  return (
    <div className="topography">
      <div className="flex flex-col justify-between min-h-screen px-32 text-white gradient">
        <div>
          <header className="flex flex-row items-center justify-between py-4 border-b">
            <Link to="/" title="Remix">
              <AgoraLogo />
            </Link>
            <nav aria-label="Main navigation">
              <ul className="flex flex-row items-center gap-8">

                {!accessToken ? (
                  <>
                    <li>
                      <NavLink to="log-in">Log In</NavLink>
                    </li>
                    <li>
                      <NavLink to="sign-up">Sign Up</NavLink>
                    </li>
                  </>
                ) : (<>
                  <li>
                    <NavLink to="/">Home</NavLink>
                  </li>
                  <li>
                    <form method="post" action="/logout">
                      <input type="submit" value="Log Out" />
                    </form>
                  </li>
                </>
                )}
              </ul>
            </nav>
          </header>
          <main>{children}</main>
        </div>
        <footer className="flex flex-row justify-center py-4 border-t">
          <p>&copy; Agora 2022</p>
        </footer>
      </div>
    </div>
  );
}

function AgoraLogo() {
  return (
    <div className="flex flex-row items-center h-12 gap-4">
      <img className="max-h-full" height="fit" src={AgoraLogoImage}/>
      <h1 className="text-5xl font-thin">Agora</h1>
    </div>
  );
}
