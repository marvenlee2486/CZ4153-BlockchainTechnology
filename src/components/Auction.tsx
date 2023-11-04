import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { useEffect, useState } from "react";

interface AuctionProps {
  auctionAddress: string;
}
const Auction: React.FC<AuctionProps> = ({ auctionAddress }) => {
  const { user } = useUserContext();
  const auction = datastore.getAuction(auctionAddress);

  useEffect(() => {
    if (auction) {
      handleRefreshAuctionData();
    }
  }, []);

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

  const [currPrice, setCurrPrice] = useState(0);
  const handleGetPrice = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentPrice = (await auction.getPrice()).toString();
    setCurrPrice(currentPrice);
  };

  const [tokenLeft, setTokenLeft] = useState(0);
  const handleGetTokenLeft = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentTokenLeft = (await auction.getTokenLeft()).toString();
    setTokenLeft(currentTokenLeft);
  };

  const [position, setPosition] = useState(0);
  const handleGetPosition = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentPosition = (await auction.getPosition()).toString();
    setPosition(currentPosition);
  };

  const [stage, setStage] = useState(0);
  const handleGetAuctionStage = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentStage = await auction.getStage();
    setStage(currentStage.toString());
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
          <span className="w-60 ml-2">{stage}</span>
        </div>
      </div>

      <div className="flex items-center w-full mb-4">
        <div className="flex items-center mr-4">
          <label className="w-40 font-medium">Current Price:</label>
          <span className="w-60 ml-2">{currPrice} WEI</span>
        </div>

        <div className="flex items-center">
          <label className="w-40 font-medium">Token Left:</label>
          <span className="w-60 ml-2">{tokenLeft} AXL</span>
        </div>
      </div>
      <div className="flex items-center w-full mb-4">
        <div className="flex items-center mr-4">
          <label className="w-40 font-medium">Reserve Price:</label>
          <span className="w-60 ml-2">{auction.reservePrice} WEI</span>
        </div>

        <div className="flex items-center">
          <label className="w-40 font-medium">Ethereum Committed:</label>
          <span className="w-60 ml-2">{position} WEI</span>
        </div>
      </div>

      <form
        onSubmit={handlePlaceBid}
        className="flex flex-col items-start gap-2"
        id="placeBid"
      >
        <input
          className="w-28 mb-2"
          placeholder="Bid Price"
          type="number"
        ></input>
      </form>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          className="px-12 py-1 text-white bg-green-400 rounded-lg"
          form="placeBid"
        >
          Place Bid
        </button>
        <button
          type="submit"
          className="px-12 py-1 text-white bg-blue-400 rounded-lg"
          onClick={handleRefreshAuctionData}
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
    </div>
  );
};
export default Auction;
