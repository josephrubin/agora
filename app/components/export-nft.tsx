import { useState } from "react";
import { Button } from "antd";
import { useWallet, useConnection } from  "@solana/wallet-adapter-react";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { mintNFT } from "../actions/mintNFT";
import { uploadMetadataToIpfs } from "../utils/ipfs";
import { Data, CreatorClass } from "~/types";


const ExportNFT = (props: {
  title: string,
  imageUri: string,
  imageType: string,
}) => {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [finishedMinting, setFinishedMinting] = useState<boolean>(false);
  const [mintUrl, setMintUrl] = useState<string>("");

  const title = props.title || "Banana";
  const imageUri = props.imageUri || "https://gateway.ipfs.io/ipfs/QmcWusCimgGuoqwYXw7KecSv4sGY82qFfnkqQgvPdiPyHa?ext=jpeg";
  const imageType = props.imageType || "image/png";

  const mint = async() => {
    if (!wallet.publicKey) throw new WalletNotConnectedError();

    const creator = new CreatorClass({
      address: wallet?.publicKey?.toBase58(),
      share: 100,
      verified: 1,
    });

    const metadataUri = await uploadMetadataToIpfs(title, imageUri, imageType, wallet?.publicKey?.toBase58());

    const data = new Data({
      symbol: title.substring(0,3).toUpperCase(),
      name: title,
      uri: metadataUri,
      sellerFeeBasisPoints: 0,
      creators: [creator],
    });

    try {
      const mintTxId = await mintNFT(
        connection,
        wallet,
        data
      );

      if (mintTxId === "failed") {
        alert("Failed to export NFT! Check if you have sufficient SOL balance in your wallet to approve the transaction");
      } else {
        const mintUrl = "https://explorer.solana.com/tx/" + mintTxId + "?cluster=devnet";
        console.log("Success 😎! Check out your newly minted NFT at: " + mintUrl);
        setFinishedMinting(true);
        setMintUrl(mintUrl);
      }

    } catch (e: any) {
      console.error(e.message);
    }

  };

  return (
    <Button
      type="primary"
      name="mint"
      disabled={!wallet.publicKey}
      htmlType="submit"
      size="large"
      style={{ padding: 10 }}
      onClick={() => {
        finishedMinting ? window.open(mintUrl) : mint();
      }}
    >
      <div className="flex flex-row justify-center items-center">
        {finishedMinting ? "View on Solana " : "Export "}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    </Button>
  );
};

export default ExportNFT;
