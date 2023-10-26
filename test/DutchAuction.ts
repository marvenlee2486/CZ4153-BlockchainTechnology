// https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers
// https://docs.ethers.org/v6/single-page/#api_contract__BaseContract-waitForDeployment

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');

describe("Dutch Auction contract", function () {
    const initialAmount = 100;
    async function deployTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const axelToken = await ethers.deployContract("AxelToken", [initialAmount], owner);
        await axelToken.waitForDeployment();
        return { axelToken, owner, addr1, addr2, addr3};
    }

    describe("Dutch Auction Creation Stage", function(){
        it("Should be able to start auction on construction", async function () {
            const {axelToken, owner} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const duration = 20;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
            await auction.waitForDeployment();
            // expect(auction.owner).to.equal(owner.address);
            // expect(auction.tokenAmount).to.equal(axelToken.totalSupply());
            // expect(auction.startingPrice).to.equal(startingPrice);
            // expect(auction.reservePrice).to.equal(reservePrice);
            // expect(auction.expiresAt - auction.startAt).to.equal(duration)
            // TODO expect duration to be a float number? discountRate TO DISCUSS
        });

        it("Should revert when startingPrice is not positive", async function () {
            const {axelToken, owner} = await loadFixture(deployTokenFixture);
            const startingPrice = 0;
            const reservePrice = 0; 
            const Duration = 20;
            const tokenAddress = await axelToken.getAddress();
           
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

        it("Should revert when Duration is not positive", async function () {
            const {axelToken, owner} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const Duration = 0;
            const tokenAddress = await axelToken.getAddress();
           
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

        it("Should revert when reservePrice is higher than startingPrice", async function () {
            const {axelToken, owner} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 150; 
            const Duration = 20;
            const tokenAddress = await axelToken.getAddress();
           
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

        it("Should revert when there is no tokens left", async function () {
            const {axelToken, owner, addr1} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const Duration = 20;
            const tokenAddress = await axelToken.getAddress();
            await axelToken.connect(owner).transfer(addr1, initialAmount);
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

    });
    
    async function deployAuctionFixture() {
        const {axelToken, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);
        const startingPrice = 100;
        const reservePrice = 50; 
        const Duration = 20;
        const tokenAddress = await axelToken.getAddress();
        const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration]);
        await auction.waitForDeployment();
        return [axelToken, auction, owner, addr1, addr2, addr3];
    }

    describe("Dutch Auction Biding Stage", function(){

    });

    describe("Dutch Auction Ending Stage", function(){
        it("Should be end after duration time", async function () {
       
        });
    });

    describe("Dutch Auction Distributing Stage", function(){

    });

    // async function deployAuctionFixture() {
    //   const [owner, addr1, addr2, addr3] = await ethers.getSigners();
    //   const auction = await ethers.deployContract("AxelToken", [initialAmount]);
    //   await auction.waitForDeployment();
    //   return { auction, addr1, addr2, addr3};
    // }
  
    // it("Should assign the total supply of tokens to the owner initially", async function () {
    //   const { auction, owner } = await loadFixture(deployAuctionFixture);
      
    // });
  
});