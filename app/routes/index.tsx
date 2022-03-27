import type { MetaFunction } from "remix";

/* type IndexData = {
  resources: Array<{ name: string; url: string }>;
  demos: Array<{ name: string; to: string }>;
}; */

// https://remix.run/api/conventions#meta
export const meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  return (
    <div className="flex flex-col gap-y-4 py-4">
      <h2>Welcome to Agora!</h2>
      <p>It&apos;s gonna be a good time 🥳</p>
      <p>
        This app makes it easy for communities to create NFT collections and
        award them to users.
      </p>
    </div>
  );
}
