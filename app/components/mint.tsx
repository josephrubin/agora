import { Button } from "antd";
import { useWallet, useConnection } from  "@solana/wallet-adapter-react";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { mintNFT } from "../actions/mintNFT";

export default function Mint() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const mint = async() => {
    if (!wallet.publicKey) throw new WalletNotConnectedError();

    try {
      mintNFT();
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
        style={{ padding: 10, background: "blue" }}
        onClick={() => {
          props.mint();
        }}
      >
        Mint a cat!
      </Button>
    </div>
  );
};
