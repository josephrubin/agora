import { useLoaderData, Outlet, Link } from "remix";
import { readCasts } from "~/modules/casts.server";
import { Cast } from "~/generated/graphql-schema";
import { getAccessToken } from "~/modules/users.server";

interface LoaderData {
  readonly casts: Cast[];
}

export async function loader({request}) {
  const accessToken = await getAccessToken(request);

  return {casts: await readCasts(accessToken!)};
}

export default function CollectionsLayout() {
  const data: LoaderData = useLoaderData();

  const sortedCasts = data.casts.sort(
    (a, b) => a.index - b.index
  );

  return (
    <div>
      <h1>Here Are Your Collections</h1>
      <Link to={"./"}>
        Index
      </Link>
      <br />
      <Link to={"new"}>
        Create a new collection
      </Link>
      { /* List of casts. */ }
      <ol>
        {sortedCasts.map(cast =>
          <li key={cast.id}>
            <Link to={String(cast.id)}>{cast.id}</Link>
          </li>
        )}
      </ol>
      <Outlet />
    </div>
  );
}
