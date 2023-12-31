import { datastore } from "../Data/datastore";
import { ethers } from "ethers";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import { useUserContext } from "../helpers/UserContext";
import { useEffect, useState, useCallback } from "react";
import { ToastContainer, toast, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Countdown from "./Countdown";

/**
 * @prop auctionAddress - address of this auction
 * @prop handleGetAxelTokenBalance - callback to get latest balance of user's AXEL token after auction withdraws
 * @returns Auction component that handles all auction logic once it has been created. This component initially uses its own init state
 * to calculate current price and timestamp. It synchronises with the blockchain every 10 seconds or when user interacts with the auction.
 */
interface AuctionProps {
  auctionAddress: string;
  handleGetAxelTokenBalance: () => Promise<void>;
}
const Auction: React.FC<AuctionProps> = ({
  auctionAddress,
  handleGetAxelTokenBalance,
}) => {
  // Props, initData and Constants
  const { user } = useUserContext();
  const initiData = datastore.getAuction(auctionAddress);
  const {
    ownerUid,
    startingPrice,
    reservePrice,
    timestamp: startingTime,
    expiresAt,
    tokenOffering,
    tokenAddress,
  } = initiData;
  const startingDateTime = new Date(startingTime * 1000);
  const discountRate =
    (startingPrice - reservePrice) / (expiresAt / 1000 - startingTime / 1000);
  const isOwner = ownerUid === user.uid;

  // state variables
  const [auctionData, setAuctionData] = useState({
    currentPrice: 0,
    clearingPrice: reservePrice,
    stage: "Started",
    currentTokenLeft: 0,
    buyerPosition: 0,
    expiresAt: expiresAt,
  });
  const isEnded = auctionData.stage === "Ended";
  const [frontendPrice, setFrontendPrice] = useState("0");
  const [winToken, setWinToken] = useState(0);
  const [refundToken, setRefundToken] = useState(0);
  const [ownerRevenue, setOwnerRevenue] = useState(0);
  const [hideAuction, setHideAuction] = useState(false);
  const [rdyToBurn, setRdyToBurn] = useState(false);

  // UTILITY FUNCTIONS................................................................................................

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

  // BLOCKCHAIN DATA FUNCTIONS................................................................................................

  /**
   * This function is called during initial render, when user clicks refresh data and every 10 seconds.
   * It is also called before or after business logic functions are called to ensure that the data is up to date.
   * It updates the auctionData state variable, containing:
   * 1. currentPrice
   * 2. clearingPrice
   * 3. stage
   * 4. currentTokenLeft
   * 5. buyerPosition
   * 6. expiresAt
   * 7. startingAt
   *
   * If the auction has ended, it will set currentPrice, expiresAt to 0 and update clearingPrice.
   * It will also call getEndedAuctionData()
   */
  const getAuctionData = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const currentStage = await auction.getStage();
    const currentPrice = parseInt(await auction.getPrice());
    const buyerPosition = parseInt(await auction.getPosition());
    let currentTokenLeft = 0;
    let auctionExpiresAt = 0;
    const blockStartAt = parseInt(await auction.getStartAt());
    if (blockStartAt !== startingTime) {
      datastore.updateAuctionTimestamp(auctionAddress, blockStartAt);
    }

    if (currentStage === "Started") {
      currentTokenLeft = parseInt(await auction.getTokenLeft());
      auctionExpiresAt = parseInt(
        ((await auction.getExpiresAt()) * 1000n).toString()
      );
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
      getEndedAuctionData();
      const clearingPrice = currentPrice;
      currentTokenLeft = parseInt(await auction.getTokenLeft());
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

  /**
   * Handles data fetching for ended auctions.
   * It gets the winToken, refundToken and ownerRevenue from the auction.
   * Subsequently updating flags hideAuction, rdyToBurn for conditional UI rendering.
   * Auction is hidden if the user no longer has anything to gain from the auction.
   * rdyToBurn is only for the case where the auction timed out and there are excess tokens.
   */
  const getEndedAuctionData = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    const winToken = parseInt(await auction.getTokens());
    const refundToken = parseInt(await auction.getRefund());
    let ownerRevenue = -1;
    if (isOwner) ownerRevenue = parseInt(await auction.getOwnerRevenue());
    if (!isOwner && winToken === 0 && refundToken === 0) {
      setHideAuction(true);
    }
    if (
      winToken === 0 &&
      refundToken === 0 &&
      isOwner &&
      auctionData.currentTokenLeft === 0 &&
      ownerRevenue === 0
    ) {
      setHideAuction(true);
    }
    if (
      winToken === 0 &&
      refundToken === 0 &&
      ownerRevenue === 0 &&
      isOwner &&
      auctionData.currentTokenLeft !== 0
    ) {
      setRdyToBurn(true);
    }

    setOwnerRevenue(ownerRevenue);
    setWinToken(winToken);
    setRefundToken(refundToken);
  };

  // BUSINESS LOGIC FUNCTIONS................................................................................................

  const handlePlaceBid = async (e: any) => {
    e.preventDefault();
    await getAuctionData();
    const bid = parseInt(e.target[0].value);
    e.target.reset();
    if (isNaN(bid)) {
      alert("Please enter a valid number");
      return;
    }
    if (bid < parseInt(frontendPrice)) {
      alert(
        `Bid must be greater than current price! Current Price: ${frontendPrice}`
      );
      return;
    }
    const [signer] = await requestAccount();
    notify(
      `Placing Bid: ${bid} WEI at Current Price: ${frontendPrice} WEI. NOTE: Transaction will take approx 5s`
    );
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    auction.placeBid({ value: bid }).then((tx: any) => {
      tx.wait().then(() => {
        notify(`Bid placed successfully!`);
        getAuctionData();
        location.reload();
      });
    });
  };

  const handleWithdrawTokens = async () => {
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    notify("Withdrawing win tokens & refund from auction!");
    auction
      .withdrawTokens()
      .then((res: any) => {
        res.wait().then(() => {
          if (isOwner) {
            datastore.setTokenWallets(tokenAddress); // update all wallets to this token address
            notify("Tokens and refunds withdrawed from auction!");
            handleGetAxelTokenBalance();
            location.reload();
          } else {
            datastore.updateMyTokenWallet(user.uid, tokenAddress);
            notify("Tokens and refundswithdrawed from auction!");
            handleGetAxelTokenBalance();
            location.reload();
          }
        });
      })
      .catch((err: any) => {
        alert(err);
      });
  };

  const handleWithdrawRevenues = async () => {
    if (!isOwner) return;
    const [signer] = await requestAccount();
    const auction = new ethers.Contract(
      auctionAddress,
      DutchAuctionArtifact.abi,
      signer
    );
    notify("Withdrawing all funds from auction!");
    auction
      .withdrawOwnerFunds()
      .then((res: any) => {
        res.wait().then(() => {
          notify("Funds withdrawed from auction!");
          location.reload();
        });
      })
      .catch((err: any) => {
        alert(err);
      });
  };

  /**
   * This function is only called when the auction has ended and the user has excess tokens.
   * Since no one has bought the tokens, the owner can burn the tokens and delete the auction.
   */
  const handleBurnToken = async () => {
    if (rdyToBurn) {
      notify("Tokens burned on blockchain and auction deleted!");
      datastore.removeAuction(auctionAddress);
      location.reload();
    }
  };

  // HOOK FUNCTIONS................................................................................................

  // initial render
  useEffect(() => {
    if (initiData) {
      getAuctionData();
    }
  }, []);

  // updates every second from countdown.tsx
  const calculateDiscountedPrice = useCallback(() => {
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

  // updates every 10 seconds from countdown.tsx
  const countdownCallback = () => {
    getAuctionData();
  };

  // RENDER FUNCTIONS................................................................................................

  const renderOwnedAuction = () => {
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
          <div className="flex items-center">
            <label className=" w-40 font-medium">Auction Start Time:</label>
            <span className="w-60 ml-2 truncate">
              {startingDateTime.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Starting Price:</label>
            <span className="w-60 ml-2">{startingPrice} WEI</span>
          </div>
        </div>

        <div className="flex items-center w-full mb-4">
          <div className={`${isEnded && "hidden"} flex items-center`}>
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{frontendPrice} WEI</span>
          </div>
          <div className="flex items-center mr-4">
            {isEnded ? (
              <label className="w-40 font-medium">Clearing Price:</label>
            ) : (
              <label className="w-40 font-medium">Reserve Price:</label>
            )}
            <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
          </div>
        </div>
        <div className="flex items-center w-full mb-4">
          <div className="flex items-center"></div>

          <div className="flex items-center">
            <div className={` flex items-center`}>
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
            <label className="w-40 font-medium">Win Tokens:</label>
            <span className="w-40 ml-2">{winToken} AXL</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Ethereum Refund:</label>
            <span className="w-40 ml-2">{refundToken} WEI</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Auction Revenue:</label>
            <span className="w-40 ml-2">{ownerRevenue} WEI</span>
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
            type="button"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={getAuctionData}
          >
            Refresh Data
          </button>
          <button
            type="button"
            className={`${!isEnded && "opacity-50"} ${
              rdyToBurn && "opacity-50"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded || rdyToBurn}
            onClick={handleWithdrawTokens}
          >
            Withdraw Tokens & Refunds
          </button>
          <button
            type="button"
            className={`${!isEnded && "opacity-50"} ${rdyToBurn && "opacity-50"}
             px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded || rdyToBurn}
            onClick={handleWithdrawRevenues}
          >
            Withdraw Owner Revenue
          </button>
          <button
            type="button"
            className={`${
              !rdyToBurn && "hidden"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded}
            onClick={handleBurnToken}
          >
            Burn Tokens & Delete
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  };

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
          <div className="flex items-center">
            <label className=" w-40 font-medium">Auction Start Time:</label>
            <span className="w-60 ml-2 truncate">
              {startingDateTime.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center">
            <label className="w-40 font-medium">Starting Price:</label>
            <span className="w-60 ml-2">{startingPrice} WEI</span>
          </div>
        </div>

        <div className="flex items-center w-full mb-4">
          <div className={`${isEnded && "hidden"} flex items-center`}>
            <label className="w-40 font-medium">Current Price:</label>
            <span className="w-60 ml-2">{frontendPrice} WEI</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="flex items-center mr-4">
              {isEnded ? (
                <label className="w-40 font-medium">Clearing Price:</label>
              ) : (
                <label className="w-40 font-medium">Reserve Price:</label>
              )}
              <span className="w-60 ml-2">{auctionData.clearingPrice} WEI</span>
            </div>
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
            <label className="w-40 font-medium"> Initial Token Offering:</label>
            <span className="w-60 ml-2">{tokenOffering} WEI</span>
          </div>
        </div>

        <div className={`${isEnded && "hidden"} flex items-center w-full mb-4`}>
          <label className="w-40 font-medium">Buyer Position:</label>
          <span className="w-60 ml-2">{auctionData.buyerPosition} WEI</span>
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
            <label className="w-40 font-medium">Win Tokens:</label>
            <span className="w-60 ml-2">{winToken} AXL</span>
          </div>
          <div className="flex items-center mr-4">
            <label className="w-40 font-medium">Ethereum Refund:</label>
            <span className="w-60 ml-2">{refundToken} AXL</span>
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
            type="button"
            className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            onClick={getAuctionData}
          >
            Refresh Data
          </button>
          <button
            type="button"
            className={`${
              !isEnded && "opacity-50"
            } px-12 py-1 text-white bg-blue-400 rounded-lg`}
            disabled={!isEnded}
            onClick={handleWithdrawTokens}
          >
            Withdraw Tokens & Refunds
          </button>
        </div>
        <ToastContainer />
      </div>
    );
  };

  return <>{isOwner ? renderOwnedAuction() : renderNonOwnedAuction()}</>;
};
export default Auction;
