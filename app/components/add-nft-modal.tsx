import { useState } from "react";
import Modal from "react-modal";
import NewCast from "~/routes/nfts/new";

const AddNFTModal = () => {
  const [addNFTModalOpen, setAddNFTModalOpen] = useState<boolean>(false);

  return (
    <>
      <div className="w-full h-40 border-2 min-w-56 rounded-2xl bg-zinc-700 hover:bg-zinc-600 flex justify-center items-center"
        onClick={() => setAddNFTModalOpen(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span>Create an NFT</span>
      </div>
      <Modal
        isOpen={addNFTModalOpen}
        onRequestClose={() => setAddNFTModalOpen(false)}
        className="absolute p-8 overflow-y-auto text-white rounded-lg min-h-fit bg-zinc-800 inset-40"
        overlayClassName="bg-zinc-400/50 fixed inset-0"
      >
        {/* Dummy details for an NFT of a banana. Need to be replaced by cast info */}
        <NewCast />
      </Modal>
    </>
  );
};

export default AddNFTModal;
