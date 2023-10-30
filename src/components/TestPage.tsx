import { useState } from "react";
import { datastore } from "../helpers/datastore";
import { User } from "../context/UserContext";

function TestPage() {
  const data = datastore.getAllData();
  const dataObj = data.reduce((acc: any, obj: any) => {
    const [key, value] = Object.entries(obj)[0];
    acc[key] = value;
    return acc;
  }, {});
  const currUser = dataObj["currUser"];
  // const currUser = dataObj.filter((key) => key === "currUser")[0];
  // const sellers = dataObj.filter((value: any) => value?.role === "seller");
  // console.log(currUser);
  const [ETHbalance, setETHbalance] = useState(0);
  const handleGetETHBalance = async (e: any) => {
    // setETHbalance(await ...);
  };
  const handleSetETHBalance = async (e: any) => {
    e.preventDefault();
    const eth = e.target[0].value;
    console.log(eth);
  };

  const [axelTokenBalance, setAxelTokenBalance] = useState(0); // [AxelTokenBalance, setAxelTokenBalance
  const handleGetAxelTokenBalance = async (e: any) => {
    // setAxelTokenBalance(await ...);
  };
  const handleMintAxelToken = async (e: any) => {
    e.preventDefault();
    const token = e.target[0].value;
    console.log(token);
  };

  const handleStartAuction = async (e: any) => {
    e.preventDefault();
    const startingPrice = e.target[0].value;
    const reservePrice = e.target[1].value;
    const duration = e.target[2].value;
    console.log(startingPrice, reservePrice, duration);
    const auction = {
      startingPrice: startingPrice,
      reservePrice: reservePrice,
      currPrice: startingPrice,
      duration: duration,
      seller: currUser.username,
      bids: [],
    };
    // await sucess..
    datastore.appendAuction("Auctions", auction);
  };

  const handleTransferToken = async (e: any) => {};

  const handleTransferAllTokens = async (e: any) => {};

  const handleJoinAuction = async (e: any) => {};

  const handlePlaceBid = async (e: any) => {};

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

        {currUser?.role === "seller" && (
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

      {data.map((value, key) => {
        const keyName = Object.keys(value)[0];
        const contents = value[keyName];
        return (
          <div
            key={key}
            className={`${
              keyName === "currUser" && "bg-green-200"
            } font-semibold bg-gray-200`}
          >
            <p className="p-2 m-2 overflow-y-auto">
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
          </div>
        );
      })}
    </div>
  );
}

export default TestPage;
