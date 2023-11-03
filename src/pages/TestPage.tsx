import { useState, useContext, useEffect } from "react";
import { datastore } from "../Data/datastore";
import { ethers } from "ethers";

import AxelTokenArtifact from "../artifacts/contracts/AxelToken.sol/AxelToken.json";
import DutchAuctionArtifact from "../artifacts/contracts/DutchAuction.sol/DutchAuction.json";

import UserContext from "../helpers/UserContext";
import { Navigate } from "react-router-dom";
// timer function for auction
// auctioneer needs to create auction, display approve total_amount_token to confirm
// and then start auction.

function TestPage() {
	const { user } = useContext(UserContext) ?? {};
	if (!user) {
		return <Navigate to="/login" />;
	}
	const data = datastore.getAllData();

	useEffect(() => {}, []);

	const requestAccount = async () => {
		if (typeof window?.ethereum === "undefined") {
			alert("Please install MetaMask");
			return [];
		} 
		else {
			console.log("Connected to network", window?.ethereum?.networkVersion);
			if (window?.ethereum?.networkVersion !== "1337") {
				alert(
				`Please ensure the following:\n 1.Create and connect to Localhost:8545, chainID 1337\n2. Ensure you are logged into account with address: ${user?.address}`
				);
				return [];
			}
			const provider = new ethers.BrowserProvider(window?.ethereum);
			const signer = await provider.getSigner();
			const selectedAddress = await signer.getAddress();
			if (
				ethers.getAddress(selectedAddress) !== ethers.getAddress(user?.address)
			) {
				console.log(user?.address, selectedAddress);
				alert(
				`Wrong Account. Ensure you are logged into account with address: ${user?.address}`
				);
				return [];
			}
			return [signer];
		}
	};

	const initialTokenBalance = datastore.get("tokenBalance") || null;
	const [tokenBalance, setTokenBalance] = useState(initialTokenBalance);

	const handleGetAxelTokenBalance = async () => {
		const [signer] = await requestAccount();
		const token = new ethers.Contract(
			datastore.get("tokenAddress"), 
			AxelTokenArtifact.abi,
			signer
		);
		const balance = await token.balanceOf(signer);
		datastore.set("tokenBalance", balance.toString());
		setTokenBalance(balance.toString());
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
			datastore.set("tokenAddress", await token.getAddress());
			handleGetAxelTokenBalance();
		} 
		catch (error) {
			console.log(error);
		}
	};

	const handleStartAuction = async (e: any) => {
		e.preventDefault(); 

		const startingPrice = e.target[0].value;
		const reservePrice = e.target[1].value;
		const duration = e.target[2].value * 60;

		e.target.reset(); 

		try{
			const [signer] = await requestAccount();

			//deploy constructor
			const factory = new ethers.ContractFactory(
				DutchAuctionArtifact.abi,
				DutchAuctionArtifact.bytecode,
				signer
			);

			const token = new ethers.Contract(
				datastore.get("tokenAddress"), 
				AxelTokenArtifact.abi,
				signer
			);

			const auction = await factory.deploy(startingPrice, reservePrice, token.getAddress(), duration);
			await auction.waitForDeployment();
			datastore.set("auctionAddress", (await auction.getAddress()).toString()); 

			//approve token
			await token.approve(auction.getAddress(), tokenBalance);

			//start auction
			const deployedAuction = new ethers.Contract(
				await auction.getAddress(), 
				DutchAuctionArtifact.abi,
				signer
			);

			await deployedAuction.startAuction();
			console.log("auction deployed and started");
		}
		catch(error){
			console.log(error);
		}
	};

	const handleTransferToken = async (e: any) => {

	};

	const handleTransferAllTokens = async (e: any) => {};

	const handlePlaceBid = async (e: any) => {
		e.preventDefault(); 
		const bid = e.target[0].value;
		e.target.reset(); 

		const [signer] = await requestAccount();
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi,
			signer
		);

		await auction.placeBid(bid);
	};

	const handleGetPrice = async () => {
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi
		);
		datastore.set("price", await auction.getPrice()); 
	}

	const handleGetTokenLeft = async ()=> {
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi
		);
		datastore.set("tokenLeft", await auction.getTokenLeft()); 
	}

	const handleGetPosition = async () => {
		const [signer] = await requestAccount();
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi,
			signer
		);
		datastore.set("position" + user.address, await auction.getPosition()); 
	}

	const handleGetAuctionStage = async () => {
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi
		);
		datastore.set("stage", await auction.getStage()); 
	}
	
	const handleWithdrawTokens = async () => {
		const [signer] = await requestAccount();
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi,
			signer
		);
		await auction.withdrawTokens();
	}

	const handleWithdrawRevenues = async () => {
		const [signer] = await requestAccount();
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi,
			signer
		);
		await auction.withdrawOwnerFunds();
	}

	return (
		<div className="sm:ml-64 mt-14 p-4">
		<div className="flex flex-col items-center justify-start w-full gap-2">

			<div className="w-full p-2 bg-gray-200">
			<div>Axel Token Balance: {tokenBalance} AXL</div>
			<form
				onSubmit={handleMintAxelToken}
				className="flex items-center justify-start gap-2"
			>
				<input placeholder="Token Amount" type="numbers"></input>
				<button
				type="submit"
				className="px-12 py-1 text-white bg-blue-400 rounded-lg"
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

			{user?.role === "seller" && (
			<div className="w-full p-2 bg-gray-400">
				<div>Start New Auction</div>
				<form
				onSubmit={handleStartAuction}
				className="flex items-center justify-start gap-2"
				>
				<input
					className="w-28"
					placeholder="Starting Price"
					type="numbers"
				></input>
				<input
					className="w-28"
					placeholder="Reserve Price"
					type="numbers"
				></input>
				<input
					className="w-30"
					placeholder="Duration (Minutes)"
					type="numbers"
				></input>
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
