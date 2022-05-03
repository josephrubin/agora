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
  useLoaderData,
  LoaderFunction
} from "remix";

import styles from "./tailwind.css";

import { LinksFunction } from "@remix-run/react/routeModules";
import { getAccessToken, refreshAccessTokenIfNeeded } from "./modules/session.server";
import { useAccessToken } from "./modules/session";

/**
 * This loader will run on every GET page request because it is at the root.
 * The main task is to see if the user is logged in. If they are, make sure
 * that they don't have an obviously expired accessToken. If they do, refresh
 * it.
 *
 * If they are not logged in, that's okay too. All child routes will be able
 * to use the useAccessToken hook to get the acceessTokenn (or null if the
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

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

// https://remix.run/api/conventions#default-export
// https://remix.run/api/conventions#route-filenames
export default function App() {
  return (
    <Document>
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
        <div>
          <h1>There was an error</h1>
          <p>{error.message}</p>
          <hr />
          <p>
            Hey, developer, you should replace this with what you want your
            users to see.
          </p>
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
    <div className="flex flex-col justify-between min-h-screen px-32 text-white bg-zinc-900">
      <div>
        <header className="flex flex-row items-center justify-between py-4 border-b">
          <Link to="/" title="Remix">
            <AgoraLogo />
          </Link>
          <nav aria-label="Main navigation">
            <ul className="flex flex-row items-center gap-8">
              <li>
                <NavLink to="/home">Home</NavLink>
              </li>
              {accessToken ? (
                <li>
                  <NavLink to="nfts/new">Create NFT</NavLink>
                </li>
              ) : null}
              {!accessToken ? (
                <>
                  <li>
                    <NavLink to="log-in">Log In</NavLink>
                  </li>
                  <li>
                    <NavLink to="sign-up">Sign Up</NavLink>
                  </li>
                </>
              ) : null}
              {accessToken ? (
                <li>
                  <form method="post" action="/logout">
                    <input type="submit" value="Log Out" />
                  </form>
                </li>
              ) : null}
            </ul>
          </nav>
        </header>
        <main>{children}</main>
      </div>
      <footer className="flex flex-row justify-center py-4 border-t">
        <p>&copy; Agora 2022</p>
      </footer>
    </div>
  );
}

function AgoraLogo() {
  return (
    <div>
      <big>
        <b>AGORA_LOGO</b>
      </big>
    </div>
  );
}
