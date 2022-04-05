import fs from "fs";
import { create } from "ipfs-http-client";

// Formatted in Metaplex NFT Standard
export const getMetadata = (name: string, imageUrl: string, creatorAddress: string) => ({
  name: name,
  symbol: name.toUpperCase().replace(" ", ""),
  description: "Created by Agora",
  seller_fee_basis_points: 0,
  external_url: null, // Add Agora prod link here
  attributes: null,
  properties: {
    files: [
      {
        uri: imageUrl, // test: https://www.arweave.net/Xtk14WG1PLNuwlNTKgb2HJHvl8tL9aOM4QskNsqxRBE?ext=jpg
        type: "image/jpeg",
      },
    ],
    category: "image",
    maxSupply: 0,
    creators: [
      {
        address: creatorAddress,
        share: 100,
      },
    ],
  },
  image: imageUrl
});

const runUpload = async (filePath: string) => {
  const file = fs.readFileSync(filePath);
  const client = create(); 
  const fileAdded = await client.add(file, {
    progress: (len) => console.log("Uploading file..." + len)
  });
  console.log(fileAdded);

  return fileAdded;
}

export const tryImageUpload = async () => {
  try {
    const filePath = "../public/images/1.jpeg";
    const { cid } = await runUpload(filePath) 

    console.log("cid", cid);

  } catch(e) {
    console.error(e);
  }
}