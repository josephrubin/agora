import { useState } from "react";
import { Button, Input, Upload } from "antd";
import { useWallet, useConnection } from  "@solana/wallet-adapter-react";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { mintNFT } from "../actions/mintNFT";
import { uploadMetadataToIpfs, uploadImageToIpfs} from "../utils/ipfs";
import { Data, CreatorClass, NewNFTCreation } from "~/types";

const { Dragger } = Upload;

export default function Mint() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [attributes, setAttributes] = useState<NewNFTCreation>({
    title: "",
    description: "",
    image: {
      uri: "",
      type: "",
    },
  });

  const mint = async() => {
    if (!wallet.publicKey) throw new WalletNotConnectedError();

    const creator = new CreatorClass({
      address: wallet?.publicKey?.toBase58(),
      share: 100,
      verified: 1,
    });

    const metadataUri = await uploadMetadataToIpfs(attributes.title, attributes.image.uri, attributes.image.type, wallet?.publicKey?.toBase58());

    const data = new Data({
      symbol: attributes.title.substring(0,3).toUpperCase(),
      name: attributes.title,
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
      <MintDetailsView
        mint={mint}
        attributes={attributes}
        setAttributes={setAttributes}
      />
    </div>
  );
}

const MintDetailsView = (props: {
  mint: () => void;
  attributes: NewNFTCreation;
  setAttributes: (attr: NewNFTCreation) => void;
}) => {

  return (
    <div>
      <Dragger
        accept=".png,.jpg,.gif,.svg"
        multiple={false}
        onChange={async (info: any) => {
          if (info.file.status !== "uploading") {
            const imageArrayBuffer = await info.file.originFileObj.arrayBuffer();
            const imageIpfsLink = await uploadImageToIpfs(imageArrayBuffer);
            console.log(imageIpfsLink);
            props.setAttributes({
              ...props.attributes,
              image: {
                uri: imageIpfsLink,
                type: info.file.originFileObj.type,
              },
            });
          }
        }}
        onRemove={() => {
          props.setAttributes({
            ...props.attributes,
            image: {
              uri: "",
              type: "",
            },
          });
        }}
      >
        <div className="flex justify-center items-center w-full h-40 border-2 min-w-56 rounded-2xl bg-zinc-700 hover:bg-zinc-600 my-8">
          <p>Drag and drop, or click to browse</p>
        </div>
      </Dragger>
      <Input
        name="title"
        placeholder="Name your NFT"
        className="flex my-8"
        maxLength={50}
        allowClear
        value={props.attributes.title}
        onChange={(info) => props.setAttributes({
          ...props.attributes,
          title: info.target.value,
        })}
      />
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
        Mint
      </Button>
    </div>
  );
};
