// https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers
// https://docs.ethers.org/v6/single-page/#api_contract__BaseContract-waitForDeployment

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');

describe("Dutch Auction contract", function () {
    async function deployTokenFixture() {
        const initialAmount = 100;
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
            const Duration = 20;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration]);
            await auction.waitForDeployment();
          });
    });

    async function deployAuctionFixture() {
        const [owner, addr1, buyer] = await ethers.getSigners();
        const axelToken = await ethers.deployContract("DutchAuction", []);
        await axelToken.waitForDeployment();
    
        // Fixtures can return anything you consider useful for your tests
        return { axelToken, owner, addr1, buyer};
      }

    describe("Dutch Auction Biding Stage", function(){

    });

    describe("Dutch Auction Ending Stage", function(){

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