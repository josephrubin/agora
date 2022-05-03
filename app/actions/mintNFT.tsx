import {
  Keypair,
  SystemProgram,
  PublicKey,
  Transaction,
  Connection
} from "@solana/web3.js";
import {
  MintLayout,
  TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { serialize } from "borsh";
import BN from "bn.js";

import {
  TOKEN_METADATA_PROGRAM_ID as METAPLEX_PROGRAM_ID,
  createMetadataInstruction,
  createMasterEditionInstruction
} from "../utils/nft";
import { Data, METADATA_SCHEMA, CreateMetadataArgs, CreateMasterEditionArgs } from "~/types";
import { extendBorsh } from "~/utils/borsh";

const sleep = (ms: number) => new Promise(resolve =>  setTimeout(resolve, ms));
extendBorsh();

/** Mints an NFT and returns the id of the chained transactions
 * @param connection a connection to an RPC Solana node
 * @param wallet the wallet signing the tx
 * @param data data put on-chain for creating an SPL token
 * @returns the transaction ID if successful, and "failed" otherwise
 */
export const mintNFT = async (
  connection: Connection,
  wallet: WalletContextState,
  data: Data
): Promise<string>  => {
  const publicKey: any = wallet.publicKey;

  try {

    const mint = new Keypair();

    /** Part 1: Following these steps to create a non-fungible SPL token:
         *  https://spl.solana.com/token#example-create-a-non-fungible-token
         */

    const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

    const createMintAccountTx = SystemProgram.createAccount({
      fromPubkey: publicKey,
      newAccountPubkey: mint.publicKey,
      lamports: mintRent,
      space: MintLayout.span,
      programId: TOKEN_PROGRAM_ID,
    });

    const initMintTx = createInitializeMintInstruction(
      mint.publicKey,
      0,
      publicKey,
      null
    );

    const associatedTokenAccount = await getAssociatedTokenAddress(
      mint.publicKey,
      publicKey,
      false
    ).catch();

    const createAssociatedTokenAccountTx = createAssociatedTokenAccountInstruction(
      publicKey,
      associatedTokenAccount,
      publicKey,
      mint.publicKey
    );

    const mintToTx = createMintToInstruction(
      mint.publicKey,
      associatedTokenAccount,
      publicKey, // Mint authority
      1, // mint only one token -> this makes it "non-fungible"
      []
    );

    console.log("Created new mint and token holder accounts...");

    /** Part 2: Derive PDAs for the mint account
         * See https://gist.github.com/dietmerc/f2cd3038bb901c91b0c9eb38f6577dc2#step-3-derive-pdas-for-the-nft-accounts
        */

    const metadataSeeds = [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
    ];
    const [ metadataAccount, _pda ] = await PublicKey.findProgramAddress(
      metadataSeeds,
      METAPLEX_PROGRAM_ID
    ).catch();

    const masterEditionSeeds = [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
      Buffer.from("edition"),
    ];
    const [ masterEditionAccount, _] = await PublicKey.findProgramAddress(
      masterEditionSeeds,
      METAPLEX_PROGRAM_ID
    ).catch();

    let buffer = Buffer.from(
      serialize(
        METADATA_SCHEMA,
        new CreateMetadataArgs({ data, isMutable: true })
      )
    );

    const createMetadataTx = createMetadataInstruction(
      metadataAccount,
      mint.publicKey,
      publicKey,
      publicKey,
      publicKey,
      buffer
    );

    buffer = Buffer.from(
      serialize(
        METADATA_SCHEMA,
        new CreateMasterEditionArgs({ maxSupply: new BN(0) })
      )
    );

    const createMasterEditionTx = createMasterEditionInstruction(
      metadataAccount,
      masterEditionAccount,
      mint.publicKey,
      publicKey,
      publicKey,
      publicKey,
      buffer
    );

    console.log("Derived PDAs and created transaction instructions...");

    /** Part 3: Add instructions to a Transaction() object, sign with wallet and mint account pubkey, and send tx to cluster
         *  See end of https://github.com/solana-labs/oyster/blob/main/packages/common/src/contracts/token.ts
         */

    let blockhashStruct;
    while (!blockhashStruct) {
      try {
        blockhashStruct = await connection.getLatestBlockhash();
      } catch(e) {
        console.log(e);
        await sleep(1000);
      }
    }

    let tx = new Transaction({
      recentBlockhash: blockhashStruct.blockhash,
      feePayer: publicKey,
    })
      .add(createMintAccountTx)
      .add(initMintTx)
      .add(createAssociatedTokenAccountTx)
      .add(mintToTx)
      .add(createMetadataTx)
      .add(createMasterEditionTx);

    const signers = [mint];
    tx.setSigners(wallet.publicKey, ...signers.map(s => s.publicKey));
    if (signers.length > 0) {
      tx.partialSign(...signers);
    }
    tx = await wallet.signTransaction(tx);
    const rawTransaction = tx.serialize();
    const options = {
      skipPreflight: true,
      commitment: "singleGossip",
    };

    const txId = await connection.sendRawTransaction(rawTransaction, options);

    console.log("Sent transaction to network...transaction id is: " + txId);

    return txId;

  } catch (e) {
    console.log(e);
    return "failed";
  }
};
