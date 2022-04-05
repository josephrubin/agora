import BN from "bn.js";

export type StringPublicKey = string;

/** These classes are used to create the METADATA_SCHEMA below, which is serialized and put into the metadata account on Solana
 * Adopted from https://github.com/penta-fun/sol-nft-tools/blob/main/util/mint/schema.ts
 */

/** Tracks a creator
 * @param address the wallet address of the creator
 * @param verified a verified flag (0 or 1) that is only true if that wallet signed
 * @param share the share of ownership the creator has. from 0 to 100
 */
 export class CreatorClass {
    address: StringPublicKey;
    verified: number;
    share: number;
  
    constructor(args: {
      address: StringPublicKey;
      verified: number;
      share: number;
    }) {
      this.address = args.address;
      this.verified = args.verified;
      this.share = args.share;
    }
}

/** Data put on-chain to create a Solana token. Note the URI parameter below
 * @param name the name of the token. E.g. Ether
 * @param symbol the symbol of the token. E.g. ETH
 * @param uri points to a JSON file that has the NFT's metadata. The metadata
 *            should follow the Metaplex Token Metadata Standard.
 *            An example of the uri: https://ad46wdl5rjjowlu4yad7dxh3b2xfi7nyreudj2zzqt3dzuzob4.arweave.net/APnrDX2KUusunMAH8dz7Dq5UfbiJKDTrOYT2-PNMuDw/ 
 * @param sellerFeeBasisPoints defines resale fees earned by seller. On Agora, this is 0 by default
 * @param creators an array of the NFT's creators
 */ 
export class Data {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
    constructor(args: {
      name: string;
      symbol: string;
      uri: string;
      sellerFeeBasisPoints: number;
      creators: Creator[] | null;
    }) {
      this.name = args.name;
      this.symbol = args.symbol;
      this.uri = args.uri;
      this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
      this.creators = args.creators;
    }
  }


export class CreateMetadataArgs {
    instruction = 0;
    data: Data;
    isMutable: boolean;
  
    constructor(args: { data: Data; isMutable: boolean }) {
      this.data = args.data;
      this.isMutable = args.isMutable;
    }
}


export class CreateMasterEditionArgs {
    instruction = 10;
    maxSupply: BN | null;
    constructor(args: { maxSupply: BN | null }) {
      this.maxSupply = args.maxSupply;
    }
  }

export const METADATA_SCHEMA = new Map<any, any>([
    [
      CreateMetadataArgs,
      {
        kind: "struct",
        fields: [
          ["instruction", "u8"],
          ["data", Data],
          ["isMutable", "u8"] // bool
        ]
      }
    ],
    [
      CreateMasterEditionArgs,
      {
        kind: "struct",
        fields: [
          ["instruction", "u8"],
          ["maxSupply", { kind: "option", type: "u64" }]
        ]
      }
    ],
    [
      Data,
      {
        kind: "struct",
        fields: [
          ["name", "string"],
          ["symbol", "string"],
          ["uri", "string"],
          ["sellerFeeBasisPoints", "u16"],
          ["creators", { kind: "option", type: [CreatorClass] }]
        ]
      }
    ],
    [
        CreatorClass,
      {
        kind: "struct",
        fields: [
          ["address", "pubkeyAsString"],
          ["verified", "u8"],
          ["share", "u8"]
        ]
      }
    ]
  ]);