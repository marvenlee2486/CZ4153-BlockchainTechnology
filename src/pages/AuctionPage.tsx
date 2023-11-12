import { useState, useEffect } from "react";
import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import AxelTokenArtifact from "../artifacts/contracts/AxelToken.sol/AxelToken.json";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Auction from "../components/Auction";

/**
 * This is a child of RootLayout.tsx. It renders when user clicks on Auctions in the sidebar. The URl is /auctions:uid
 * This page handles the functions for minting tokens and starting auctions.
 * It renders the Auction component for each auction created.
 * @returns AuctionPage
 */
function AuctionPage() {
  const { user } = useUserContext();
  const auctions = datastore.get("auctions");
  const isSeller = user.role === "seller";
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  // HELPER FUNCTIONS................................................................................................
  const notify = (message: string) =>
    toast(message, {
      position: "top-center",
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
      theme: "light",
      transition: Flip,
    });
  const alert = (message: string) => {
    toast.error(message, {
      position: "top-center",
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: false,
      progress: undefined,
      theme: "light",
      transition: Flip,
    });
  };

  const requestAccount = async () => {
    if (typeof window?.ethereum === "undefined") {
      alert("Please install MetaMask");
      return [];
    } else {
      const provider = new ethers.BrowserProvider(window?.ethereum);
      const network = (await provider.getNetwork()).chainId.toString();
      if (network !== "1337") {
        alert(
          `Please ensure the following:\n 1.Create and connect to Localhost:8545, chainID 1337\n2. Ensure you are logged into account with address: ${user.address}`
        );
        return [];
      }
      const signer = await provider.getSigner();
      const selectedAddress = await signer.getAddress();
      if (
        ethers.getAddress(selectedAddress) !== ethers.getAddress(user.address)
      ) {
        alert(
          `Wrong Account. Ensure you are logged into account with address: ${user.address}`
        );
        return [];
      }
      return [signer];
    }
  };

  // BUSINESS LOGIC....................................................................................................
  const handleGetAxelTokenBalance = async () => {
    try {
      const [signer] = await requestAccount();
      const tokenAddress = datastore.getMyTokenAddress(user.uid!);
      if (!tokenAddress) {
        return;
      }
      const token = new ethers.Contract(
        tokenAddress,
        AxelTokenArtifact.abi,
        signer
      );
      const balance = await token.balanceOf(signer);
      setTokenBalance(parseInt(balance));
    } catch (error) {
      console.log(error);
    }
  };

  const handleMintAxelToken = async (e: any) => {
    e.preventDefault(); // prevent page refresh so can read console.log
    const tokenValue = e.target[0].value;
    e.target.reset(); // clear input field
    try {
      const [signer] = await requestAccount();
      const factory = new ethers.ContractFactory(
        AxelTokenArtifact.abi,
        AxelTokenArtifact.bytecode,
        signer
      );
      const token = await factory.deploy(tokenValue);
      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();
      datastore.setTokenWallets(tokenAddress);
      handleGetAxelTokenBalance();
      notify("Mint AXL token transaction completed!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleStartAuction = async (e: any) => {
    e.preventDefault();
    const tokenAddress = datastore.getMyTokenAddress(user.uid);
    const startingPrice = parseInt(e.target[0].value);
    const reservePrice = parseInt(e.target[1].value);
    const durationSeconds = parseInt(e.target[2].value) * 60;
    const tokenOffering = parseInt(e.target[3].value);
    if (!tokenAddress) {
      alert("Token balance 0. Please mint tokens first!");
      return;
    }
    if (tokenOffering > tokenBalance) {
      alert(
        "Token offering exceeds token balance. Please mint token with more supply!"
      );
      return;
    }
    if (reservePrice > startingPrice) {
      alert(
        "Reserve price exceeds starting price. Please ensure reserve price is lower than starting price!"
      );
      return;
    }
    e.target.reset();
    try {
      const [signer] = await requestAccount();

      //deploy constructor
      const factory = new ethers.ContractFactory(
        DutchAuctionArtifact.abi,
        DutchAuctionArtifact.bytecode,
        signer
      );

      const token = new ethers.Contract(
        tokenAddress,
        AxelTokenArtifact.abi,
        signer
      );

      const auction = await factory.deploy(
        startingPrice,
        reservePrice,
        tokenAddress,
        durationSeconds
      );
      //deploy auction (metamask)
      notify("Please accept auction deployment on metamask!");

      await auction.waitForDeployment();
      const auctionAddress = await auction.getAddress();
      notify("Auction deployed! Please approve token offering on metamask");

      //approve token (metamask)
      await token.approve(auctionAddress, tokenOffering).then((tx: any) => {
        tx.wait().then(() => {
          notify(
            "Token offering approved! Please start auction through metamask"
          );
        });
      });
      const deployedAuction = new ethers.Contract(
        auctionAddress,
        DutchAuctionArtifact.abi,
        signer
      );

      //start auction (metamask)
      let timestamp = 0;
      await deployedAuction.startAuction().then((tx: any) => {
        tx.wait().then(() => {
          timestamp = Date.now(); // temporary timestamp, will be replaced by blockchain timestamp in future
        });
      });
      const deployedAuctionAddress = await deployedAuction.getAddress();
      datastore.appendAuction(
        deployedAuctionAddress,
        user.uid,
        startingPrice,
        reservePrice,
        timestamp,
        durationSeconds,
        tokenOffering,
        tokenAddress
      );
      await handleGetAxelTokenBalance();
      notify("Auction has started!");
      location.reload(); //refresh
    } catch (error) {
      console.log(error);
    }
  };

  // on initial render
  useEffect(() => {
    handleGetAxelTokenBalance();
  }, []);

  /**
   * Passes in auction address and a callback to update token balance of the user.
   * @returns Render Auction Component
   */
  const renderAuctions = () => {
    if (!auctions) return <></>;
    else
      return (
        <div className="flex flex-col w-full gap-2">
          {Object.keys(auctions).map((auctionAddress) => {
            return (
              <Auction
                key={auctionAddress}
                auctionAddress={auctionAddress}
                handleGetAxelTokenBalance={handleGetAxelTokenBalance}
              />
            );
          })}
        </div>
      );
  };

  return (
    <div className="sm:ml-64 mt-14 p-4">
      <div className="flex flex-col items-center justify-start w-full gap-2">
        <div className="w-full p-2 bg-gray-200">
          <div className="mb-3 text-lg font-bold">Token Wallet</div>
          <div>Axel Token Balance: {tokenBalance} AXL</div>
          <form
            onSubmit={handleMintAxelToken}
            className="flex items-center justify-start gap-2"
          >
            {isSeller && (
              <>
                <input
                  placeholder="No. of tokens to mint"
                  type="numbers"
                  required
                ></input>
                <button
                  type="submit"
                  className="px-12 py-1 text-white bg-green-400 rounded-lg"
                >
                  Mint Token
                </button>
              </>
            )}
            <button
              type="button"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
              onClick={handleGetAxelTokenBalance}
            >
              Refresh Balance
            </button>
          </form>
        </div>

        {user.role === "seller" && (
          <div className="w-full p-2 bg-gray-400">
            <div>Start New Auction</div>
            <form
              onSubmit={handleStartAuction}
              className="flex items-center justify-start gap-2"
            >
              <input
                className="w-30"
                placeholder="Starting Price (WEI)"
                type="number"
                min={1}
                required
              ></input>
              <input
                className="w-30"
                placeholder="Reserve Price (WEI)"
                type="number"
                min={1}
                required
              ></input>
              <input
                className="w-30"
                placeholder="Duration (Minutes)"
                type="number"
                min={1}
                required
              ></input>
              <input
                className="w-30"
                placeholder="Token Offering (AXL)"
                type="number"
                min={1}
                required
              ></input>
              <button
                type="submit"
                className="px-12 py-1 text-white bg-green-400 rounded-lg"
              >
                Start Auction
              </button>
            </form>
          </div>
        )}
        {renderAuctions()}
      </div>
      <ToastContainer />
    </div>
  );
}

export default AuctionPage;
