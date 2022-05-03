// Adds Solana wallet context. See https://github.com/solana-labs/wallet-adapter
import { useMemo, useState } from "react";
import { Form } from "remix";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  LedgerWalletAdapter,
  PhantomWalletAdapter,
  SlopeWalletAdapter,
  SolflareWalletAdapter,
  SolletExtensionWalletAdapter,
  SolletWalletAdapter,
  TorusWalletAdapter
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletDisconnectButton,
  WalletMultiButton
} from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

import ExportNFT from "~/components/export-nft";
import { HistoryItem } from "~/generated/graphql-schema";
import { Spinner } from "./spinner";

function NFTDetails(props: {
  id: string,
  title: string,
  imageUri: string,
  history: HistoryItem[],
  txId?: string
}) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
  const network = WalletAdapterNetwork.Devnet;

  // You can also provide a custom RPC endpoint.
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking and lazy loading --
  // Only the wallets you configure here will be compiled into your application, and only the dependencies
  // of wallets that your users connect to will be loaded.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolletWalletAdapter({ network }),
      new SolletExtensionWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <NftDetailsView txId={props.txId} id={props.id} title={props.title} imageUri={props.imageUri} history={props.history} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * Content showed on the modal when an NFT is clicked
 */
const NftDetailsView = (props: {
  id: string,
  title: string,
  imageUri: string,
  history: HistoryItem[],
  txId?: string
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      <h1 className="mb-4">{props.title || "NFT Details"}</h1>
      <div className="flex flex-row gap-8 space-between">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center justify-center flex-shrink-0 border-2 rounded-md w-96 h-72">
            <img className="z-10 object-contain w-full h-full" src={props.imageUri} onLoad={() => setLoaded(true)} />
            {!loaded ? <div className="absolute mx-auto my-auto"><Spinner /></div> : null}
          </div>
        </div>
        <div className="flex flex-col w-full gap-2">
          {props.txId === null ?
            <div className="flex flex-row justify-between gap-4">
              <WalletMultiButton />
              <WalletDisconnectButton />
              <ExportNFT id={props.id} title={props.title} imageUri={props.imageUri} imageType="image/png" />
            </div>
            : <span className="text-xl font-bold">NFT Exported!</span>}
          <hr className="my-2" />
          <h2>Transaction History</h2>
          <ol className="h-16 ml-8 overflow-y-auto">
            {props.history.length === 0 ? <li>Minted!</li> : null}
            {props.history?.map((h, i) =>  <li key={i}>
              ({h.epoch}) &#8594; {h.target}</li>)
            }
          </ol>
          {props.txId === null ?
            <>
              <hr className="my-2"/>
              <Form method="post" className="flex flex-row w-full gap-4">
                <input type="text" placeholder="Transfer to Username" name="destination" className="flex-grow" />
                <input type="hidden" name="id" value={props.id} />
                <button type="submit" value="Transfer">Transfer</button>
              </Form>
            </> : null}
        </div>
      </div>
    </div>
  );
};

export default NFTDetails;
