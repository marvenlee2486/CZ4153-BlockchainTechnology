import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { useEffect, useState } from "react";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Countdown from "./Countdown";

interface AuctionProps {
  auctionAddress: string;
}
const Auction: React.FC<AuctionProps> = ({ auctionAddress }) => {
  const { user } = useUserContext();
  const auction = datastore.getAuction(auctionAddress);
  const isOwner = auction.ownerUid === user.uid;
  const [auctionData, setAuctionData] = useState(auction);
  const [auctionEndedData, setAuctionEndedData] = useState({
    currentPrice: null,
    currentTokenLeft: null,
    currentPosition: null,
    currentStage: null,
  });

  let { currentPrice, currentTokenLeft, currentPosition, currentStage } =
    auctionData;

  useEffect(() => {
    if (auction) {
      handleGetAuctionData();
    }
  }, []);

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

  const countdownCallback = () => {
    handleGetAuctionData();
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
    const [signer] = await requestAccount();
    await handleGetAuctionData();
    notify("Please confirm, place bid at: " + currentPrice.toString() + " WEI");
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    if (isNaN(bid)) {
      alert("Please enter a valid number");
      return;
    }
    if (bid < currentPrice) {
      alert("Bid must be greater than current price");
      return;
    }
    await auction.placeBid({ value: currentPrice });
    // datastore.appendBid(auctionAddress, user.uid, currentPrice);
    handleGetAuctionData();
  };

  const handleGetAuctionData = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentStage = await auction.getStage();
    const currentPrice = (await auction.getPrice()).toString();
    const currentTokenLeft = (await auction.getTokenLeft()).toString();
    const currentPosition = (await auction.getPosition()).toString();
    // const auctionTimeEnd = await auction.getExpiresAt().toString()
    console.log(currentStage, currentPrice, currentTokenLeft, currentPosition);
    setAuctionData({
      currentPrice,
      currentTokenLeft,
      currentPosition,
      currentStage,
      // auctionTimeEnd
    });
  };

  // const handleGetAuctionEndedData = async (e: any) => {
  //   const [signer] = await requestAccount();
  //   const auction = new ethers.Contract(
  //     auctionAddress,
  //     DutchAuctionArtifact.abi,
  //     signer
  //   );
  //   const
  // };

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

  const renderOwnedAuction = () => {};

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
          <span className="w-60 ml-2">{currentStage}</span>
        </div>
      </div>

      <div className="flex items-center w-full mb-4">
        <div className="flex items-center mr-4">
          <label className="w-40 font-medium">Current Price:</label>
          <span className="w-60 ml-2">{currentPrice} WEI</span>
        </div>

        <div className="flex items-center">
          <label className="w-40 font-medium">Token Left:</label>
          <span className="w-60 ml-2">{currentTokenLeft} AXL</span>
        </div>
      </div>
      <div className="flex items-center w-full mb-4">
        <div className="flex items-center mr-4">
          <label className="w-40 font-medium">Reserve Price:</label>
          <span className="w-60 ml-2">{auction.reservePrice} WEI</span>
        </div>

        <div className="flex items-center">
          <label className="w-40 font-medium">Ethereum Committed:</label>
          <span className="w-60 ml-2">{currentPosition} WEI</span>
        </div>
        <Countdown
          endTime={auction.endTime}
          countdownCallback={countdownCallback}
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
      <ToastContainer />
    </div>
  );
};
export default Auction;
