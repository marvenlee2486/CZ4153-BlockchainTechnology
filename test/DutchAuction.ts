// https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ethers
// https://docs.ethers.org/v6/single-page/#api_contract__BaseContract-waitForDeployment
const { expect } = require("chai");
const { ethers , provider} = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');

// This function is to calculate the amount of balance is correct after a transaction
async function checkBalanceTransaction(addr, txPromise, amount){
    const initialAmount: BigInt = await ethers.provider.getBalance(addr.address);
    const tx = await txPromise;
    const receipt = await tx.wait();
    const gasUsedPaid: BigInt = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.gasPrice); 
    const expectedAmount: BigInt = initialAmount - gasUsedPaid + BigInt(amount);
    expect(await ethers.provider.getBalance(addr.address)).to.be.equal(expectedAmount);
}
    
describe("Dutch Auction contract", function () {
    const initialAmount = 100; // initial Token Amount
    const defaultStartingPrice = 10000; 
    const defaultReservePrice = 5000; 
    const defaultDuration = 20 * 60;
    async function deployTokenFixture() {
        const [owner, addr1, addr2, addr3] = await ethers.getSigners();
        const axelToken = await ethers.deployContract("AxelToken", [initialAmount], owner);
        await axelToken.waitForDeployment();
        return { axelToken, owner, addr1, addr2, addr3};
    };

    describe("Dutch Auction Creation Stage - 'Constructor' Function", function(){
        describe("Successful construction",function(){
            it("Should be able to construct auction", async function(){
                const {axelToken, owner} = await loadFixture(deployTokenFixture);
                const startingPrice = 100;
                const reservePrice = 50; 
                const duration = 20 * 60;
                const tokenAddress = await axelToken.getAddress();
                const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
                await auction.waitForDeployment();
                await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
                expect(await auction.getStage()).to.be.equal("Not Yet Started")
            });
        });

        describe("Failed to construct", function(){
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

                await axelToken.connect(owner).burn(initialAmount);

                await expect(ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])).to.be.reverted;
            });
        });
    });

    describe("Dutch Auction Starting Stage - 'startAuction' Function", function(){
        describe("Successful starting", function(){
            it("Should be able to start auction when owner approve", async function () {
                const {axelToken, owner} = await loadFixture(deployTokenFixture);
                const startingPrice = 100;
                const reservePrice = 50; 
                const duration = 20 * 60;
                const tokenAddress = await axelToken.getAddress();
                const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
                await auction.waitForDeployment();
                await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
                expect(await auction.getStage()).to.be.equal("Not Yet Started");
                expect(await axelToken.balanceOf(owner.address)).to.be.equal(initialAmount);
                expect(await axelToken.balanceOf(await auction.getAddress())).to.be.equal(0);

                await auction.connect(owner).startAuction();
                expect(await auction.getStage()).to.be.equal("Started");
                expect(await auction.getTokenLeft()).to.be.equal(await axelToken.totalSupply());
                expect(await auction.getPrice()).to.equal(startingPrice);
                expect(await auction.getPosition()).to.equal(0);
                expect(await axelToken.balanceOf(owner.address)).to.be.equal(0);
                expect(await axelToken.balanceOf(await auction.getAddress())).to.be.equal(initialAmount);
                expect(await ethers.provider.getBalance(await auction.getAddress())).to.be.equal(0);
            });

            it("token amount is dependable on allowances", async function () {
                const {axelToken, owner} = await loadFixture(deployTokenFixture);
                const startingPrice = 100;
                const reservePrice = 50; 
                const duration = 20 * 60;
                const tokenAddress = await axelToken.getAddress();
                const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
                await auction.waitForDeployment();
                await axelToken.connect(owner).approve(await auction.getAddress(), 1);

                await auction.connect(owner).startAuction();

                expect(await auction.getTokenLeft()).to.be.equal(1);
                expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(1);
                expect(await axelToken.balanceOf(owner.address)).to.be.equal(initialAmount - 1);

                await axelToken.connect(owner).approve(await auction.getAddress(), 1);
                expect(await auction.getTokenLeft()).to.be.equal(1);
            });
        });

        describe("Failed to start auction", function(){
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
                await expect(auction.connect(addr1).startAuction()).to.be.revertedWithCustomError(auction,"OnlyOwnerCanCallFunction");
            });
            
            it("Should Not be able to start Auction if owner did not approve", async function(){
                const {axelToken, owner} = await loadFixture(deployTokenFixture);
                const startingPrice = 100;
                const reservePrice = 50; 
                const duration = 20 * 60;
                const tokenAddress = await axelToken.getAddress();
                const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, duration], owner);
                await auction.waitForDeployment();
                await expect(auction.connect(owner).startAuction()).to.be.revertedWithCustomError(auction, "InvalidAuctionInput");
            });

            it("Should revert when there is not enought tokens left to start auction", async function () {
                const {axelToken, owner, addr1} = await loadFixture(deployTokenFixture);
                const startingPrice = 100;
                const reservePrice = 50; 
                const Duration = 20;
                const tokenAddress = await axelToken.getAddress();
                const auction = await ethers.deployContract("DutchAuction", [startingPrice, reservePrice, tokenAddress, Duration])
                await auction.waitForDeployment();
                await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
                await axelToken.connect(owner).transfer(addr1, 1); // Even 1 unit should not be able to work

                await expect(auction.connect(owner).startAuction()).to.be.reverted;
            });
        });
    });

    async function startAuctionFixture() {
        const {axelToken, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);
        const tokenAddress = await axelToken.getAddress();
        const auction = await ethers.deployContract("DutchAuction", [defaultStartingPrice, defaultReservePrice, tokenAddress, defaultDuration]);
        await auction.waitForDeployment(); 
        await axelToken.connect(owner).approve(await auction.getAddress(), initialAmount);
        await auction.connect(owner).startAuction();
        const startAt = await time.latest();
        expect(await auction.getStartAt()).to.be.equal(startAt);
        expect(await auction.getExpiresAt()).to.be.equal(startAt + defaultDuration);
        return {axelToken, auction, owner, addr1, addr2, addr3, startAt};
    };

    // This is used to test the 'placebid' function
    describe("Dutch Auction Biding Stage - 'placeBid' function", function(){
        describe("Successfully to bid", function(){
            it("Should be able to bid if amount sufficient", async function () {
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture); 
                const option = { value: ethers.parseUnits("0.5","ether") };
                const auctionInitialAmount = await ethers.provider.getBalance(auction.getAddress());
               
                await checkBalanceTransaction(addr1, auction.connect(addr1).placeBid(option), -1 * 0.5 * 1e18);
                const clearingPrice = await auction.getPrice();

                const expectedAuctionAmount = auctionInitialAmount + BigInt(0.5 * 1e18);
                expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(expectedAuctionAmount);
                expect(await auction.connect(addr1).getPosition()).to.be.equal(clearingPrice * BigInt(initialAmount));
            });

            it("Should be able to bid if bid new amount again", async function () {
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture); 
                const option = { value: ethers.parseUnits(String(defaultStartingPrice),"wei") };

                const auctionInitialAmount = await ethers.provider.getBalance(auction.getAddress());
                await checkBalanceTransaction(addr1, auction.connect(addr1).placeBid(option), -1 * defaultStartingPrice);

                await time.increase(10 * 20);
    
                await checkBalanceTransaction(addr1, auction.connect(addr1).placeBid(option), -1 * defaultStartingPrice);

                const expectedAuctionAmount = auctionInitialAmount + BigInt(defaultStartingPrice) + BigInt(defaultStartingPrice);
                expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(expectedAuctionAmount);
                expect(await auction.connect(addr1).getPosition()).to.be.equal(2 * defaultStartingPrice);
            });
            
            // The reason for such design is due to ending the auction through 'placebid', in fact this is case 3 ending
            it("if the last Bidder bid after expires timestamp and trigger the _nextStage, the bidder shall get its refund through withdraw tokens function", async function () {
                const {auction, addr1} = await loadFixture(startAuctionFixture); 
                const option = {value: ethers.parseUnits("1000000", "wei")};
                await time.increase(20 * 60);

                const initialAmount = await ethers.provider.getBalance(auction.getAddress());

                expect(await auction.getStage()).to.be.equal("Ended");
                checkBalanceTransaction(addr1, await auction.connect(addr1).placeBid(option), 1000000);
                expect(await auction.connect(addr1).getRefund()).to.be.equal(1000000);
                expect(await auction.connect(addr1).getPosition()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
                expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAmount + BigInt(1000000));
                expect(await auction.getStage()).to.be.equal("Ended");
            });
        });
        
        describe("Failed to bid", function(){
            it("Should revert if bidding amount not enought", async function () {
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture); 
                const option = {value: ethers.parseUnits("1", "wei")};
            
                const initialAuctionBalance = await ethers.provider.getBalance(auction.getAddress());
                const initialUserBalance = await ethers.provider.getBalance(addr1.address);

                // Since the bidding amount reached, so should not be able to place any more bid
                await expect(auction.connect(addr1).placeBid(option)).to.be.revertedWithCustomError(auction, "InvalidBidValue");
                
                // The following Code check whether when the transaction involving sending value is reverted, did the only cost deducted is the gas cost
                // Get latest transaction hash
                const latestBlock = await ethers.provider.getBlock("latest");
                const latestTXHash = latestBlock.transactions.at(-1);
                const receipt = await ethers.provider.getTransactionReceipt(latestTXHash);
                
                // Determine latest transaction gas costs
                const gasUsedPaid = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.gasPrice); 

                // Expect the ether of the account is not changed for auction account because the placeBid is reverted
                expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAuctionBalance);
                expect(await ethers.provider.getBalance(addr1.address)).to.be.equal(initialUserBalance - gasUsedPaid);
            });
            
            // Case 1: Ending 
            it("Should revert if no tokens left triggered by 'placeBid' function", async function () {
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture); 
                const option = {value: ethers.parseUnits("1000000", "wei")};
                await auction.connect(addr1).placeBid(option)

                const initialAmount = await ethers.provider.getBalance(auction.getAddress());

                // Since the bidding amount reached, so should not be able to place any more bid
                await expect(auction.connect(addr1).placeBid(option)).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");

                // Expect the ether of the account is not changed for auction account because the placeBid is reverted
                expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAmount);
            
                // Expect the state function to be auction ended
                expect(await auction.getStage()).to.be.equal("Ended");
            });

            // Case 2: Ending
            it("Should revert if no tokens left naturally when time increase", async function () {
                const {auction, owner, addr1, startAt} = await loadFixture(startAuctionFixture); 

                const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
                const expectedClearingPrice = defaultStartingPrice - discountRate * ((defaultDuration) / 2);

                const option = {value: ethers.parseUnits(String(expectedClearingPrice * initialAmount), "wei")};
                
                await auction.connect(addr1).placeBid(option);
                
                await time.increaseTo(startAt + defaultDuration / 2);
        
                // Since the bidding amount reached, so should not be able to place any more bid
                // await expect(auction.connect(addr1).placeBid(option)).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await auction.connect(addr1).placeBid({value : ethers.parseUnits(String(expectedClearingPrice), "wei")});
                expect(await auction.getStage()).to.be.equal("Ended");
                expect(await auction.getPrice()).to.be.equal(expectedClearingPrice);
                expect(await auction.connect(addr1).getRefund()).to.be.equal(expectedClearingPrice);
                
            });
        });
        
        describe("Test view pricing function - 'getPrice' view function", function(){
            it("token price should be show correctly at different stage (original price)", async function () {
                const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                await expect(await auction.getPrice()).to.be.equal(defaultStartingPrice);
            });

            it("token price should be show correctly at different stage (middle price)", async function () {
                const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                await time.increase(10 * 60);
                const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration; 
                await expect(await auction.getPrice()).to.be.equal(defaultStartingPrice -  discountRate * 10 * 60);
            });

            it("token price should be show correctly at different stage (reserved price)", async function () {
                const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                await time.increase(20 * 60);
                await expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            });
        });
        
        describe("Test view token left function - 'getTokenLeft' view function", function(){
            it("Should be able to show correct amount of tokenLeft at any point of time", async function(){
                const {auction, addr1, addr2, startAt} = await loadFixture(startAuctionFixture); 
                
                const discountRate =  (defaultStartingPrice - defaultReservePrice) / defaultDuration;
    
                // Case 1: Token Left should not change if no one bid
                // await time.increaseTo(startAt + 2);
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount);
                
                // Case 2: Token Left should decrease to correct amount if someone placeBid, This case is design such that defaultStartingPrice is placed and buy 5 token only..
                await auction.connect(addr1).placeBid({value : ethers.parseUnits(String(defaultStartingPrice * 10), "wei")});
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount - 10);
                
                // Case 3: Another people place the sameAmount of bid, and should decrease again
                await auction.connect(addr2).placeBid({value : ethers.parseUnits(String(defaultStartingPrice * 5), "wei")}); 
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount - 15);
    
                // Case 4: No additional Bid given, but amount of token drop, check the boundary conidition
                const expectTokenAmountDecreaseMoment = Math.ceil((defaultStartingPrice)/ (discountRate * 11)) + startAt
    
                await time.increaseTo(expectTokenAmountDecreaseMoment - 1);
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount - 15);
    
                await time.increaseTo(expectTokenAmountDecreaseMoment);
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount - 16); // Only addr1 decrease
    
                // Case 5: Midway, A bidder add amount, should show correct tokenleft
                await time.increaseTo(startAt + defaultDuration / 2);
                await auction.connect(addr2).placeBid({value : ethers.parseUnits(String(defaultStartingPrice * 5), "wei")});
                const midWayPrice = defaultStartingPrice - discountRate * (defaultDuration / 2);
                // addr1 and addr2 have same bid amount
                const expectedNumberofTokensBought = 2 * Math.floor((defaultStartingPrice * 10) / midWayPrice);
                expect(await auction.getTokenLeft()).to.be.equal(initialAmount - expectedNumberofTokensBought); 
    
            });
        });
    });

    // These test case test all the possible triggering _nextStage function to end the auction.
    // The view function should always show what the blockchain state suppose to be
    describe("Dutch Auction Ending Stage - Test all the functions that would trigger '_nextStage' function to auction end", function(){
        describe("Different state-changing function change the stage to Auction End", function(){    
            describe("Auction End by 'WithdrawTokens' Function", function(){
                it("Auction should show end when no tokenLeft", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    const expectedClearingPrice = (defaultReservePrice + defaultStartingPrice) / 2;
                    const value = expectedClearingPrice * initialAmount;
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(value),"wei")});
                    await time.increase(defaultDuration / 2)
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(addr1).withdrawTokens()).to.emit(auction, "auctionEndEvent");
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await axelToken.balanceOf(addr1)).to.be.equal(initialAmount);
                });

                it("Auction should show end when time expires", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(defaultStartingPrice),"wei")});
                    await time.increase(defaultDuration)
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(addr1).withdrawTokens()).to.emit(auction, "auctionEndEvent");
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await axelToken.balanceOf(addr1)).to.be.equal(2);
                });
            })

            describe("Auction End by 'WithdrawOwnerFunds' function", function(){
                it("Auction should show end when no tokenLeft", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    const expectedClearingPrice = (defaultReservePrice + defaultStartingPrice) / 2;
                    const value = expectedClearingPrice * initialAmount;
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(value),"wei")});
                    await time.increase(defaultDuration / 2)
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(value);
                    expect(await auction.connect(owner).withdrawOwnerFunds()).to.emit(auction, "auctionEndEvent");
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
                });

                it("Auction should show end when time expires", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(defaultStartingPrice),"wei")});
                    await time.increase(defaultDuration)
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(defaultStartingPrice);
                    expect(await auction.connect(owner).withdrawOwnerFunds()).to.emit(auction, "auctionEndEvent");
                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
                    expect(await auction.getStage()).to.be.equal("Ended");
                });
            })

            describe("Auction End by 'PlaceBid' Function", function(){
                it("Auction should show end when no tokenLeft", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    const expectedClearingPrice = (defaultReservePrice + defaultStartingPrice) / 2;
                    const value = expectedClearingPrice * initialAmount;
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(value),"wei")});
                    await time.increase(defaultDuration / 2)
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(owner).getRefund()).to.be.equal(0);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(value);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(initialAmount);
                    
                    expect(await auction.connect(owner).placeBid({value: ethers.parseUnits(String(value),"wei")})).to.emit(auction, "auctionEndEvent");
                    
                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(2 * value)
                    expect(await auction.connect(owner).getRefund()).to.be.equal(value);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(value);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(initialAmount);
                    
                });

                it("Auction should show end when time expires", async function(){
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture); 
                    const option = {value: ethers.parseUnits(String(defaultStartingPrice),"wei")}
                    await auction.connect(addr1).placeBid(option);
                    await time.increase(defaultDuration)

                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(defaultStartingPrice);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(2);

                    expect(await auction.connect(addr1).placeBid(option)).to.emit(auction, "auctionEndEvent");

                    expect(await auction.getStage()).to.be.equal("Ended");
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(2 * defaultStartingPrice)
                    expect(await auction.connect(addr1).getRefund()).to.be.equal(defaultStartingPrice);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(defaultStartingPrice);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(2);
                    
                });
            })
        });
    });

    // Auction Ended due to an user bid the last amount of tokens
    async function bidEndedFixture() {
        // This will consider of 3 different address where
        // addr1 - ethers bid is divisible by the final price
        // addr2 - ethers bid is not divisible by the final price
        // addr3 - ethers bid ends the bidding with extra amounts
        const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
        // console.log(await ethers.provider.getBalance(addr3.address));
        const middlePrice = (defaultReservePrice + defaultStartingPrice) / 2;
        const halfTotalSupply = (initialAmount / 2) * middlePrice;

        const addr1_payingPrice = halfTotalSupply; 
        const addr2_payingPrice = middlePrice + 1;
        const addr3_payingPrice = halfTotalSupply; 
        await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(addr1_payingPrice),"wei")});
        await time.increase(defaultDuration / 2);
        await auction.connect(addr2).placeBid({value: ethers.parseUnits(String(addr2_payingPrice),"wei")});

        expect(await auction.getStage()).to.be.equal("Started");
        expect(await auction.getTokenLeft()).to.be.equal(initialAmount / 2 - 1);
        await expect(auction.connect(addr2).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
        await expect(auction.connect(addr2).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
        await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
        
        await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(addr3_payingPrice),"wei")});
       
        const clearingPrice: number = Number(await auction.getPrice());
        const addr1_token: number = Math.floor(halfTotalSupply / clearingPrice);
        const addr2_token: number = 1;
        const addr3_token: number = initialAmount - addr1_token - addr2_token;

        expect(await auction.getStage()).to.be.equal("Ended");
        expect(await auction.getTokenLeft()).to.be.equal(0);

        return {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice};
    }; 

    // Case 1: Ending Check all the state changing functions & view functions called after state changing.
    describe("Dutch Auction Distributing Stage (no tokens left triggered by 'placeBid' function) + 'withdrawToken' ,'withdrawOwnerRevenue' function", function(){
        describe("'withdrawTokens' function", function(){
            describe("Succesful", function(){
                it("Should be able show correct token amount without user input refund into internal funds storage if last bidder give extra amount", async function () {      
                    const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                    //console.log(await ethers.provider.getBalance(addr3.address));
                    const middlePrice = (defaultReservePrice + defaultStartingPrice) / 2;
                    const halfTotalSupply = (initialAmount / 2) * middlePrice;
                    await auction.connect(addr1).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")});
                    await time.increase(defaultDuration / 2);
                    await auction.connect(addr2).placeBid({value: ethers.parseUnits(String(middlePrice + 1),"wei")});
                    
                    await checkBalanceTransaction(addr3, auction.connect(addr3).placeBid({value: ethers.parseUnits(String(halfTotalSupply),"wei")}), 0 - halfTotalSupply);
                    
                    const clearingPrice: number = Number(await auction.getPrice());
                    const addr1_token: number = Math.floor(halfTotalSupply / clearingPrice);
                    const addr2_token: number = 1;
                    const addr3_token: number = initialAmount - addr1_token - addr2_token;
                    const refundAmount = BigInt(halfTotalSupply) - BigInt(addr3_token * clearingPrice);
                    
                    // check auction internal refund amount
                    expect(await auction.connect(addr3).getRefund()).to.be.equal(refundAmount);
                    expect(await auction.connect(addr3).getTokens()).to.be.equal(addr3_token);
                    expect(await auction.connect(addr3).getPosition()).to.be.equal(BigInt(addr3_token * clearingPrice));
                    expect(await axelToken.balanceOf(addr3.address)).to.be.equal(0);
                    expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(initialAmount);

                    // Check account balances for auction contract
                    const initialAuctionAmount = await ethers.provider.getBalance(auction.getAddress());
                    // check execution of withdraw funds
                    await checkBalanceTransaction(addr3, auction.connect(addr3).withdrawTokens(), refundAmount);
                    // Check if auction accoount is really reduced;
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAuctionAmount - refundAmount);
                    // check if internal state amount is corrected
                    expect(await auction.connect(addr3).getRefund()).to.be.equal(0); 
                    expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
                    expect(await auction.connect(addr3).getPosition()).to.be.equal(0);
                    expect(await axelToken.balanceOf(addr3.address)).to.be.equal(addr3_token);
                    expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(initialAmount - addr3_token);    
                });
    
                it("Should be able to withdraw the token if wins some token (and check if the refund amount is correct) addr1", async function () {
                    const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
                    // Calculate Expected Refund
                    const expectedRefund =  BigInt(addr1_payingPrice - addr1_token * clearingPrice);
                    
                    // Check Internal State of addr1
                    expect(await auction.connect(addr1).getRefund()).to.be.equal(expectedRefund);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(addr1_payingPrice);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(addr1_token);
    
                    // Check balances of address 1 and auction
                    const initialAuctionAmount = await ethers.provider.getBalance(auction.getAddress());
                    await checkBalanceTransaction(addr1, auction.connect(addr1).withdrawTokens(), expectedRefund);
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAuctionAmount - expectedRefund);    
                    
                    // Check Internal State of addr1 after withdrawer
                    expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                    expect(await auction.connect(addr1).getPosition()).to.be.equal(0);
                    expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
    
                    // Check whether the ERC20 tokens are correct
                    expect(await axelToken.balanceOf(addr1.address)).to.be.equal(addr1_token);
                    expect(await axelToken.balanceOf(owner.address)).to.be.equal(0); // Owner should always be zero
                    expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(initialAmount - addr1_token);
                });
    
                it("Should be able to withdraw the token if wins some token (and check if the refund amount is correct) addr2", async function () {
                    const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
                    // Calculate Expected Refund
                    const expectedRefund =  BigInt(addr2_payingPrice - addr2_token * clearingPrice);
                    // Check Internal State of addr2
                    expect(await auction.connect(addr2).getRefund()).to.be.equal(expectedRefund);
                    expect(await auction.connect(addr2).getPosition()).to.be.equal(addr2_payingPrice);
                    expect(await auction.connect(addr2).getTokens()).to.be.equal(addr2_token);
    
                    // Check balances of address 2 and auction
                    const initialAuctionAmount = await ethers.provider.getBalance(auction.getAddress());
                    await checkBalanceTransaction(addr2, auction.connect(addr2).withdrawTokens(), expectedRefund);
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAuctionAmount - expectedRefund);    
                    
                    // Check Internal State of addr1 after withdrawer
                    expect(await auction.connect(addr2).getRefund()).to.be.equal(0);
                    expect(await auction.connect(addr2).getPosition()).to.be.equal(0);
                    expect(await auction.connect(addr2).getTokens()).to.be.equal(0);
                    
                    // Check whether the ERC20 tokens are correct
                    expect(await axelToken.balanceOf(addr2.address)).to.be.equal(addr2_token);
                    expect(await axelToken.balanceOf(owner.address)).to.be.equal(0); // Owner should always be zero
                    expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(initialAmount - addr2_token);
                });
            });

            describe("Failed to withdraw", function(){
                it("Should not be able to withdraw again", async function () {
                    const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
                     
                    await auction.connect(owner).withdrawOwnerFunds();
                    await auction.connect(addr1).withdrawTokens();
                    await auction.connect(addr2).withdrawTokens();
                    await auction.connect(addr3).withdrawTokens();

                    await checkBalanceTransaction(owner, auction.connect(owner).withdrawOwnerFunds(), 0);
                    await expect(auction.connect(addr1).withdrawTokens()).to.be.revertedWithCustomError(auction, "InvalidWithdrawer");
                    await expect(auction.connect(addr2).withdrawTokens()).to.be.revertedWithCustomError(auction, "InvalidWithdrawer");
                    await expect(auction.connect(addr3).withdrawTokens()).to.be.revertedWithCustomError(auction, "InvalidWithdrawer");
                });

                it("Should not be able to withdraw if I did not bid", async function () {
                    const {axelToken, auction, owner} = await loadFixture(bidEndedFixture);
                    await expect(auction.connect(owner).withdrawTokens()).to.be.revertedWithCustomError(auction, "InvalidWithdrawer");
                });
            });   
        });

        describe("'withdrawOwnerRevenue', function", function(){
            describe("Successful", function(){
                it("Should be able for owner to withdraw bid (revenue)", async function () {
                    const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
                    
                    // Check Balance of auction 
                    const initialAuctionBalances = await ethers.provider.getBalance(auction.getAddress());
                    const expectedOwnerRevenue = (addr1_token + addr2_token + addr3_token) * (clearingPrice);
                    
                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(expectedOwnerRevenue);
                   
                    await checkBalanceTransaction(owner, auction.connect(owner).withdrawOwnerFunds(), expectedOwnerRevenue);
           
                    // Check balance of auction after owner withdraw
                    expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(initialAuctionBalances - BigInt(expectedOwnerRevenue));

                    expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
                });
            });

            describe("Failed to withdraw", function(){
                it("Non Owner Should not able to withdraw owner funds and check owner funds", async function () {
                    const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
                   
                    await expect(auction.connect(addr1).withdrawOwnerFunds()).to.be.revertedWithCustomError(auction, "OnlyOwnerCanCallFunction");
                    await expect(auction.connect(addr1).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "OnlyOwnerCanCallFunction");

                    expect(await axelToken.balanceOf(addr1)).to.be.equal(0);
                    expect(await axelToken.balanceOf(addr2)).to.be.equal(0);
                    expect(await axelToken.balanceOf(addr3)).to.be.equal(0); 
                });
                // non withdrawer again tested before
            });
        });

        it("After all owner and bidders withdraw tokens and funds, auction POV should contains nothing", async function () {
            const {axelToken, auction, owner, addr1, addr2, addr3, clearingPrice, addr1_token, addr2_token, addr3_token, addr1_payingPrice, addr2_payingPrice, addr3_payingPrice} = await loadFixture(bidEndedFixture);
            
            // Check Balance of auction 
            const expectedInitialAuctionBalances =  addr1_payingPrice + addr2_payingPrice + addr3_payingPrice;
            expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(expectedInitialAuctionBalances);

            await auction.connect(owner).withdrawOwnerFunds();

            // Check balance of auction after owner withdraw
            const expectedAuctionBalancesAfterOwnerWithdraw =  expectedInitialAuctionBalances - (addr1_token + addr2_token + addr3_token) * clearingPrice;
            expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(expectedAuctionBalancesAfterOwnerWithdraw);

            await auction.connect(addr1).withdrawTokens();
            await auction.connect(addr2).withdrawTokens();
            await auction.connect(addr3).withdrawTokens();
            
            expect(await ethers.provider.getBalance(auction.getAddress())).to.be.equal(0);
            expect(await axelToken.balanceOf(auction.getAddress())).to.be.equal(0);
        });    
    });
    
    // Case 2: Ending (Check the Clearing Price is correct) (Check the token gain by each people amount is correct)
    describe("Dutch Auction Distributing Stage (no token left naturally when time increase) - view function", function(){
        // This async function involving calculating the clearing Price using binary search
        async function multipleBidderFixture(){
            const {auction, addr1, addr2, owner, startAt} = await loadFixture(startAuctionFixture); 
                
                // calculating all the expected value
                const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
                const oldExpectedClearingPrice = defaultStartingPrice - discountRate * ((defaultDuration) / 2);
    
                const bid1 = oldExpectedClearingPrice * (initialAmount / 2) - (oldExpectedClearingPrice / 2);
                const bid2 = oldExpectedClearingPrice * (initialAmount / 2) + (oldExpectedClearingPrice / 2); 
                const option = {value: ethers.parseUnits(String(bid1), "wei")};
                const option2 = {value: ethers.parseUnits(String(bid2), "wei")};
                
                // Binary search the answer
                var lo = defaultReservePrice;
                var hi = defaultStartingPrice;
                while(lo < hi){
                    var mid = Math.ceil((lo + hi) / 2);
    
                    const tokenSold = Math.floor(bid1 / mid) + Math.floor(bid2 / mid); 
                    if (tokenSold <= initialAmount)
                        hi = mid;
                    else
                        lo = mid + 1;
                }
                const newExpectedPrice = lo; 
                const expectedaddr1TokenAmount = Math.floor(bid1 / newExpectedPrice);
                const expectedaddr2TokenAmount = Math.floor(bid2 / newExpectedPrice);
                // console.log(newExpectedPrice);
    
                await auction.connect(addr1).placeBid(option);
                await auction.connect(addr2).placeBid(option2);

                const expectedClearingTime = startAt + Math.ceil( (defaultStartingPrice - newExpectedPrice) / discountRate);
                return {auction, addr1, addr2, owner, bid1 ,bid2, expectedaddr1TokenAmount, expectedaddr2TokenAmount, newExpectedPrice, expectedClearingTime, discountRate, startAt}            
        };

        describe("Before expires timestamp (Boundary check on view functions + withdraw function called before expires but auction ended)", function(){    
            it("Involving 1 Bidder only", async function () { 
                const {auction, owner, addr1, startAt} = await loadFixture(startAuctionFixture); 

                // Calculation of the expected Value
                const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
                const expectedClearingPrice = Math.floor(defaultStartingPrice - discountRate * ((defaultDuration) / 2));
                const option = {value: ethers.parseUnits(String(expectedClearingPrice * initialAmount), "wei")};

                // Calling placeBid 
                await auction.connect(addr1).placeBid(option);
                
                // The boundary just before auction should end
                await time.increaseTo(startAt + defaultDuration / 2 - 1);
                expect(await auction.getStage()).to.be.equal("Started");
                expect(await auction.getTokenLeft()).to.be.equal(1)
                expect(await auction.getPrice()).to.be.equal(Math.floor(expectedClearingPrice + discountRate));
                await expect(auction.connect(addr1).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(addr1).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");

                await time.increaseTo(startAt + defaultDuration / 2); 
                // Auction ended
                expect(await auction.getStage()).to.be.equal("Ended");
                expect(await auction.getTokenLeft()).to.be.equal(0)
                expect(await auction.getPrice()).to.be.equal(Math.floor(expectedClearingPrice));
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(initialAmount);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(initialAmount * expectedClearingPrice);
                
                // State-changing Function
                await auction.connect(addr1).withdrawTokens();
                await auction.connect(owner).withdrawOwnerFunds();
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
            }); 

            it("Involving > 1 Bidder, non trivial case when calculation of upper bound clearing price due to floor function is needed", async function(){
                const {auction, addr1, addr2, owner, bid1 ,bid2, expectedaddr1TokenAmount, expectedaddr2TokenAmount, newExpectedPrice, expectedClearingTime, discountRate, startAt} = await loadFixture(multipleBidderFixture);      
                
                // The boundary just before auction should end

                await time.increaseTo(expectedClearingTime - 1);

                expect(await auction.getStage()).to.be.equal("Started");
                expect(await auction.getTokenLeft()).to.be.equal(1)
                
                // console.log(newExpectedPrice, discountRate);
                // as the intercetion of the price with the graph of time may not be integer, so direct calculation of discountRate is false.
                const supposedPriceAtIntegerTime = defaultStartingPrice - discountRate * (expectedClearingTime - startAt);
                // console.log(supposedPriceAtIntegerTime)
                const difference = newExpectedPrice - supposedPriceAtIntegerTime; 
                // console.log(difference);
                // This is complex but yet exact calculation by divide the supposed ratio of discountRate
                expect(await auction.getPrice()).to.be.equal(Math.floor(newExpectedPrice +  (discountRate - difference))); 
                // This is a simplier calculation based on the integer point
                expect(await auction.getPrice()).to.be.equal(Math.floor(supposedPriceAtIntegerTime + discountRate)); 
                 
                await expect(auction.connect(addr1).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(addr1).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                
                await time.increaseTo(expectedClearingTime);  
               
                expect(await auction.getStage()).to.be.equal("Ended");
                expect(await auction.getTokenLeft()).to.be.equal(0)
                expect(await auction.getPrice()).to.be.equal(Math.floor(newExpectedPrice));
                expect(await auction.connect(addr1).getRefund()).to.be.equal(bid1 - expectedaddr1TokenAmount * newExpectedPrice );
                expect(await auction.connect(addr1).getTokens()).to.be.equal(expectedaddr1TokenAmount);
                expect(await auction.connect(addr2).getRefund()).to.be.equal(bid2 - expectedaddr2TokenAmount * newExpectedPrice );
                expect(await auction.connect(addr2).getTokens()).to.be.equal(expectedaddr2TokenAmount);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(initialAmount * newExpectedPrice);
                
                // State-changing Function
                await auction.connect(addr1).withdrawTokens();
                await auction.connect(addr2).withdrawTokens();
                await auction.connect(owner).withdrawOwnerFunds();
                
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
                expect(await auction.connect(addr2).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr2).getTokens()).to.be.equal(0);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
            });
        });
        
        describe("After expires timestamp (Withdraw funciton called after expires)", function(){
            it("Involving 1 bidder only", async function () { 
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture); 
        
                const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
                const expectedClearingPrice = Math.floor(defaultStartingPrice - discountRate * ((defaultDuration) / 2));
                const option = {value: ethers.parseUnits(String(expectedClearingPrice * initialAmount), "wei")};
                
                // after auction expires timestamp difference
                await auction.connect(addr1).placeBid(option);
                
                // This is the only difference between previous and this test case
                await time.increase(defaultDuration)
                // Auction ended
                expect(await auction.getStage()).to.be.equal("Ended");
                expect(await auction.getTokenLeft()).to.be.equal(0)
                expect(await auction.getPrice()).to.be.equal(Math.floor(expectedClearingPrice));
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(initialAmount);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(initialAmount * expectedClearingPrice);
                
                // State-changing Function
                await auction.connect(addr1).withdrawTokens();
                await auction.connect(owner).withdrawOwnerFunds();
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
                
            });

            it("Involving > 1 bidder, non trivial case when calculation of upper bound clearing price due to floor function is needed", async function () { 
                const {auction, addr1, addr2, owner, bid1 ,bid2, expectedaddr1TokenAmount, expectedaddr2TokenAmount, newExpectedPrice} = await loadFixture(multipleBidderFixture);      

                await time.increase(defaultDuration); 
        
                expect(await auction.getStage()).to.be.equal("Ended");
                expect(await auction.getTokenLeft()).to.be.equal(0)
                expect(await auction.getPrice()).to.be.equal(Math.floor(newExpectedPrice));
                expect(await auction.connect(addr1).getRefund()).to.be.equal(bid1 - expectedaddr1TokenAmount * newExpectedPrice );
                expect(await auction.connect(addr1).getTokens()).to.be.equal(expectedaddr1TokenAmount);
                expect(await auction.connect(addr2).getRefund()).to.be.equal(bid2 - expectedaddr2TokenAmount * newExpectedPrice );
                expect(await auction.connect(addr2).getTokens()).to.be.equal(expectedaddr2TokenAmount);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(initialAmount * newExpectedPrice);
                
                // State-changing Function
                await auction.connect(addr1).withdrawTokens();
                await auction.connect(addr2).withdrawTokens();
                await auction.connect(owner).withdrawOwnerFunds();
                
                expect(await auction.connect(addr1).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr1).getTokens()).to.be.equal(0);
                expect(await auction.connect(addr2).getRefund()).to.be.equal(0);
                expect(await auction.connect(addr2).getTokens()).to.be.equal(0);
                expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
                
            });
        });
    });

    // Case 3: Ending (Check the burning) and whether 
    describe("Dutch Auction Distributing Stage (Auction Ended after expires timestamp) - Burn token & view function", function(){
        describe("Burn leftover token functionality (Case 3 is the only possible case where burning of tokens are needed)", function(){
            it("token leftover should be burned (all tokens burned)", async function () {
                const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                await time.increase(20 * 60);
                await auction.connect(owner).withdrawOwnerFunds(); 
                await expect(await axelToken.totalSupply()).to.be.equal(0);
            });

            it("token leftover should be burned (partial burned)", async function () {
                const {axelToken, auction, owner, addr1, addr2, addr3} = await loadFixture(startAuctionFixture);
                await time.increase(10 * 60);
                auction.connect(addr1).placeBid({value : ethers.parseUnits("10000", "wei")});
                await time.increase(10 * 60);
                await auction.connect(addr1).withdrawTokens()
                // await auction.connect(owner).transferAllTokens();
                await expect(await axelToken.totalSupply()).to.be.equal(10000 / defaultReservePrice );
                // expect(await auction.connect(owner).getFunds(owner.address)).to.be.equal(10000);
            });
        });

        it("Auction ended with no token left", async function () { 
            const {axelToken, auction, owner, addr3} = await loadFixture(startAuctionFixture);
            const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
            await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(defaultReservePrice * initialAmount), "wei")});
            
            await time.increaseTo(await auction.getExpiresAt() - BigInt(1));
            
            expect( await auction.getStage()).to.be.equal("Started")
            expect(await auction.getTokenLeft()).to.be.equal(1)
            expect(await auction.getPrice()).to.be.equal(Math.floor(defaultReservePrice + discountRate));
            await expect(auction.connect(addr3).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr3).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");

            await time.increase(await auction.getExpiresAt());

            expect(await auction.getStage()).to.be.equal("Ended")
            expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(initialAmount);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(initialAmount * defaultReservePrice);

            await auction.connect(addr3).withdrawTokens();
            await auction.connect(owner).withdrawOwnerFunds();
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);                 
        });

        it("Auction ended with token left", async function () { 
            const {axelToken, auction, owner, addr3} = await loadFixture(startAuctionFixture);
            const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;
            await auction.connect(addr3).placeBid({value: ethers.parseUnits(String(defaultReservePrice * (initialAmount - 2)), "wei")});
            
            
            await time.increaseTo(await auction.getExpiresAt() - BigInt(1));
            
            expect(await auction.getStage()).to.be.equal("Started")
            expect(await auction.getTokenLeft()).to.be.equal(3)
            expect(await auction.getPrice()).to.be.equal(Math.floor(defaultReservePrice + discountRate));
            await expect(auction.connect(addr3).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr3).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");

            await time.increase(await auction.getExpiresAt());

            expect(await auction.getStage()).to.be.equal("Ended")
            expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(initialAmount - 2);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal((initialAmount - 2) * defaultReservePrice);

            await auction.connect(addr3).withdrawTokens();
            await auction.connect(owner).withdrawOwnerFunds();
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
        });

        it("Auction ended with no one place Bid", async function () { 
            const {axelToken, auction, owner, addr3} = await loadFixture(startAuctionFixture);
            const discountRate = (defaultStartingPrice - defaultReservePrice) / defaultDuration;

            await time.increaseTo(await auction.getExpiresAt() - BigInt(1));
            
            expect(await auction.getStage()).to.be.equal("Started")
            expect(await auction.getTokenLeft()).to.be.equal(100)
            expect(await auction.getPrice()).to.be.equal(Math.floor(defaultReservePrice + discountRate));
            await expect(auction.connect(addr3).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(addr3).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");

            await time.increase(await auction.getExpiresAt());

            expect(await auction.getStage()).to.be.equal("Ended")
            expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getPosition()).to.be.equal(0);
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);

            // Calling placeBid after expires will causes internal state of auction to change
            await auction.connect(addr3).placeBid({value : ethers.parseUnits(String(defaultReservePrice), "wei")});
            
            expect(await auction.getStage()).to.be.equal("Ended")
            expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getPosition()).to.be.equal(0);
            expect(await auction.connect(addr3).getRefund()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);

            checkBalanceTransaction(addr3, await auction.connect(addr3).withdrawTokens(), defaultReservePrice); 

            expect(await auction.getStage()).to.be.equal("Ended")
            expect(await auction.getPrice()).to.be.equal(defaultReservePrice);
            expect(await auction.connect(addr3).getPosition()).to.be.equal(0);
            expect(await auction.connect(addr3).getRefund()).to.be.equal(0);
            expect(await auction.connect(addr3).getTokens()).to.be.equal(0);
            expect(await auction.connect(owner).getOwnerRevenue()).to.be.equal(0);
        });
    });
    
    describe("Explicitly test cases", function(){
        // This function explicitly check whether each function cannot be called on certain stage 
        describe("Invalid Function called Check at different Stage", function(){
            it("Invalid Function called at Auction Constructed Stage", async function(){
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
                await expect(auction.connect(addr1).withdrawTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).withdrawOwnerFunds()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage"); 
                await expect(auction.connect(owner).getStartAt()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");         
                await expect(auction.connect(owner).getExpiresAt()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage"); 
            });

            it("Invalid Function called at Auction Started Stage", async function(){
                const {auction, owner, addr1} = await loadFixture(startAuctionFixture);

                await expect(auction.connect(owner).startAuction()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(addr1).withdrawTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).withdrawOwnerFunds()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getRefund()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getTokens()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(owner).getOwnerRevenue()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                
            });

            it("Invalid Function called at Auction Ended Stage", async function(){
                const {auction, owner, addr1} = await loadFixture(bidEndedFixture);
                
                await expect(auction.connect(owner).startAuction()).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
                await expect(auction.connect(addr1).placeBid({value : ethers.parseUnits("0.5", "ether")})).to.be.revertedWithCustomError(auction, "FunctionInvalidAtThisStage");
            });

        });
        
        // Since we have solved the issue, so we replace the previously failed case to current succesful case by commenting out.
        describe("Attack - Solved Security Vulnerability", function(){
            it("Attack 1 - Owner withdraw Tokens after auction started", async function () {
                const {axelToken, auction, owner, addr1, addr2} = await loadFixture(startAuctionFixture);
                
                // Solved 
                await expect(axelToken.connect(owner).transfer(addr1, 20)).to.be.reverted;
                
                // Previously failed case
                /* 
                await axelToken.connect(owner).transfer(addr1, 20) 
                await time.increase(10 * 60);
                await auction.connect(addr2).placeBid({value : ethers.parseUnits("500000", "wei")}); // addr2 buy all tokens
                await time.increase(10 * 60);
                await auction.connect(owner).transferAllTokens(); 
                await expect(axelToken.balanceOf(addr2.address)).to.be.equal(100);
                */
            });

            it("Attack 2 - Reentry Attack (WithdrawTokens)", async function(){
                const {axelToken, auction, owner, addr1, addr2} = await loadFixture(startAuctionFixture);
                
                const attackerContract = await ethers.deployContract("Attacker", [auction.getAddress()], addr2);
                await attackerContract.waitForDeployment(); 

                // addr2 is the attacker
                const attacker = addr2;
                const payValue = (initialAmount / 2) * defaultStartingPrice;
                const option1 = {value : ethers.parseUnits( String(payValue), "wei" )};
                const option2 = {value : ethers.parseUnits( String(payValue + payValue / 2), "wei" )}; // additional one value to getRefund;
                await auction.connect(addr1).placeBid(option1);
                await attackerContract.connect(attacker).placeBid(option2);
                const refundAmount = await attackerContract.getRefund();

                // The reason of using to.be.reverted instead of reverted with custom error is because the 'transfer' function have gas cost limit of 2100
                await expect(attackerContract.connect(attacker).attack()).to.be.reverted;     
                expect(await ethers.provider.getBalance(attackerContract.getAddress())).to.be.equal(0); 

                // If reentry attack is succesful, then this should executed with the ability to suck out a lot of money
                // await attackerContract.connect(attacker).attack()
                // console.log(await ethers.provider.getBalance(attackerContract.getAddress()), refundAmount);

                /*
                Code changes in DutchAuction.sol
                    // if (refund > 0) {
                    //     (bool success, ) = msg.sender.call{value: refund}("");// for reentry attack
                    //     if (!success) revert InvalidWithdrawer();
                    // }
                */
            });

            it("Attack 3 - Yet another reentry attack (placeBid)", async function(){
                // Not yet valid anymore
                // Previous design, extra last bid is immediately refund. However, this have security vulnerability

                const {axelToken, auction, owner, addr1, addr2} = await loadFixture(startAuctionFixture);
                
                const attackerContract = await ethers.deployContract("Attacker", [auction.getAddress()], addr2);
                await attackerContract.waitForDeployment(); 

                // addr2 is the attacker
                const attacker = addr2;
                const payValue = (initialAmount / 2) * defaultStartingPrice;
                const option1 = {value : ethers.parseUnits( String(payValue), "wei" )};
                const option2 = {value : ethers.parseUnits( String(payValue + 1), "wei" )}; // additional one value to getRefund;
                await auction.connect(addr1).placeBid(option1);
                await attackerContract.connect(attacker).placeBid(option2);
                expect(await ethers.provider.getBalance(attackerContract.getAddress())).to.be.equal(0);

                // Previous implement will possibility causes infinity loop
                // console.log(await ethers.provider.getBalance(attackerContract.getAddress()));
                /*
                    (bool success, ) = msg.sender.call{value: refund}("Fallback");// for reentry attack
                    if (!success) revert InvalidWithdrawer();
                */
            });
        });
    });
});