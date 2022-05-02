import { create } from "ipfs-http-client";

/**
 * @param name title of the NFT
 * @param imageUrl IPFS url of the image. Doesn't include extension parameter ("?ext=jpg")
 * @param creatorPubKey public key of the creator's wallet. Type PublicKey
 * @returns an IPFS link storing a JSON file for the NFT's metadata (follows Metaplex Token Metadata standard)
 */
export async function uploadMetadataToIpfs(name: string, imageUrl: string, imageType: string, creatorPubKey: any) {
  const client = create("https://ipfs.infura.io:5001/api/v0");

  const metadataJson = prepareMetadataJson(name, imageUrl, imageType, creatorPubKey);

  try {
    const result = await client.add(Buffer.from(JSON.stringify(metadataJson)));
    const metadataIpfsLink = "https://gateway.ipfs.io/ipfs/" + result.path;
    return metadataIpfsLink;
  } catch (e) {
    console.error(e);
    return "failed";
  }
}

/**
 * @param imageArrayBuffer buffer data of the image to upload
 * @returns an IPFS link storing the image
 */
export async function uploadImageToIpfs(imageArrayBuffer: ArrayBuffer) {
  const client = create("https://ipfs.infura.io:5001/api/v0");

  try {
    const result = await client.add(Buffer.from(imageArrayBuffer));
    const imageIpfsLink = "https://gateway.ipfs.io/ipfs/" + result.path;
    return imageIpfsLink;
  } catch (e) {
    console.error(e);
    return "failed";
  }
}

/**
 * @param name title of the NFT
 * @param imageUrl IPFS url of the image. Doesn't include extension parameter ("?ext=jpg")
 * @param creatorPubKey public key of the creator's wallet. Type PublicKey
 * @returns JSON object of Metaplex-compatible metadata for the NFT
 */
function prepareMetadataJson(name: string, imageUrl: string, imageType: string, creatorPubKey: any) {
  const imageUrlModified = imageUrl + "?ext=" + imageType.substring(6);

  return ({
    name: name,
    symbol: name.substring(0,3).toUpperCase(),
    description:
      "Created using Agora ©",
    seller_fee_basis_points: 0,
    external_url: "",
    properties: {
      files: [
        {
          uri: imageUrlModified,
          type: imageType,
        },
      ],
      category: "image",
      maxSupply: 0,
      creators: [
        {
          address: creatorPubKey,
          share: 100,
        },
      ],
    },
    image: imageUrlModified,
  });
}
