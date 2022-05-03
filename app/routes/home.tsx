import { useLoaderData, Outlet, Link, LoaderFunction } from "remix";
import { readCasts } from "~/modules/casts.server";
import { Cast } from "~/generated/graphql-schema";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";

import Modal from "react-modal";
import { useState } from "react";

import NftDetails from "~/components/nft-details";

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
        className="absolute p-8 overflow-y-auto text-white rounded-lg min-h-fit bg-zinc-800 inset-40"
        overlayClassName="bg-zinc-400/50 fixed inset-0"
      >
        {/* Dummy details for an NFT of a banana. Need to be replaced by cast info */}
        <NftDetails
          title="Banana"
          imageUri="https://gateway.ipfs.io/ipfs/QmcWusCimgGuoqwYXw7KecSv4sGY82qFfnkqQgvPdiPyHa?ext=jpeg"
        />
      </Modal>
    </div>
  );
}
