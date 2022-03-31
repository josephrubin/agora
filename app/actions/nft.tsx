import { Connection } from "@metaplex/js";
import { Keypair, SystemProgram, PublicKey, Transaction } from "@solana/web3.js";
import { MintLayout, TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { serialize } from "borsh";
import BN from "bn.js";

import { createMetadataInstruction, createMasterEditionInstruction } from "./nft_utils";
import { OnChainData, METADATA_SCHEMA, CreateMetadataArgs, CreateMasterEditionArgs } from "~/types";

const sleep = (ms: number) => new Promise(resolve =>  setTimeout(resolve, ms));

/** Mints an NFT and returns its transaction ID 
 * @param connection a connection to an RPC Solana node 
 * @param wallet the wallet signing the txs to mint the NFT
 * @param data data put on-chain for creating an SPL token
 * @returns the transaction ID of the minted NFT if successful, and "failed" otherwise
 */
export const mintNFT = async (
    connection: Connection,
    wallet: WalletContextState,
    data: OnChainData,
): Promise<string>  => {
    const publicKey: any = wallet.publicKey;

    // See https://spl.solana.com/associated-token-account
    const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID: PublicKey = new PublicKey(
        'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      );
    
    const METAPLEX_PROGRAM_ID = new PublicKey(
        'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    try {

        const mint = new Keypair();

        /** Following these steps to create a non-fungible SPL token:
         *  https://spl.solana.com/token#example-create-a-non-fungible-token
         */



        const mintRent = await connection.getMinimumBalanceForRentExemption(MintLayout.span);

        // tx #1: Create a mint account that stores our SPL token-creation program
        const createMintAccountTx = SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: mint.publicKey,
            lamports: mintRent,
            space: MintLayout.span,
            programId: TOKEN_PROGRAM_ID,
        });

        const initMintTx = Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            publicKey,
            publicKey
        );

        const associatedTokenAccount = await Token.getAssociatedTokenAddress(
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            publicKey,
            false
        ).catch();

        const createAssociatedTokenAccountTx = Token.createAssociatedTokenAccountInstruction(
            SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            associatedTokenAccount,
            publicKey,
            mint.publicKey
        );

        const mintToTx = Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            associatedTokenAccount,
            publicKey, // Mint authority
            [],
            1 // mint only one token...this makes it "non-fungible"
        );

        console.log("Created new mint and token holder account txs...");

        // In the next section we need to create a bunch of buffers of the Metaplex Metadata program
        // See https://gist.github.com/dietmerc/f2cd3038bb901c91b0c9eb38f6577dc2#step-3-derive-pdas-for-the-nft-accounts
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
        ]
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

        // Create metadata account transaction
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

        console.log("Created metadata and masteredition txs...");

        // Get hash of the latest block on whatever network you're connected to
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
            recentBlockhash: blockhashStruct?.blockhash,
            feePayer: publicKey,
        })
            .add(createMintAccountTx)
            .add(initMintTx)
            .add(createAssociatedTokenAccountTx)
            .add(mintToTx)
            .add(createMetadataTx)
            .add(createMasterEditionTx);
        
        await tx.sign(mint);

        console.log("Signed all transactions...");

        const txId = await wallet.sendTransaction(tx, connection);

        console.log("Sent transactions to network...transaction id is: " + txId);

        return txId;

    } catch (e) {
        console.log(e);
        return "failed";
    }
}