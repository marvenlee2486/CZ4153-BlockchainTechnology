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
        it("Should be able to start auction when owner approve", async function () {
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
            expect(await auction.getTokenLeft()).to.emit(auction, "TokenLeft").withArgs(await axelToken.totalSupply());
            expect(await auction.getPrice()).to.equal(startingPrice);
            expect(await axelToken.balanceOf(owner.address)).to.be.equal(0);
            expect(await axelToken.balanceOf(await auction.getAddress())).to.be.equal(initialAmount);
            // expect(auction.reservePrice).to.equal(reservePrice);
            // expect(auction.expiresAt - auction.startAt).to.equal(duration)
            // TODO expect duration to be a float number? discountRate TO DISCUSS
        });

        it("Only owner can start Auction", async function(){
            const {axelToken, owner, addr1} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const duration = 20 * 60;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
            await auction.waitForDeployment();
            // expect(auction.owner).to.equal(owner.address);
            await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
            await expect(auction.connect(addr1).startAuction()).to.be.reverted;
        });
        
        it("Should Not be able to start Auction if owner did not approve", async function(){
            const {axelToken, owner} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const duration = 20 * 60;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
            await auction.waitForDeployment();
            await expect(auction.connect(owner).startAuction()).to.be.revertedWithCustomError(axelToken, "ERC20InsufficientAllowance");
        });

        it("Shoudl Not be able to call any function if owner did not start auction", async function(){
            const {axelToken, owner, addr1} = await loadFixture(deployTokenFixture);
            const startingPrice = 100;
            const reservePrice = 50; 
            const duration = 20 * 60;
            const tokenAddress = await axelToken.getAddress();
            const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
            await auction.waitForDeployment();
            await expect(auction.connect(addr1).getPrice()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr1).getTokenLeft()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr1).getPosition()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr1).placeBid({value : ethers.parseUnits("0.5", "ether")})).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr1).withdrawTokens(addr1.address)).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(owner).transferAllTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            
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
       
        // it("Should revert if bidder is owner", async function () {
        //     const {auction, owner, addr1} = await loadFixture(deployAuctionFixture);
        //     const option = { value: ethers.parseUnits("0.5","ether") };
        //     await expect(auction.connect(owner).placeBid(option)).to.be.reverted; 
        // })

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
            const discountRate = Math.floor((defaultStartingPrice - defaultReservePrice) / defaultDuration); // TODO
            await expect(await auction.getPrice()).to.be.equal(defaultStartingPrice -  discountRate * 10 * 60);
        });

        it("token get should be show correctly at different stage (reserved price)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await time.increase(20 * 60);
            await expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
        });

        it("Attack 1", async function () {
            // initial price = 100
            // reserved price = 50
            // initialTokenAmount = 100
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            await expect(axelToken.connect(owner).transfer(addr1, 20)).to.be.reverted;
            // await time.increase(10 * 60);
            // await auction.connect(addr2).placeBid({value : ethers.parseUnits("500000", "wei")}); // addr2 buy all tokens
            // await time.increase(10 * 60);
            // await auction.connect(owner).transferAllTokens(); 
            // await expect(axelToken.balanceOf(addr2.address)).to.be.equal(100);
        });
    });

    async function afterBiddingFixture() {
        // This will consider of 3 different address where
        // addr1 - ethers bid is divisible by the final price
        // addr2 - ethers bid is not divisible by the final price
        // addr3 - ethers bid ends the bidding with extra amounts
        const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
        console.log(await ethers.provider.getBalance(addr3.address));
        const middlePrice = 7600//(defaultReservePrice + defaultStartingPrice) / 2;
        const halfTotalSupply = (initialAmount / 2) * middlePrice;

        const addr1_payingPrice = halfTotalSupply; 
        const addr2_payingPrice = middlePrice + 1;
        const addr3_payingPrice = halfTotalSupply; 
        await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(addr1_payingPrice),"wei")});
        await time.increase(defaultDuration / 2);
        await auction.connect(addr2).placeBid({value: ethers.parseUnits(String(addr2_payingPrice),"wei")});
        await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(addr3_payingPrice),"wei")});
        // expect(auction.) TODO Test if it is ended
        const clearingPrice: number = Number(await auction.getPrice());
        const addr1_token: number = Math.floor(halfTotalSupply / clearingPrice);
        const addr2_token: number = 1;
        const addr3_token: number = initialAmount - addr1_token - addr2_token;
        return {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice};
    }

    describe("Dutch Auction Distributing Stage", function(){
        it("Should be able to refund extra amount if last one give extra bid", async function () {
            
            const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(deployAuctionFixture);
            //console.log(await ethers.provider.getBalance(addr3.address));
            const middlePrice = 7600//(defaultReservePrice + defaultStartingPrice) / 2;
            const halfTotalSupply = (initialAmount / 2) * middlePrice;
            await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")});
            await time.increase(defaultDuration / 2);
            await auction.connect(addr2).placeBid({value: ethers.parseUnits(String(middlePrice + 1),"wei")});
            const tx = await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")});
            const receipt = await tx.wait();
            // console.log(await receipt.gasPrice)
            // console.log(receipt.cumulativeGasUsed)
            expect(receipt.cumulativeGasUsed).to.be.equal(receipt.gasUsed);
            const gasUsed = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.gasPrice);
            
            const clearingPrice: number = Number(await auction.getPrice());
            const addr1_token: number = Math.floor(halfTotalSupply / clearingPrice);
            const addr2_token: number = 1;
            const addr3_token: number = initialAmount - addr1_token - addr2_token;
            
            const initialBalance = BigInt(10000000000000000000000);
            const expectedNewBalance = initialBalance - BigInt(addr3_token * clearingPrice) - gasUsed;
            // console.log(expectedNewBalance);
            // console.log(addr3_token);
            // console.log(clearingPrice);
            expect(await ethers.provider.getBalance(addr3.address)).to.be.equal(expectedNewBalance) // TODO Change when the floating point precision loss problem solved
        });

        it("Should be able to withdraw the token if wins some token (and check if the refund amount is correct)", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(afterBiddingFixture);
            // console.log(addr3.cumulativeGasUsed * addr3.gasPrice);
            expect(await auction.connect(addr1).getPosition()).to.be.equal(addr1_payingPrice);
            const beforeBalance = await ethers.provider.getBalance(addr1.address);
            const tx1 = await auction.connect(addr1).withdrawTokens(addr1);
            const tx1_receipt = await tx1.wait();
            const gasUsed = BigInt(tx1_receipt.gasUsed) * BigInt(tx1_receipt.gasPrice);
            expect(await axelToken.balanceOf(addr1.address)).to.be.equal(addr1_token);
            const expectedBalance = beforeBalance - gasUsed + BigInt(addr1_payingPrice - addr1_token * clearingPrice);
            expect(await ethers.provider.getBalance(addr1.address)).to.be.equal(expectedBalance)
        });

        it("Should be able to withdraw the token if wins some token (and check if the refund amount is correct) addr2", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(afterBiddingFixture);
            // console.log(addr3.cumulativeGasUsed * addr3.gasPrice);
            expect(await auction.connect(addr2).getPosition()).to.be.equal(addr2_payingPrice);
            const beforeBalance = await ethers.provider.getBalance(addr2.address);
            const tx1 = await auction.connect(addr2).withdrawTokens(addr2);
            const tx1_receipt = await tx1.wait();
            const gasUsed = BigInt(tx1_receipt.gasUsed) * BigInt(tx1_receipt.gasPrice);
            expect(await axelToken.balanceOf(addr2.address)).to.be.equal(addr2_token);
            const expectedBalance = beforeBalance - gasUsed + BigInt(addr2_payingPrice - addr2_token * clearingPrice);
            expect(await ethers.provider.getBalance(addr2.address)).to.be.equal(expectedBalance)
        });

        it("Should be able to withdraw the token if wins some token (and check if the refund amount is correct) addr3", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(afterBiddingFixture);
            // console.log(addr3.cumulativeGasUsed * addr3.gasPrice);
            expect(await auction.connect(addr3).getPosition()).to.be.equal(clearingPrice * addr3_token);
            const beforeBalance = await ethers.provider.getBalance(addr3.address);
            const tx1 = await auction.connect(addr3).withdrawTokens(addr3);
            const tx1_receipt = await tx1.wait();
            const gasUsed = BigInt(tx1_receipt.gasUsed) * BigInt(tx1_receipt.gasPrice);
            expect(await axelToken.balanceOf(addr3.address)).to.be.equal(addr3_token);
            const expectedBalance = beforeBalance - gasUsed + 0n;
            expect(await ethers.provider.getBalance(addr3.address)).to.be.equal(expectedBalance)
        });
        // it("Should not be able to withdraw more than token I have", async function () {
           
        // });

        it("Should not be able to withdraw if I did not bid", async function () {
            const {axelToken, auction, owner} = await loadFixture(afterBiddingFixture);
            await expect(auction.connect(owner).withdrawTokens(owner)).to.be.reverted;
        });

        it("Owner Should be able to withdraw all tokens for the winner", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3, addr1_token, addr2_token, addr3_token} = await loadFixture(afterBiddingFixture);
            await auction.connect(owner).transferAllTokens();
            expect(await axelToken.balanceOf(addr1)).to.be.equal(addr1_token);
            expect(await axelToken.balanceOf(addr2)).to.be.equal(addr2_token);
            expect(await axelToken.balanceOf(addr3)).to.be.equal(addr3_token);
        });
        
        // it("Owner Should be able to withdraw all tokens for the winner if he have click or all user have withdraw", async function () {

        // });

        it("Not-Owner Should not be able to withdraw all tokens for the winner", async function () {
            const {axelToken, auction, addr1, addr2, addr3} = await loadFixture(afterBiddingFixture);
            await expect(auction.connect(addr1).transferAllTokens()).to.be.reverted;
            // Transfer ALl token should not be triggered
            expect(await axelToken.balanceOf(addr1)).to.be.equal(0);
            expect(await axelToken.balanceOf(addr2)).to.be.equal(0);
            expect(await axelToken.balanceOf(addr3)).to.be.equal(0); 
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