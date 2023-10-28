// https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers
// https://docs.ethers.org/v6/single-page/#api_contract__BaseContract-waitForDeployment
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');

describe("Dutch Auction contract", function () {
    const initialAmount = 100;
    const defaultStartingPrice = 10000;
    const defaultReservePrice = 5000; 
    const defaultDuration = 20 * 60;
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
            const duration = 20 * 60;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
            await auction.waitForDeployment();
            // expect(auction.owner).to.equal(owner.address);
            await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
            await auction.connect(owner).startAuction();
            expect(await auction.getTokenLeft()).to.equal(await axelToken.totalSupply());
            expect(await auction.getPrice()).to.equal(startingPrice);
            expect(await axelToken.balanceOf(owner.address)).to.be.equal(0);
            expect(await axelToken.balanceOf(await auction.getAddress())).to.be.equal(initialAmount);
            // expect(auction.reservePrice).to.equal(reservePrice);
            // expect(auction.expiresAt - auction.startAt).to.equal(duration)
            // TODO expect duration to be a float number? discountRate TO DISCUSS
        });

        it("Should revert when startingPrice is not positive", async function () {
            const {axelToken} = await loadFixture(deployTokenFixture);
            const startingPrice = 0;
            const reservePrice = 0; 
            const Duration = 20;
            const tokenAddress = await axelToken.getAddress();
           
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

        it("Should revert when Duration is not positive", async function () {
            const {axelToken} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const Duration = 0;
            const tokenAddress = await axelToken.getAddress();
           
            await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
        });

        it("Should revert when reservePrice is higher than startingPrice", async function () {
            const {axelToken} = await loadFixture(deployTokenFixture);
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
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])
            await auction.waitForDeployment();
            await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
            await axelToken.connect(owner).transfer(addr1, initialAmount);

            await expect(auction.connect(owner).startAuction()).to.be.reverted;
        });

    });

    async function deployAuctionFixture() {
        const {axelToken, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);
        const tokenAddress = await axelToken.getAddress();
        const auction = await ethers.deployContract("DutchAuction", [defaultStartingPrice, defaultReservePrice, tokenAddress, defaultDuration]);
        await auction.waitForDeployment();
        await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
        await auction.connect(owner).startAuction();
        return {axelToken, auction, owner, addr1, addr2, addr3};
    }

    describe("Dutch Auction Biding Stage", function(){
        it("Should be able to bid if amount sufficient", async function () {
            const {auction, owner, addr1} = await loadFixture(deployAuctionFixture); 
            const option = { value: ethers.parseUnits("0.5","ether") };
            await auction.connect(addr1).placeBid(option);
        })

        // it("Should revert if balance insuficient", async function () {
        //     const {auction, owner, addr1} = await loadFixture(deployAuctionFixture); 
        //     const option = { value: ethers.parseUnits(String(await ethers.provider.getBalance(addr1.address)),"wei") };
        //     await expect(auction.connect(addr1).placeBid(option)).to.be.revertedWith("InvalidInputError");
        // })
       
        it("Should revert if bidder is owner", async function () {
            const {auction, owner, addr1} = await loadFixture(deployAuctionFixture);
            const option = { value: ethers.parseUnits("0.5","ether") };
            await expect(auction.connect(owner).placeBid(option)).to.be.reverted; 
        })

        it("Should revert if bidding amount reached", async function () {
            const {auction, owner, addr1} = await loadFixture(deployAuctionFixture); 
            const option = {value: ethers.parseUnits("1000000", "wei")};
            await auction.connect(addr1).placeBid(option)
            await expect(auction.connect(addr1).placeBid(option)).to.be.reverted;
            // TODO Get the state function
        })

        it("Should revert if current timestamp exceed the duration", async function () {
            const {auction, addr1} = await loadFixture(deployAuctionFixture); 
            const option = {value: ethers.parseUnits("1000000", "wei")};
            await time.increase(20 * 60);
            await expect(auction.connect(addr1).placeBid(option)).to.be.reverted; 
            // TODO Get the state function
        })

        it("Should show the correct price at each stage", async function () {
            // should show the correct price
            // TODO Get the state function
        })
        // Only can give ethers. TODO

        // Should not be able to withdraw if bidding haven,t donee
    });

    
    describe("Dutch Auction Ending Stage", function(){
        it("Should be end earlier if drop until reserved price", async function () {
            // TODO URGENT RETHINK
        });

        it("token leftover should be burned (all tokens burned)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await time.increase(20 * 60);
            await auction.connect(owner).transferAllTokens(); 
            await expect(await axelToken.totalSupply()).to.be.equal(0);
        });

        it("token leftover should be burned (partial burned)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await time.increase(10 * 60);
            auction.connect(addr1).placeBid({value : ethers.parseUnits("10000", "wei")});
            await time.increase(10 * 60);
            await auction.connect(addr1).withdrawTokens(addr1)
            // await auction.connect(owner).transferAllTokens();
            await expect(await axelToken.totalSupply()).to.be.equal(10000 / defaultReservePrice );
        });

        it("token get should be show correctly at different stage (original price)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await expect(await auction.getPrice()).to.be.equal(defaultStartingPrice);
        });

        it("token get should be show correctly at different stage (middle price)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await time.increase(10 * 60);
            const discountRate = Math.floor((defaultStartingPrice - defaultReservePrice) / defaultDuration);
            await expect(await auction.getPrice()).to.be.equal(defaultStartingPrice -  discountRate * 10 * 60);
        });

        it("token get should be show correctly at different stage (reserved price)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await time.increase(20 * 60);
            await expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
        });

        it("Thinking about some cases", async function () {
            // initial price = 100
            // reserved price = 50
            // initialTokenAmount = 100
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            axelToken.connect(owner).transfer(addr1, 20);
            await time.increase(10 * 60);
            await auction.connect(addr2).placeBid({value : ethers.parseUnits("500000", "wei")}); // addr2 buy all tokens
            await time.increase(10 * 60);
            await auction.connect(owner).transferAllTokens(); 
            await expect(axelToken.balanceOf(addr2.address)).to.be.equal(100);
        });
    });

    async function afterBiddingFixture() {
        // This will consider of 3 different address where
        // addr1 - ethers bid is divisible by the final price
        // addr2 - ethers bid is not divisible by the final price
        // addr3 - ethers bid ends the bidding with extra amounts
        const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
        const middlePrice = (defaultReservePrice + defaultStartingPrice / 2);
        const halfTotalSupply = (initialAmount / 2) * middlePrice;
        await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")});
        await time.increase(defaultDuration / 2);
        await auction.connect(addr2).placeBid({value: ethers.parseUnits(String(middlePrice + 1),"wei")});
        await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")});
        // expect(auction.) TODO Test if it is ended
        return {axelToken, auction, owner, addr1, addr2, addr3};
    }

    describe("Dutch Auction Distributing Stage", function(){
        it("Should be able to refund extra amount", async function () {
        });

        it("Should be able to withdraw the token if wins some token (and check if the withdraw amount is reduced)", async function () {
            
        });

        it("Should not be able to withdraw more than token I have", async function () {
           
        });

        it("Should not be able to withdraw if I did not bid", async function () {
          
        });

        it("Owner Should be able to withdraw all tokens for the winner", async function () {
        
        });
        
        it("Owner Should be able to withdraw all tokens for the winner if he have click or all user have withdraw", async function () {

        });

        it("Not-Owner Should not be able to withdraw all tokens for the winner", async function () {
    
        });
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