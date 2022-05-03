import { useState } from "react";
import Modal from "react-modal";
import NewCast from "~/routes/nfts/new";

const AddNFTModal = () => {
  const [addNFTModalOpen, setAddNFTModalOpen] = useState<boolean>(false);

  return (
    <>
      <div className="flex items-center justify-center w-full h-40 border-2 min-w-56 rounded-2xl bg-zinc-700 hover:bg-zinc-600"
        onClick={() => setAddNFTModalOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span>Create NFT</span>
      </div>
      <Modal
        isOpen={addNFTModalOpen}
        onRequestClose={() => setAddNFTModalOpen(false)}
        className="relative max-w-screen-md p-8 mx-auto overflow-y-auto text-white rounded-lg mt-28 min-w-fit h-fit bg-zinc-800"
        overlayClassName="bg-zinc-400/50 fixed inset-0"
      >
        <span onClick={() => setAddNFTModalOpen(false)} className="absolute text-2xl cursor-pointer top-2 right-4">&times;</span>
        <NewCast />
      </Modal>
    </>
  );
};

export default AddNFTModal;
