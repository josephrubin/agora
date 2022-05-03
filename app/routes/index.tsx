import { useLoaderData, Outlet, Link, LoaderFunction, Form, ActionFunction } from "remix";
import { readCasts, transferCast } from "~/modules/casts.server";
import { Cast } from "~/generated/graphql-schema";
import { getAccessToken, redirectToLoginIfNull } from "~/modules/session.server";

import Modal from "react-modal";
import { useState } from "react";

import NftDetails from "~/components/nft-details";
import AddNFTModal from "~/components/add-nft-modal";

interface LoaderData {
  readonly casts: Cast[];
}

export const loader: LoaderFunction = async ({request}) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));

  const casts = await readCasts(accessToken);

  return { casts: casts };
};

export const action: ActionFunction = async ({ request }) => {
  const accessToken = redirectToLoginIfNull(await getAccessToken(request));
  const formData = await request.formData();

  const destination = String(formData.get("destination"));
  const castId = String(formData.get("id"));

  if (!destination) {
    return {
      error: "no destination given.",
    };
  }
  if (!castId) {
    return {
      error: "which NFT should I transfer?",
    };
  }

  // For now, assume this is a transfer to another user.
  return await transferCast({
    accessToken,
    id: castId,
    username: destination,
  });
};

export default function CastsLayout() {
  const { casts }: LoaderData = useLoaderData<LoaderData>();

  const sortedCasts = casts.sort(
    (a, b) => a.index - b.index
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<Cast | null>(null);

  const NFTCard = ({cast}: {cast: Cast}) =>
    (<div className="relative w-full h-40 overflow-hidden border-2 shadow-inner min-w-56 rounded-2xl"
      onClick={() => {setModalData(cast); setModalOpen(true);}}
    >
      <div className="absolute inset-0 w-full h-full hover:bg-zinc-600/20" />
      <img className="object-cover w-full h-full" src={cast.uri} />
    </div>
    );

  return (
    <div className="flex flex-col gap-4 my-8">
      <h1>My NFTs</h1>
      <div className="grid gap-4 grid-cols-fill-52">
        <AddNFTModal />
        {casts.map((c, i) => <NFTCard cast={c} key={i}/>)}
      </div>
      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="relative p-8 mx-auto overflow-y-auto text-white rounded-lg mt-28 w-fit h-fit bg-zinc-800"
        overlayClassName="bg-zinc-400/50 fixed inset-0"
      >
        <span onClick={() => setModalOpen(false)} className="absolute text-2xl cursor-pointer top-2 right-4">&times;</span>
        <NftDetails
          title={modalData?.title ?? "Title Not Found"}
          imageUri={modalData?.uri ?? "https://gateway.ipfs.io/ipfs/QmcWusCimgGuoqwYXw7KecSv4sGY82qFfnkqQgvPdiPyHa?ext=jpeg"}
          history={modalData?.history ?? []}
        />
      </Modal>
    </div>
  );
}
