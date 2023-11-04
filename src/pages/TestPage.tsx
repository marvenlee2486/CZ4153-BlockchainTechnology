import { useState, useEffect } from "react";
import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import AxelTokenArtifact from "../artifacts/contracts/AxelToken.sol/AxelToken.json";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Auction from "../components/Auction";
import { render } from "react-dom";

// timer function for auction
// auctioneer needs to create auction, display approve total_amount_token to confirm
// and then start auction.

function TestPage() {
  const { user } = useUserContext();
  const auctions = datastore.get("auctions");

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
      console.log("Connected to network", network);
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

  const initialTokenBalance = datastore.getTokenBalance(
    datastore.getTokenAddress(user.uid!)!
  );

  const [tokenBalance, setTokenBalance] = useState(initialTokenBalance);
  const handleGetAxelTokenBalance = async () => {
    try {
      const [signer] = await requestAccount();
      const tokenAddress = datastore.getTokenAddress(user.uid);
      if (!tokenAddress) {
        alert("No tokens found!");
        throw new Error("Token address not found");
      }
      const token = new ethers.Contract(
        tokenAddress,
        AxelTokenArtifact.abi,
        signer
      );
      const balance = await token.balanceOf(signer);
      datastore.setTokenBalance(tokenAddress, balance.toString());
      setTokenBalance(balance.toString());
    } catch (error) {
      console.error(error);
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
      datastore.updateTokens(user.uid!, tokenAddress);
      handleGetAxelTokenBalance();
    } catch (error) {
      console.error(error);
    }
  };

  const initialAuctionAddress = datastore.get("auctionAddress") || null;
  const [auctionAddress, setAuctionAddress] = useState(initialAuctionAddress);

  const handleStartAuction = async (e: any) => {
    e.preventDefault();
    const tokenAddress = datastore.getTokenAddress(user.uid);
    const startingPrice = e.target[0].value;
    const reservePrice = e.target[1].value;
    const duration = e.target[2].value * 60;
    const tokenOffering = e.target[3].value;
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

      const tokenContractAddress = await token.getAddress();
      const auction = await factory.deploy(
        startingPrice,
        reservePrice,
        tokenContractAddress,
        duration
      );
      //deploy auction (metamask)
      await auction.waitForDeployment();
      notify("Auction deployed! Please approve token offering");

      //approve token (metamask)
      await token.approve(auction.getAddress(), tokenOffering);
      notify("Token offering approved! Please start auction");

      const auctionAddress = await auction.getAddress();
      const deployedAuction = new ethers.Contract(
        auctionAddress,
        DutchAuctionArtifact.abi,
        signer
      );

      //start auction (metamask)
      await deployedAuction.startAuction();
      const timestamp = Date.now();
      notify("Auction started!");

      datastore.appendAuction(
        auctionAddress,
        user.uid,
        startingPrice,
        reservePrice,
        duration,
        timestamp
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handlePlaceBid = async (e: any, auctionAddress: string) => {
    e.preventDefault();
    const bidAmount = e.target[0].value;
    e.target.reset();

    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.placeBid(bidAmount);
    datastore.appendBid(auctionAddress, user.uid, bidAmount);
  };

  const initialPrice = datastore.get("price") || null;
  const [price, setPrice] = useState(initialPrice);
  const handleGetPrice = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    const currentPrice = (await auction.getPrice()).toString();
    datastore.set("price", currentPrice);
    setPrice(currentPrice);
  };

  const initialTokenLeft = datastore.get("tokenLeft") || null;
  const [tokenLeft, setTokenLeft] = useState(initialTokenLeft);

  const handleGetTokenLeft = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    const currentTokenLeft = (await auction.getTokenLeft()).toString();
    datastore.set("tokenLeft", currentTokenLeft);
    setTokenLeft(currentTokenLeft);
  };

  const initalPosition = datastore.get("position" + user.address) || null;
  const [position, setPosition] = useState(initalPosition);
  const handleGetPosition = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    const currentPosition = (await auction.getPosition()).toString();
    datastore.set("position" + user.address, currentPosition);
    setPosition(currentPosition);
  };

  const initalStage = datastore.get("stage") || null;
  const [stage, setStage] = useState(initalStage);

  const handleGetAuctionStage = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    const currentStage = await auction.getStage();
    datastore.set("stage", currentStage.toString());
    setStage(currentStage.toString());
  };

  const handleWithdrawTokens = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.withdrawTokens();
  };

  const handleWithdrawRevenues = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.withdrawOwnerFunds();
  };

  const handleRefreshAuctionData = async () => {
    await handleGetPrice();
    await handleGetAuctionStage();
    await handleGetTokenLeft();
    await handleGetPosition();
  };

  const renderAuctions = () => {
    if (!auctions) return <></>;
    else
      return (
        <div className="flex flex-col w-full gap-2">
          {Object.keys(auctions).map((auctionAddress) => {
            return <Auction auctionAddress={auctionAddress} />;
          })}
        </div>
      );
  };

  return (
    <div className="sm:ml-64 mt-14 p-4">
      <div className="flex flex-col items-center justify-start w-full gap-2">
        <div className="w-full p-2 bg-gray-200">
          <div>Axel Token Balance: {tokenBalance} AXL</div>
          <form
            onSubmit={handleMintAxelToken}
            className="flex items-center justify-start gap-2"
          >
            <input placeholder="Token Amount" type="numbers" required></input>
            <button
              type="submit"
              className="px-12 py-1 text-white bg-green-400 rounded-lg"
            >
              Mint Token
            </button>
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

export default TestPage;
