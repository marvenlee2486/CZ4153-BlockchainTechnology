import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { useEffect, useState, useCallback } from "react";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Countdown from "./Countdown";
import { getTimeRemaining } from "./Countdown";
import { updateBlockchainTimeToNow } from "../helpers/blockchainTime";

interface AuctionProps {
  auctionAddress: string;
  handleGetAxelTokenBalance: () => Promise<void>;
}
const Auction: React.FC<AuctionProps> = ({
  auctionAddress,
  handleGetAxelTokenBalance,
}) => {
  const { user } = useUserContext();
  const initiData = datastore.getAuction(auctionAddress);
  const {
    ownerUid,
    startingPrice,
    reservePrice,
    timestamp: startingTime,
    expiresAt,
  } = initiData;
  const isOwner = ownerUid === user.uid;
  const discountRate =
    (startingPrice - reservePrice) / (expiresAt / 1000 - startingTime / 1000);

  const [auctionData, setAuctionData] = useState({
    currentPrice: 0,
    clearingPrice: reservePrice,
    stage: "Started",
    currentTokenLeft: 0,
    buyerPosition: 0,
    expiresAt: expiresAt,
  });

  const [frontendPrice, setFrontendPrice] = useState("0");
  const isEnded = auctionData.stage === "Ended";
  const [endedTokenFunds, setEndedTokenFunds] = useState(0);
  const [endedEthFunds, setEndedEthFunds] = useState(0);
  const [hideAuction, setHideAuction] = useState(false);

  useEffect(() => {
    if (initiData) {
      handleGetAuctionData();
    }
  }, []);

  const countdownCallback = () => {
    // updates every 10 seconds
    handleGetAuctionData();
  };

  const calculateDiscountedPrice = useCallback(() => {
    // updates every second
    const elapsedTime = (Date.now() - startingTime) / 1000;
    const discountedPrice = startingPrice - discountRate * elapsedTime;
    const frontendPrice = Math.min(discountedPrice, auctionData.currentPrice);
    const decimal = frontendPrice.toFixed(0);
    if (frontendPrice <= 0) {
      setFrontendPrice("0");
    } else {
      setFrontendPrice(decimal);
    }
  }, [startingTime, startingPrice, discountRate, auctionData]); // Dependencies

  useEffect(() => {
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
    await handleGetAuctionData();
    const bid = parseInt(e.target[0].value);
    e.target.reset();
    if (isNaN(bid)) {
      alert("Please enter a valid number");
      return;
    }
    if (bid < auctionData.currentPrice) {
      alert("Bid must be greater than current price");
      alert(`Current Price: ${auctionData.currentPrice}`);
      return;
    }
    const [signer] = await requestAccount();
    notify(
      "Placing Bid: " +
        auctionData.currentPrice.toString() +
        " WEI for current price: " +
        frontendPrice.toString() +
        " WEI"
    );
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );

    await auction.placeBid({ value: bid });
    handleGetAuctionData();
  };

  // update all live data from blockchain. This is called when user clicks refresh data
  const handleGetAuctionData = async () => {
    await updateBlockchainTimeToNow();
    console.log("curr", auctionData);
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );

    const currentStage = await auction.getStage();
    const currentPrice = parseInt(await auction.getPrice());
    console.log("currentPrice", currentPrice);
    const buyerPosition = (await auction.getPosition()).toString();
    let currentTokenLeft = 0;
    let auctionExpiresAt: any;
    if (currentStage === "Started") {
      currentTokenLeft = parseInt(await auction.getTokenLeft());
      auctionExpiresAt = (await auction.getExpiresAt()) * 1000n;
      setAuctionData((prevAuctionData: any) => {
        return {
          ...prevAuctionData,
          currentPrice: currentPrice,
          stage: currentStage,
          currentTokenLeft: currentTokenLeft,
          buyerPosition: buyerPosition,
          expiresAt: auctionExpiresAt.toString(),
        };
      });
    } else {
      handleGetAuctionEnded();
      const clearingPrice = currentPrice;
      setAuctionData((prevAuctionData: any) => {
        return {
          ...prevAuctionData,
          currentPrice: 0,
          clearingPrice: clearingPrice,
          stage: currentStage,
          currentTokenLeft: currentTokenLeft,
          buyerPosition: buyerPosition,
          expiresAt: 0,
        };
      });
    }
  };

  const handleGetAuctionEnded = async () => {
    let endedTokenFunds = 0;
    let endedEthFunds = 0;

    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );

    if (!isOwner) {
      endedTokenFunds = parseInt(await auction.getTokens());
      endedEthFunds = parseInt(await auction.getRefund());
    } else {
      endedTokenFunds = parseInt(await auction.getTokens());
      endedEthFunds = 0;
    }
    if (endedTokenFunds === 0 && endedEthFunds === 0 && isEnded) {
      if (isOwner) datastore.removeAuction(auctionAddress);
      else setHideAuction(true);
      location.reload();
      return;
    }
    setEndedTokenFunds(endedTokenFunds);
    setEndedEthFunds(endedEthFunds);
  };

  const handleWithdrawTokens = async () => {
    await updateBlockchainTimeToNow();
    if (!isEnded) {
      alert("Cannot withdraw, auction still ongoing");
      return;
    }
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    await auction.withdrawTokens();
    handleGetAxelTokenBalance();
    location.reload();
  };

  // OWNER FUNCTIONS....................................................................................................
  const handleRemoveAuction = async () => {
    await updateBlockchainTimeToNow();
    if (!isEnded) {
      alert("Cannot delete, auction still ongoing");
      return;
    }
    datastore.removeAuction(auctionAddress);
    location.reload();
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
    handleGetAxelTokenBalance();
    location.reload();
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
          <div className={`${isEnded && "hiden"} flex items-center`}>
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{frontendPrice} WEI</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Reserve Price:</label>
            <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center"></div>

          <div className="flex items-center">
            <div className={`${isEnded && "hidden"} flex items-center`}>
              <label className="w-40 font-medium">Auction Token Left:</label>
              <span className="w-60 ml-2">
                {auctionData.currentTokenLeft} AXL
              </span>
            </div>
            <label className="w-40 font-medium">Buyer Position:</label>
            <span className="w-60 ml-2">{auctionData.buyerPosition} WEI</span>
          </div>
        </div>
        <div className={`${isEnded && "hidden"} flex items-center w-full mb-4`}>
          <Countdown
            expiresAt={auctionData.expiresAt}
            countdownCallback={countdownCallback}
            calculateDiscountedPrice={calculateDiscountedPrice}
          />
        </div>
        <div
          className={`${
            !isEnded && "hidden"
          } flex  items-center w-full mb-4 border-gray-500 border-t py-3`}
        >
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Refund Tokens:</label>
            <span className="w-60 ml-2">{endedTokenFunds} AXL</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Auction Revenue:</label>
            <span className="w-60 ml-2">{endedEthFunds} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div>
            <form id={auctionAddress} onSubmit={handlePlaceBid}>
              <label className="w-40 mr-5 font-medium">Place Bid:</label>
              <input placeholder="(wei)" type="number" min={1} required></input>
              <button
                type="submit"
                className={`${
                  isEnded && "opacity-50"
                } px-12 py-1 text-white bg-green-400 rounded-lg ml-5`}
                form={auctionAddress}
                disabled={isEnded}
              >
                Place Bid
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleGetAuctionData}
          >
            Refresh Data
          </button>
          <button
            className={`${
              !isEnded && "opacity-50"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded}
            onClick={handleWithdrawTokens}
          >
            Withdraw Tokens
          </button>
          <button
            type="submit"
            className={`${
              !isEnded && "opacity-50"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded}
            onClick={handleWithdrawRevenues}
          >
            Claim All Funds
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  };

  // Withdraw Token, Buyer Position, getRefund, see Refund Value

  const renderNonOwnedAuction = () => {
    if (hideAuction) return <></>;
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
          <div className={`${isEnded && "hidden"} flex items-center`}>
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{frontendPrice} WEI</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Reserve Price:</label>
            <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center"></div>
          <div className="flex items-center">
            <div className={`${isEnded && "hidden"} flex items-center`}>
              <label className="w-40 font-medium">Auction Token Left:</label>
              <span className="w-60 ml-2">
                {auctionData.currentTokenLeft} AXL
              </span>
            </div>
            <label className="w-40 font-medium">Buyer Position:</label>
            <span className="w-60 ml-2">{auctionData.buyerPosition} WEI</span>
          </div>
        </div>
        <div className={`${isEnded && "hidden"} flex items-center w-full mb-4`}>
          <Countdown
            expiresAt={auctionData.expiresAt}
            countdownCallback={countdownCallback}
            calculateDiscountedPrice={calculateDiscountedPrice}
          />
        </div>
        <div
          className={`${
            !isEnded && "hidden"
          } flex  items-center w-full mb-4 border-gray-500 border-t py-3`}
        >
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Earned Tokens:</label>
            <span className="w-60 ml-2">{endedTokenFunds} AXL</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div>
            <form id={auctionAddress} onSubmit={handlePlaceBid}>
              <label className="w-40 mr-5 font-medium">Place Bid:</label>
              <input placeholder="(wei)" type="number" min={1} required></input>
              <button
                type="submit"
                className={`${
                  isEnded && "opacity-50"
                } px-12 py-1 text-white bg-green-400 rounded-lg ml-5`}
                form={auctionAddress}
              >
                Place Bid
              </button>
            </form>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={handleGetAuctionData}
          >
            Refresh Data
          </button>
          <button
            type="submit"
            className={`${
              !isEnded && "opacity-50"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded}
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
