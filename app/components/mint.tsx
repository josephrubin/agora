import { Button } from "antd";
import { useWallet, useConnection } from  "@solana/wallet-adapter-react";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { mintNFT } from "../actions/mintNFT";
import { Data, CreatorClass } from "~/types";

export default function Mint() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const mint = async() => {
    if (!wallet.publicKey) throw new WalletNotConnectedError();

    // ------ TODO: Right now, we mint the same NFT of a cat every time this function is called -------------
    const creator = new CreatorClass({
      address: wallet?.publicKey?.toBase58(),
      share: 100,
      verified: 1,
    });

    // A sample URI that points to a JSON file following Metaplex Token Metadata standard.
    const DUMMY_ARWEAVE_METADATA_URI = "https://ad46wdl5rjjowlu4yad7dxh3b2xfi7nyreudj2zzqt3dzuzob4.arweave.net/APnrDX2KUusunMAH8dz7Dq5UfbiJKDTrOYT2-PNMuDw/";

    const data = new Data({
      symbol: "CAT",
      name: "Cat!",
      uri: DUMMY_ARWEAVE_METADATA_URI,
      sellerFeeBasisPoints: 0,
      creators: [creator],
    });
    console.log(data);

    // ------ TODO: Right now, we mint the same NFT of a cat every time this function is called -------------

    try {
      const mintTxId = await mintNFT(
        connection,
        wallet,
        data
      );

      if (mintTxId === "failed") {
        alert(mintTxId);
      } else {
        const mintUrl = "https://explorer.solana.com/tx/" + mintTxId + "?cluster=devnet";
        console.log("Success 😎! Check out your newly minted NFT at: " + mintUrl);
      }

    } catch (e: any) {
      console.error(e.message);
    }

  };

  return (
    <div>
      <h1>Mint an NFT</h1>
      <LaunchSection
        mint={mint}
      />
    </div>
  );
}

const LaunchSection = (props: {
  mint: () => void;
}) => {
  return (
    <div>
      <Button
        type="primary"
        name="mint"
        htmlType="submit"
        size="large"
        style={{ padding: 10 }}
        onClick={() => {
          props.mint();
        }}
      >
        Mint a cat!
      </Button>
    </div>
  );
};
