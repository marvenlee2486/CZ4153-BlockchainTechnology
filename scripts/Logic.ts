import { ethers, network } from "hardhat";
import { Signer } from "ethers"; 
import { AxelToken, DutchAuction } from "../typechain-types";

// Define a User interface to represent user data
interface User extends Signer {
    username: string;
    role: "seller" | "buyer";

    isSeller: boolean; 
    sellerData: SellerData; 
    buyerData: BuyerData;
}

interface SellerData {
    token: AxelToken | null;
    auction: DutchAuction | null;
}

interface BuyerData {
    auction: DutchAuction | null;
}

const users: User[] = [];
const usernames: Set<string> = new Set();

// Function to handle user registration
function registerUser(username: string, role: "seller" | "buyer"): void {
    if (usernames.has(username)){
        console.log(`Sorry, this username is taken`);
        return;
    }
    usernames.add(username);
    let sellerData: SellerData | null = null;
    let buyerData: BuyerData | null = null;

    if (role == "seller") sellerData = { token: null, auction: null };
    else if (role == "buyer") buyerData = { auction: null };

    // Create a new user with role-specific data
    const newUser: User = {
        username,
        role,
        isSeller: role === "seller",
        sellerData,
        buyerData,
    } as User;

    users.push(newUser);
    console.log(`User ${username} registered as a ${role}`);
}

// Function to handle login
function loginUser(username: string, role: "seller" | "buyer"): boolean {
    const user = users.find((u) => u.username === username && u.role === role);
    if (user) {
        console.log(`Welcome, ${user.username}! You are logged in as a ${user.role}`);
        return true;
    } 
    else {
        console.log("Login failed. Please check your username and role.");
        return false;
    }
}

async function setETHBalance(user: User, amount: number): Promise<boolean>{
    try{
        await network.provider.send('hardhat_setBalance', [user, 1000000000000000000 * amount]); // 1 ETH in Wei
    }
    catch{
        throw new Error("Failed to set ETH Balance");
    }
    return true;
}

// Function to check and display ETH balance
async function getETHBalance(user: User): Promise<bigint> {
    let balance;
    try{
        balance = await ethers.provider.getBalance(user);
    }
    catch{
        throw new Error("Failed to get ETH Balance");
    }
    return balance;
}

// Function to check and display AxelToken balance
async function getAxelTokenBalance(user: User): Promise<bigint> {
    if (user && user.role === "seller" && user.sellerData.token) {
        const token = user.sellerData.token;
        let balance;
        try{
            balance = await token.balanceOf(user);
        }
        catch{
            throw new Error("Failed to get AxelToken Balance");
        }
        return balance;
    }
    else {
        throw new Error("Cannot get AxelToken Balance.");
    }
}

// Function to create AxelToken
async function mintAxelToken(user: User, amount: Number): Promise<boolean>{
    if (user && user.role === "seller") {
        if (user.sellerData.token) throw new Error("You have created a token.");
        let token;
        try{
            token = await ethers.deployContract("AxelToken", [amount], user); 
            await token.waitForDeployment();
            user.sellerData.token = token;
        }
        catch(error){
            console.log(error);
        }
        return true;
    }
    else {
        throw new Error("Cannot mint token.");
    }
}

// Function to start DutchAuction
async function startAuction(user: User, startingPrice: Number, reservePrice: Number, duration: Number): Promise<boolean>{
    if (user && user.role === "seller") {
        if (user.sellerData.token == null) throw new Error("Need to create token first.");
        if (user.sellerData.auction) throw new Error("You have started an auction.");

        let auction;
        try{
            auction = await ethers.deployContract(
                "DutchAuction", 
                [ startingPrice, reservePrice, user.sellerData.token, duration ], 
                user
            );
            await auction.waitForDeployment();
        }
        catch(error){
            console.log(error);
            throw new Error("Cannot deploy auction");
        }

        const token = user.sellerData.token;
        const balance = await getAxelTokenBalance(user);

        try{
            await token.connect(user).approve(auction, balance);
        }
        catch(error){
            console.log(error);
            throw new Error("Cannot approve ETH to smart contract");
        }

        user.sellerData.auction = auction;
        return true;
    }
    else{
        throw new Error("Cannot start auction.");
    }
}

// Function to transfer token if you win
async function transferToken(user: User, auction: DutchAuction): Promise<boolean>{
    if (user && user.role === "buyer") {
        if (user.buyerData.auction == null) throw new Error("You have not joined an auction.");
        const auction = user.buyerData.auction;
        const zeroAddress = '0x0000000000000000000000000000000000000000';
        try{
            await auction.connect(user).withdrawTokens(zeroAddress);
        }
        catch(error){
            console.log(error);
        }
        return true;
    }
    else{
        throw new Error("Cannot transfer.");
    }
}

// Function to transfer all tokens to winners after DutchAuction ends
async function transferAllTokens(user: User): Promise<boolean>{
    if (user && user.role === "seller") {
        if (user.sellerData.auction == null) throw new Error("You have not started an auction.");
        const auction = user.sellerData.auction;
        try{
            await auction.connect(user).transferAllTokens();
        }
        catch (error){
            console.log(error);
        }
        return true;
    }
    else{
        throw new Error("Cannot transfer.");
    }
}

// Function to get all auctions that have started
function getAllAuctions(): DutchAuction[]{
    const auctions = users.flatMap(user => user.sellerData?.auction || []);
    return auctions;
}

// Function to join auction
function joinAuction(user: User, auction: DutchAuction): boolean{
    const auctions = getAllAuctions();
    if (!(auctions).includes(auction)) throw new Error("Auction does not exist")
    if (user && user.role == "buyer"){
        if (user.buyerData.auction) throw new Error("You have joined an auction.");
        user.buyerData.auction = auction;
        return true;
    }
    else{
        throw new Error("Cannot join auction.");
    }
}

async function placeBid(user: User, amount: number): Promise<boolean>{
    if (user && user.role == "buyer"){
        if (user.buyerData.auction == null) throw new Error("You have not joined an auction.");
        const auction = user.buyerData.auction;
        try{
            const ethersamount = ethers.parseEther(amount.toString());
            await auction.connect(user).placeBid({value: ethersamount});
        }
        catch(error){
            console.log(error);
            throw new Error("Failed to place bid");
        }
        return true;
    }
    else{
        throw new Error("Cannot place bid.");
    }
}



