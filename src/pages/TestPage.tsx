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

	const initialAuctionAddress = datastore.get("auctionAddress") || null;
	const [auctionAddress, setAuctionAddress] = useState(initialAuctionAddress);

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

			//approve token
			await token.approve(auction.getAddress(), tokenBalance);

			//start auction
			const deployedAuction = new ethers.Contract(
				await auction.getAddress(), 
				DutchAuctionArtifact.abi,
				signer
			);

			await deployedAuction.startAuction();
			datastore.set("auctionAddress", (await auction.getAddress())); 
			datastore.set("reservePrice", reservePrice.toString());
			setAuctionAddress((await auction.getAddress()).toString());
			console.log("auction deployed and started");
		}
		catch(error){
			console.log(error);
		}
	};

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
	}

	const initialTokenLeft = datastore.get("tokenLeft") || null;
	const [tokenLeft, setTokenLeft] = useState(initialTokenLeft);

	const handleGetTokenLeft = async ()=> {
		const [signer] = await requestAccount();
		const auction = new ethers.Contract(
			datastore.get("auctionAddress"), 
			DutchAuctionArtifact.abi,
			signer
		);
		const currentTokenLeft = (await auction.getTokenLeft()).toString();
		datastore.set("tokenLeft", currentTokenLeft); 
		setTokenLeft(currentTokenLeft);
	}

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
	}

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

	const handleRefreshAuctionData = async () => {
		await handleGetPrice();
		await handleGetAuctionStage();
		await handleGetTokenLeft();
		await handleGetPosition();
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
						className="px-12 py-1 text-white bg-green-400 rounded-lg"
					>
						Start Auction
					</button>
					</form>
				</div>
				)}
				
				<div className="w-full p-2 bg-gray-400">
					<div className="text-lg font-bold mb-4">Auction</div>
					<div className="flex items-center w-full mb-4">
						<div className="flex items-center mr-4">
							<label className="font-medium w-40">Auction Address:</label>
							<span className="ml-2 w-60 truncate" title={auctionAddress}>{auctionAddress}</span>
						</div>

						<div className="flex items-center">
							<label className="font-medium w-40">Auction Status:</label>
							<span className="ml-2 w-60">{stage}</span>
						</div>
					</div>

					<div className="flex items-center w-full mb-4">
						<div className="flex items-center mr-4">
							<label className="font-medium w-40">Current Price:</label>
							<span className="ml-2 w-60">{price} AXL</span>
						</div>

						<div className="flex items-center">
							<label className="font-medium w-40">Token Left:</label>
							<span className="ml-2 w-60">{tokenLeft}</span>
						</div>
					</div>

					<div className="flex items-center w-full mb-4">
						<div className="flex items-center mr-4">
							<label className="font-medium w-40">Reserve Price:</label>
							<span className="ml-2 w-60">{datastore.get("reservePrice")}</span>
						</div>

						<div className="flex items-center">
							<label className="font-medium w-40">Personal ETH Committed:</label>
							<span className="ml-2 w-60">{position}</span>
						</div>
					</div>

					<form onSubmit={handlePlaceBid} className="flex flex-col items-start gap-2">
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
						{user?.role === "seller" && (
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
			</div>
		</div>
	);
}

export default TestPage;
