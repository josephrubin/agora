import { useState } from "react";
import { Form, ActionFunction } from "remix";
import { Button, Input, Upload } from "antd";
// [ADD] import { useWallet } from '@solana/wallet-adapter-react';

import { Art, MediaType } from "~/generated/graphql-schema";

const { Dragger } = Upload;

export const action: ActionFunction = async ({ request }) => {
    const formData = await request.formData();

    const title = formData.get("title")?.toString();
    const description = formData.get("description")?.toString();

    if (!title || !description) {
        return "error";
    }

    return null;
}

export default function Mint() {
    // [ADD] const wallet = useWallet();
    // [ADD] const connection = useConnection();

    const [attributes, setAttributes] = useState<Art>({
        title: '',
        description: '',
        mediaType: MediaType.Image,
        properties: {
            file: undefined,
        }
    });

    const mint = () => {
        console.log(attributes);
 
        /**
         * const _nft = await mintNFT(
         *  connection,
         *  wallet,
         * ...
         * );
         */
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
                        }
                    });
                   }
                }}
                onRemove={() => {
                    props.setAttributes({
                        ...props.attributes,
                        properties: {
                            ...props.attributes.properties,
                            file: undefined
                        }
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

