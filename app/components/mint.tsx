import { useState } from "react";
import { Button, Form, Input, Upload } from "antd";
import { Connection } from "@metaplex/js";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

import { Art, MediaType } from "~/generated/graphql-schema";
import { mintNFT } from "../actions/nft";
import type { OnChainData, Creator } from "~/types";
import { Data, CreatorClass } from "~/types";

const { Dragger } = Upload;

export default function Mint() {
    const wallet = useWallet();
    const connection = new Connection('devnet');

    const [attributes, setAttributes] = useState<Art>({
        title: '',
        description: '',
        mediaType: MediaType.Image,
        properties: {
            file: undefined,
        },
        image: ''
    });

    const mint = async () => {
        if (!wallet.publicKey) throw new WalletNotConnectedError();

        console.log("Minting...");

        /** 
        const metadata = {
            title: attributes.title,
            description: attributes.description,
            properties: {
                file: attributes.properties.file
            },
            image: attributes.image
        };
        */

        // ------ TODO: Right now, we mint the same NFT of a cat every time this function is called -------------
        const creator = new CreatorClass({
            address: wallet?.publicKey?.toBase58(),
            share: 100,
            verified: 1
        })

        // A sample URI that points to a JSON file following Metaplex Token Metadata standard.
        const DUMMY_ARWEAVE_METADATA_URI = 'https://ad46wdl5rjjowlu4yad7dxh3b2xfi7nyreudj2zzqt3dzuzob4.arweave.net/APnrDX2KUusunMAH8dz7Dq5UfbiJKDTrOYT2-PNMuDw/';

        const data = new Data({
            symbol: "CAT",
            name: "Cat",
            uri: DUMMY_ARWEAVE_METADATA_URI,
            sellerFeeBasisPoints: 0,
            creators: [creator]
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
                const mintUrl = "https://explorer.solana.com/tx/" + mintTxId;
                console.log("Congrats! The NFT is minted and should be confirmed on chain soon...");
                console.log("Visit " + mintUrl + " in a few mins to check out your NFT 😎");
            }
        } catch (e: any) {
            console.error(e.message);
        }
    }

    return (
        <div>
            <h1>Mint an NFT</h1>
            <Form method="post">
                <InfoSection 
                    attributes={attributes}
                    setAttributes={setAttributes}
                />
                <UploadSection 
                    attributes={attributes}
                    setAttributes={setAttributes}
                />
                <LaunchSection 
                    attributes={attributes}
                    mint={mint}
                />
            </Form>
        </div>
    )
}

const UploadSection = (props: {
    attributes: Art;
    setAttributes: (attr: Art) => void;
}) => {
    const mainFile = props.attributes.properties.file as File | undefined;

    return (
        <div>
            <h2>Upload your creation</h2>
            <Dragger
                accept=".png,.jpg,.gif,.svg"
                multiple={false}
                fileList={mainFile? [mainFile as any] : []}
                onChange={async (info: any) => {
                    const file = info.file.originFileObj;

                   if (file) {
                    props.setAttributes({
                        ...props.attributes,
                        properties: {
                            ...props.attributes.properties,
                            file: file
                        },
                        image: file.name || ''
                    });
                   }
                }}
                onRemove={() => {
                    props.setAttributes({
                        ...props.attributes,
                        properties: {
                            ...props.attributes.properties,
                            file: undefined
                        },
                        image: ''
                    })
                }}
            >
                <div style={{ padding: 20, background: 'rgba(0, 0, 0, 0.2'}}>
                    <p>Drag and drop, or click to browse</p>
                </div>
                <p>Acceptable file types: PNG, JPG, GIF, SVG</p>
            </Dragger>
        </div>
    )
}

const InfoSection = (props: {
    attributes: Art;
    setAttributes: (attr: Art) => void;
}) => {
    return (
        <div>
            <h2>Describe your art</h2>
            <label>
                <span>Title</span>
                <Input 
                    autoFocus
                    name="title"
                    placeholder="Max 50 characters"
                    maxLength={50}
                    allowClear
                    value={props.attributes.title}
                    onChange={info =>
                        props.setAttributes({
                            ...props.attributes,
                            title: info.target.value,
                        })
                    }
                />
            </label>
            <br />
            <label>
                <span>Description</span>
                <br />
                <Input.TextArea
                    name="description"
                    placeholder="Max 500 characters"
                    maxLength={500}
                    allowClear
                    value={props.attributes.description}
                    onChange={info =>
                        props.setAttributes({
                            ...props.attributes,
                            description: info.target.value,
                        })
                    }
                />
            </label>
        </div>
    )
}

const LaunchSection = (props: {
    attributes: Art;
    mint: () => void;
}) => {

    return (
        <div>
            <Button
                type="primary"
                name="mint"
                htmlType="submit"
                size="large"
                style={{ margin: 10 }}
                onClick={() => {
                    if (!props.attributes.properties.file) {
                        console.error("No file uploaded");
                    }

                    console.log("Minting...");
                    props.mint();
                }}
            >
                Mint
            </Button>
        </div>
    );
}