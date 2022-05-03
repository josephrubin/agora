// Adds Solana wallet context. See https://github.com/solana-labs/wallet-adapter
import { useMemo } from "react";
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

function NFTDetails(props: {
  title: string,
  imageUri: string
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
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end"}}>
              <div className="m-2">
                <WalletMultiButton />
              </div>
              <div className="m-2">
                <WalletDisconnectButton />
              </div>
              <div className="m-2">
                <ExportNFT title={props.title} imageUri={props.imageUri} imageType="image/png" />
              </div>
            </div>

            <NftDetailsView title={props.title} imageUri={props.imageUri} />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * Content showed on the modal when an NFT is clicked
 */
const NftDetailsView = (props: {
  title: string,
  imageUri: string
}) => {
  return (
    <div>
      <h1 className="mb-4">{props.title || "NFT Details"}</h1>
      <div className="flex flex-row gap-8 space-between">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center justify-center flex-shrink-0 border-2 rounded-md w-96 h-72">
            <img src={props.imageUri} />
          </div>
        </div>
        <div className="flex flex-col w-full gap-2">
          <div><b>Name:</b> Name Goes Here</div>
          <div><b>Owner:</b> Owner Goes Here</div>
          <div><b>Creator:</b> Creator Goes Here</div>
          <hr className="my-2"/>
          <h2>Transaction History</h2>
          <ol className="ml-8">
            <li>X &#8594; Y</li>
            <li>Y &#8594; Z</li>
            <li>Z &#8594; W</li>
          </ol>
          <hr className="my-2"/>
          <form className="flex flex-row w-full gap-4">
            <input type="text" placeholder="Transfer to Email or Wallet" className="flex-grow"></input>
            <input type="submit" value="Transfer"></input>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NFTDetails;
