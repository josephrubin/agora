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
        alert(mintTxId);
      } else {
        const mintUrl = "https://solscan.io/token/" + mintTxId + "?cluster=devnet";
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
      htmlType="submit"
      size="large"
      style={{ padding: 10 }}
      onClick={() => {
        finishedMinting ? window.open(mintUrl) : mint();
      }}
    >
      {finishedMinting ? "View on Solscan" : "Export"}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
    </Button>
  );
};

export default ExportNFT;
