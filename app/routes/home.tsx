import { useLoaderData, Outlet, Link, LoaderFunction } from "remix";
import { readCasts } from "~/modules/casts.server";
import { Cast } from "~/generated/graphql-schema";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";

import Modal from "react-modal";
import { useState } from "react";

interface LoaderData {
  readonly casts: Cast[];
}

export const loader: LoaderFunction = async ({request}) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));

  return { casts: await readCasts(accessToken) };
};

export default function CollectionsLayout() {
  const { casts }: LoaderData = useLoaderData<LoaderData>();

  const sortedCasts = casts.sort(
    (a, b) => a.index - b.index
  );

  const [modalOpen, setModalOpen] = useState(false);

  const test = (
    <div className="w-full h-40 border-2 min-w-56 rounded-2xl hover:bg-zinc-700"
      onClick={() => setModalOpen(true)}
    ></div>
  );

  return (
    <div className="flex flex-col gap-4 my-8">
      <h1>My NFTs</h1>
      <div className="grid gap-4 grid-cols-fill-52">
        {test}
        {test}
        {test}
        {test}
        {test}
      </div>
      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="absolute p-8 overflow-y-auto text-white rounded-lg bg-zinc-800 inset-40"
        overlayClassName="bg-zinc-400/50 fixed inset-0"
      >
        <h1 className="mb-4">Peruse NFT</h1>
        <div className="flex flex-row gap-8 space-between">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center justify-center flex-shrink-0 border-2 rounded-md w-96 h-72">TODO: Image goes here</div>
          </div>
          <div className="flex flex-col w-full gap-2">
            <div><b>Name:</b> Name Goes Here</div>
            <div><b>Owner:</b> Owner Goes Here</div>
            <div><b>Creator:</b> Creator Goes Here</div>
            <hr className="my-2"/>
            <h2>Transaction History</h2>
            <ol className="ml-8">
              <li>X &#8594; Y</li>
              <li>Y &#8594; Z</li>
              <li>Z &#8594; W</li>
            </ol>
            <hr className="my-2"/>
            <form className="flex flex-row w-full gap-4">
              <input type="text" placeholder="Transfer to Email or Wallet" className="flex-grow"></input>
              <input type="submit" value="Transfer"></input>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
}
