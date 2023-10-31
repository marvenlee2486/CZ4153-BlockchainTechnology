import { useState, useContext } from "react";
import { datastore } from "../Data/datastore";
import { User } from "../helpers/UserContext";
import { ethers } from "ethers";
import AxelTokenArtifact from "../artifacts/contracts/AxelToken.sol/AxelToken.json";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";
import UserContext from "../helpers/UserContext";
import { useNavigate } from "react-router-dom";
// timer function for auction
// auctioneer needs to create auction, display approve total_amount_token to confirm
// and then start auction.

function TestPage() {
  const { user } = useContext(UserContext) ?? {};
  const data = datastore.getAllData();
  const [account, setAccount] = useState("");
  const requestAccount = async () => {
    if (typeof window?.ethereum === "undefined") {
      alert("Please install MetaMask");
      return [];
    } else {
      console.log("Connected to network", window?.ethereum?.networkVersion);
      if (window?.ethereum?.networkVersion !== "1337") {
        alert(
          `Please ensure the following:\n 1.Create and connect to Localhost:8545, chainID 1337\n2. Ensure you are logged into account with address: ${user?.address}`
        );
        return [];
      }
      const provider = new ethers.BrowserProvider(window?.ethereum);
      const signer = await provider.getSigner();
      return [provider, signer];
    }
  };

  const [ETHbalance, setETHbalance] = useState(0);
  const handleGetETHBalance = async (e: any) => {};
  const handleSetETHBalance = async (e: any) => {
    const eth = e.target[0].value;
  };

  const [axelTokenBalance, setAxelTokenBalance] = useState(0); // [AxelTokenBalance, setAxelTokenBalance
  const [axelTokenAddress, setAxelTokenAddress] = useState("");
  const handleGetAxelTokenBalance = async (e: any) => {
    const [provider, signer] = await requestAccount();
    const axelToken = new ethers.Contract(
      axelTokenAddress, // from minted token function
      AxelTokenArtifact.abi,
      signer
    );
    const balance = await axelToken.balanceOf(signer);
    console.log(balance, typeof balance);
    setAxelTokenBalance(balance);
  };
  const handleMintAxelToken = async (e: any) => {
    e.preventDefault(); // prevent page refresh so can read console.log
    const tokenValue = e.target[0].value;
    e.target.reset(); // clear input field
    console.log(tokenValue);
    try {
      const [provider, signer] = await requestAccount();
      const factory = new ethers.ContractFactory(
        AxelTokenArtifact.abi,
        AxelTokenArtifact.bytecode,
        signer
      );
      const contract = await factory.deploy(tokenValue);
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      console.log("axelToken address", address);
      setAxelTokenAddress(address);
    } catch (error) {
      console.log(error);
    }
  };

  const handleStartAuction = async (e: any) => {
    const startingPrice = e.target[0].value;
    const reservePrice = e.target[1].value;
    const duration = e.target[2].value;
    console.log(startingPrice, reservePrice, duration);
    const auction = {
      startingPrice: startingPrice,
      reservePrice: reservePrice,
      currPrice: startingPrice,
      duration: duration,
      seller: user.username,
      bids: [],
    };
    // await sucess..
    datastore.appendAuction("Auctions", auction);
  };

  const handleTransferToken = async (e: any) => {};

  const handleTransferAllTokens = async (e: any) => {};

  const handleJoinAuction = async (e: any) => {};

  const handlePlaceBid = async (e: any, idx: number) => {
    const bid = e.target[0].value;
    datastore.placeBid(idx, [bid, user.username]);
  };

  return (
    <div className="sm:ml-64 mt-14 p-4">
      <div className="flex flex-col items-center justify-start w-full gap-2">
        <div className="w-full p-2 bg-gray-200">
          <div>ETH Balance: {ETHbalance}</div>
          <form
            onSubmit={handleSetETHBalance}
            className="flex items-center justify-start gap-2"
          >
            <input placeholder="ETH amount..." type="numbers"></input>
            <button
              type="submit"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            >
              setETHBalance
            </button>
            <button
              type="button"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
              onClick={handleGetETHBalance}
            >
              getETHBalance
            </button>
          </form>
        </div>

        <div className="w-full p-2 bg-gray-200">
          <div>Axel Token Balance: {axelTokenBalance}</div>
          <form
            onSubmit={handleMintAxelToken}
            className="flex items-center justify-start gap-2"
          >
            <input placeholder="Token amount..." type="numbers"></input>
            <button
              type="submit"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
            >
              mintAxelToken
            </button>
            <button
              type="button"
              className="px-12 py-1 text-white bg-blue-400 rounded-lg"
              onClick={handleGetAxelTokenBalance}
            >
              getAxelTokenBalance
            </button>
          </form>
        </div>

        {user?.role === "seller" && (
          <div className="w-full p-2 bg-gray-400">
            <div>Start New Auction</div>
            <form
              onSubmit={handleStartAuction}
              className="flex items-center justify-start gap-2"
            >
              <input
                className="w-28"
                placeholder="startingPrice..."
                type="numbers"
              ></input>
              <input
                className="w-28"
                placeholder="reservePrice..."
                type="numbers"
              ></input>
              <input
                className="w-28"
                placeholder="duration..."
                type="numbers"
              ></input>
              <select className="pl-1">
                <option value="">s</option>
                <option value="">mins</option>
                <option value="">hrs</option>
                <option value="">days</option>
              </select>
              <button
                type="submit"
                className="px-12 py-1 text-white bg-blue-400 rounded-lg"
              >
                startAuction
              </button>
              <button
                type="button"
                className="px-12 py-1 text-white bg-blue-400 rounded-lg"
                onClick={handleTransferAllTokens}
              >
                transferAllTokens
              </button>
            </form>
          </div>
        )}
      </div>
      <div className=" flex flex-col gap-2 pt-2 overflow-y-auto">
        {data.map((value, key) => {
          const keyName = Object.keys(value)[0];
          const contents = value[keyName];
          if (keyName === "Auctions") {
            return contents.map((auction: any, idx: number) => {
              return (
                <p key={idx} className={`font-semibold bg-red-300 p-2`}>
                  AuctionID {idx}: <br />
                  {Object.keys(auction).map((objKey) => {
                    const objValue = auction[objKey];
                    if (objKey === "bids") {
                      return (
                        <p key={objKey}>
                          bids:
                          {objValue.map((bid: any) => (
                            <p>
                              &lt; {bid[0]}, {bid[1]} &gt;
                            </p>
                          ))}
                        </p>
                      );
                    }
                    return (
                      <span key={objKey}>
                        {objKey}: {objValue}, {"  "}
                      </span>
                    );
                  })}
                  <form
                    onSubmit={(e) => handlePlaceBid(e, idx)}
                    className="flex items-center justify-start gap-2 pt-2"
                  >
                    <input placeholder="Bid amount..." type="numbers"></input>
                    <button
                      type="submit"
                      className="px-12 py-1 text-white bg-blue-400 rounded-lg"
                    >
                      placeBid
                    </button>
                  </form>
                </p>
              );
            });
          } else {
            return (
              <p
                key={key}
                className={`${
                  keyName === user?.username && "bg-green-200"
                } font-semibold bg-gray-200 p-2`}
              >
                {keyName}:{"  "}
                {Object.keys(contents).map((objKey) => {
                  const objValue = contents[objKey];
                  return (
                    <span key={objKey}>
                      {objKey}: {objValue},
                    </span>
                  );
                })}
              </p>
            );
          }
        })}
      </div>
    </div>
  );
}

export default TestPage;
