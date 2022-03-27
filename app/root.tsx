import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  useLoaderData,
} from "remix";

import styles from "./tailwind.css";

import { getAccessToken } from "./modules/users.server";
import { LinksFunction } from "@remix-run/react/routeModules";

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

export const loader = async ({ request }: { request: Request }) => {
  const accessKey = await getAccessToken(request);

  return accessKey;
};

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
  const accessKey = useLoaderData();
  console.log("accessKey", accessKey);

  return (
    <div className="bg-black text-white min-h-screen justify-between flex flex-col px-8">
      <div>
        <header className="flex flex-row justify-between my-4">
          <Link to="/" title="Remix">
            <AgoraLogo />
          </Link>
          <nav aria-label="Main navigation">
            <ul className="flex flex-row gap-8">
              <li>
                <Link to="/">Home</Link>
              </li>
              {accessKey ? (
                <li>
                  <Link to="collections/new">+ New Collection</Link>
                </li>
              ) : null}
              {!accessKey ? (
                <>
                  <li>
                    <Link to="login">Log In</Link>
                  </li>
                  <li>
                    <Link to="register">Sign Up</Link>
                  </li>
                </>
              ) : null}
              {accessKey ? (
                <li>
                  You are signed in.
                  <form method="post" action="logout">
                    <input type="submit" value="logout" />
                  </form>
                </li>
              ) : null}
            </ul>
          </nav>
        </header>
        <main>{children}</main>
      </div>
      <footer className="flex flex-row justify-center py-4 border-t">
        <p>&copy; Agora 2021</p>
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
