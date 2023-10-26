import { ethers, network } from "hardhat";
import { Signer } from "ethers"; 
import { AxelToken, DutchAuction } from "../typechain-types";

// Define a User interface to represent user data
interface User extends Signer {
    username: string;
    password: string;
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

const users: Map<string, User> = new Map();

// Function to handle user registration
function registerUser(username: string, role: "seller" | "buyer"): void {
    if (users.has(username)){
        console.log(`Sorry, this username is taken`);
        return;
    }
    let sellerData: SellerData | null = null;
    let buyerData: BuyerData | null = null;

    if (role == "seller") sellerData = { token: null, auction: null };
    else if (role == "buyer") buyerData = { auction: null };

    // Create a new user with role-specific data
    const userDetails: User = {
        username,
        role,
        isSeller: role === "seller",
        sellerData,
        buyerData,
    } as User;

    users.set(username, userDetails);
    console.log(`User ${username} registered as a ${role}`);
}

// Function to handle login
function loginUser(username: string, role: "seller" | "buyer"): boolean {
    if (users.has(username)) {
        const user = users.get(username);
        if (user === undefined) throw new Error ("undefined user");
        console.log(`Welcome, ${user.username}! You are logged in as a ${user.role}`);
        return true;
    } 
    else {
        console.log("Login failed. Please check your username and role.");
        return false;
    }
}

async function setETHBalance(username: string, amount: number): Promise<boolean>{
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");
    try{
        await network.provider.send('hardhat_setBalance', [user, 1000000000000000000 * amount]); // 1 ETH in Wei
    }
    catch{
        throw new Error("Failed to set ETH Balance");
    }
    return true;
}

// Function to check and display ETH balance
async function getETHBalance(username: string): Promise<bigint> {
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");

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
async function getAxelTokenBalance(username: string): Promise<bigint> {
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");

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
async function mintAxelToken(username: string, amount: Number): Promise<boolean>{
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");
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
async function startAuction(username: string, startingPrice: Number, reservePrice: Number, duration: Number): Promise<boolean>{
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");
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
        const balance = await getAxelTokenBalance(username);

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
async function transferToken(username: string, sellerUsername: string): Promise<boolean>{
    const user = users.get(username);
    const seller = users.get(sellerUsername);
    if (user === undefined || seller == undefined) throw new Error ("undefined user / seller");
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
async function transferAllTokens(username: string): Promise<boolean>{
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");
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

// Function to get all auctions that have started, here buyers can choose their sellers
function getAllSellers(): Array<string>{
    const sellers: Array<string> = [];
    users.forEach((value, key) => {
        sellers.push(key);
    });
    return sellers;
}

// Function to join auction
function joinAuction(username: string, sellerUsername: string): boolean{
    const user = users.get(username);
    const seller = users.get(sellerUsername);
    if (user === undefined || seller == undefined) throw new Error ("undefined user / seller");

    const sellers = getAllSellers();
    if (!(sellers).includes(sellerUsername)) throw new Error("Auction does not exist")
    if (user && user.role == "buyer"){
        if (user.buyerData.auction) throw new Error("You have joined an auction.");
        user.buyerData.auction = seller.sellerData.auction;
        return true;
    }
    else{
        throw new Error("Cannot join auction.");
    }
}

async function placeBid(username: string, amount: number): Promise<boolean>{
    const user = users.get(username);
    if (user === undefined) throw new Error ("undefined user");

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



