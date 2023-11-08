import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { useEffect, useState, useCallback } from "react";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Countdown from "./Countdown";
import { getTimeRemaining } from "./Countdown";
import { updateBlockchainTimeToNow } from "../helpers/BlockchainTime";

interface AuctionProps {
  auctionAddress: string;
}
const Auction: React.FC<AuctionProps> = ({ auctionAddress }) => {
  const { user } = useUserContext();
  const initiData = datastore.getAuction(auctionAddress);
  const { ownerUid, startingPrice, reservePrice, startingTime, expiresAt } =
    initiData;
  const isOwner = ownerUid === user.uid;
  const discountRate =
    startingPrice - reservePrice / (expiresAt - startingTime);
  const [auctionData, setAuctionData] = useState({
    currentPrice: 0,
    clearingPrice: reservePrice,
    stage: "Started",
    currentTokenLeft: 0,
    buyerPosition: 0,
    expiresAt: expiresAt,
  });
  const isEnded = auctionData.stage === "Ended";

  const [frontendPrice, setFrontendPrice] = useState(0);

  const [ownerRevenue, setOwnerRevenue] = useState(0);

  useEffect(() => {
    if (initiData) {
      handleGetAuctionData();
    }
  }, []);

  const calculateDiscountedPrice = useCallback(() => {
    const elapsedTime = Date.now() - startingTime;
    const discountedPrice = startingPrice - discountRate * elapsedTime;
    setFrontendPrice(discountedPrice);
  }, [startingTime, startingPrice, discountRate]); // Dependencies

  const countdownCallback = () => {
    // calculateDiscountedPrice();
  };

  useEffect(() => {
    console.log("auction data", auctionData);
    if (auctionData) {
      if (auctionData.stage === "Ended") {
        console.log("auction ended");
      }
    }
  }, [auctionData]);

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

  const handlePlaceBid = async (e: any) => {
    e.preventDefault();
    const bid = parseInt(e.target[0].value);
    e.target.reset();
    const [signer] = await requestAccount();
    await handleGetAuctionData();
    notify("Placing bid at: " + auctionData.currentPrice.toString() + " WEI");
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    if (isNaN(bid)) {
      alert("Please enter a valid number");
      return;
    }
    if (bid < auctionData.currentPrice) {
      alert("Bid must be greater than current price");
      return;
    }
    await auction.placeBid({ value: bid });
    handleGetAuctionData();
  };

  // update all live data from blockchain. This is called when user clicks refresh data
  const handleGetAuctionData = async () => {
    await updateBlockchainTimeToNow();

    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );

    const currentStage = await auction.getStage();
    const currentPrice = parseInt(await auction.getPrice());
    const buyerPosition = (await auction.getPosition()).toString();
    console.log(currentStage);
    let currentTokenLeft = 0;
    let auctionExpiresAt = 0;
    if (currentStage === "Started") {
      currentTokenLeft = parseInt(await auction.getTokenLeft());
      auctionExpiresAt = parseInt(await auction.getExpiresAt());
      setAuctionData((prevAuctionData: any) => {
        return {
          ...prevAuctionData,
          currentPrice: currentPrice,
          stage: currentStage,
          currentTokenLeft: currentTokenLeft,
          buyerPosition: buyerPosition,
          expiresAt: auctionExpiresAt,
        };
      });
    } else {
      const clearingPrice = currentPrice;
      setAuctionData((prevAuctionData: any) => {
        return {
          ...prevAuctionData,
          currentPrice: currentPrice,
          clearingPrice: clearingPrice,
          stage: currentStage,
          currentTokenLeft: currentTokenLeft,
          buyerPosition: buyerPosition,
          expiresAt: 0,
        };
      });
    }
    // if (isOwner) setOwnerRevenue(parseInt(await auction.getOwnerRevenue()));
  };

  const handleWithdrawTokens = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.withdrawTokens();
  };

  // OWNER FUNCTIONS....................................................................................................
  const handleRemoveAuction = async () => {
    if (!isEnded) {
      alert("Cannot delete, auction still ongoing");
      return;
    }
    datastore.removeAuction(auctionAddress);
  };

  const handleWithdrawRevenues = async () => {
    if (!isOwner) return;
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      datastore.get("auctionAddress"),
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.withdrawOwnerFunds();
  };

  const renderOwnedAuction = () => {
    return (
      <div className="w-full p-2 bg-gray-400" key={auctionAddress}>
        <div className="mb-4 text-lg font-bold">Auction</div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center">
            <label className=" w-40 font-medium">Auction Address:</label>
            <span className="w-60 ml-2 truncate">{auctionAddress}</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Auction Status:</label>
            <span className="w-60 ml-2">{auctionData.stage}</span>
          </div>
        </div>

        <div className="flex items-center w-full mb-4">
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{auctionData.currentPrice} WEI</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Token Left:</label>
            <span className="w-60 ml-2">
              {auctionData.currentTokenLeft} AXL
            </span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Reserve Price:</label>
            <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Ethereum Committed:</label>
            <span className="w-60 ml-2">{auctionData.buyerPosition} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Owner Revenue:</label>
            <span className="w-60 ml-2">{ownerRevenue} WEI</span>
          </div>
          <Countdown
            expiresAt={auctionData.expiresAt}
            countdownCallback={countdownCallback}
            calculateDiscountedPrice={calculateDiscountedPrice}
          />
        </div>
        <div className="flex items-center w-full mb-4">
          <div>
            <form id={auctionAddress} onSubmit={handlePlaceBid}>
              <label className="w-40 mr-5 font-medium">Place Bid:</label>
              <input placeholder="(wei)" type="number" min={1} required></input>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="px-12 py-1 text-white bg-green-400 rounded-lg"
            form={auctionAddress}
          >
            Place Bid
          </button>
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleGetAuctionData}
          >
            Refresh Data
          </button>
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleWithdrawTokens}
          >
            Withdraw Tokens
          </button>
          {user.role === "seller" && (
            <button
              type="submit"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
              onClick={handleWithdrawRevenues}
            >
              Withdraw Revenues
            </button>
          )}
        </div>
        <button
          type="button"
          className="px-12 py-1 mt-3 text-white bg-blue-400 rounded-lg"
          onClick={handleRemoveAuction}
        >
          Delete Auction
        </button>
        <ToastContainer />
      </div>
    );
  };

  // Withdraw Token, Buyer Position, getRefund, see Refund Value

  const renderNonOwnedAuction = () => {
    return (
      <div className="w-full p-2 bg-gray-400" key={auctionAddress}>
        <div className="mb-4 text-lg font-bold">Auction</div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center">
            <label className=" w-40 font-medium">Auction Address:</label>
            <span className="w-60 ml-2 truncate">{auctionAddress}</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Auction Status:</label>
            <span className="w-60 ml-2">{auctionData.stage}</span>
          </div>
        </div>

        <div className="flex items-center w-full mb-4">
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{auctionData.currentPrice} WEI</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Token Left:</label>
            <span className="w-60 ml-2">
              {auctionData.currentTokenLeft} AXL
            </span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Reserve Price:</label>
            <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Ethereum Committed:</label>
            <span className="w-60 ml-2">{auctionData.buyerPosition} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div>
            <form id={auctionAddress} onSubmit={handlePlaceBid}>
              <label className="w-40 mr-5 font-medium">Place Bid:</label>
              <input placeholder="(wei)" type="number" min={1} required></input>
            </form>
          </div>
          <Countdown
            expiresAt={auctionData.expiresAt}
            countdownCallback={countdownCallback}
            calculateDiscountedPrice={calculateDiscountedPrice}
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="px-12 py-1 text-white bg-green-400 rounded-lg"
            form={auctionAddress}
            disabled={isEnded}
          >
            Place Bid
          </button>
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleGetAuctionData}
          >
            Refresh Data
          </button>
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleWithdrawTokens}
          >
            Withdraw Tokens
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  };

  return <>{isOwner ? renderOwnedAuction() : renderNonOwnedAuction()}</>;
};
export default Auction;
