import { ethers, network } from "hardhat";
import { Signer } from "ethers"; 
import { AxelToken, DutchAuction } from "../typechain-types";

// Define a User interface to represent user data
interface User extends Signer {
    username: string;
    role: "seller" | "buyer";

    isSeller: boolean; 
    sellerData: SellerData; 
}

interface SellerData {
    token: AxelToken | null;
    auction: DutchAuction | null;
}


// Initialize an array to store registered users
const users: User[] = [];

// Function to handle user registration
function registerUser(username: string, role: "seller" | "buyer"): void {
    if (users.find((u) => u.username === username)){
        console.log(`Sorry, this username is taken`);
        return;
    }

    let sellerData: SellerData | null = null;

    if (role == "seller") {
        sellerData = { token: null, auction: null };
    } 

    // Create a new user with role-specific data
    const newUser: User = {
        username,
        role,
        isSeller: role === "seller",
        sellerData,
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
    await network.provider.send('hardhat_setBalance', [user, 1000000000000000000 * amount]); // 1 ETH in Wei
    return true;
}

// Function to check and display ETH balance
async function getETHBalance(user: User): Promise<bigint> {
    const balance = await ethers.provider.getBalance(user);
    return balance;
}

// Function to check and display AxelToken balance
async function getAxelTokenBalance(user: User): Promise<bigint> {
    if (user && user.role === "seller" && user.sellerData.token) {
        const token = user.sellerData.token;
        const balance = await token.balanceOf(user);
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
        const token = await ethers.deployContract("AxelToken", [amount], user); 
        await token.waitForDeployment();
        user.sellerData.token = token;
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
        const auction = await ethers.deployContract(
            "DutchAuction", 
            [ startingPrice, reservePrice, user.sellerData.token, duration ], 
            user
        );
        await auction.waitForDeployment();

        const token = user.sellerData.token;
        const balance = await getAxelTokenBalance(user);
        await token.connect(user).approve(auction, balance);

        user.sellerData.auction = auction;
        return true;
    }
    else{
        throw new Error("Cannot start auction.");
    }
}

// Function to transfer all tokens to winners after DutchAuction ends
async function transferAllTokens(user: User): Promise<boolean>{
    if (user && user.role === "seller") {
        if (user.sellerData.auction == null) throw new Error("You have not started an auction.");
        const auction = user.sellerData.auction;
        await auction.connect(user).transferAllTokens();
        return true;
    }
    else{
        throw new Error("Cannot transfer.");
    }
}



