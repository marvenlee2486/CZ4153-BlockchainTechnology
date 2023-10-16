// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract DutchAuction {
    address public owner;
    uint public initialPrice;
    uint public priceDecrement;
    uint public auctionEndTime;
    uint public currentPrice;
    address public currentWinner;
    bool public auctionEnded;

    constructor(uint _initialPrice, uint _priceDecrement, uint _duration) {
        owner = msg.sender;
        initialPrice = _initialPrice;
        priceDecrement = _priceDecrement;
        auctionEndTime = block.timestamp + _duration;
        currentPrice = _initialPrice;
        currentWinner = address(0);
        auctionEnded = false;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    modifier onlyBeforeEnd() {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        _;
    }

    modifier onlyAfterEnd() {
        require(block.timestamp >= auctionEndTime, "Auction is still ongoing");
        _;
    }

    function placeBid() public payable onlyBeforeEnd {
        require(msg.value >= currentPrice, "Bid is too low");
        
        if (currentWinner != address(0)) {
            // Refund the previous winner
            payable(currentWinner).transfer(currentPrice);
        }

        currentPrice = currentPrice - priceDecrement;
        currentWinner = msg.sender;
    }

    function finalizeAuction() public onlyOwner onlyAfterEnd {
        require(!auctionEnded, "Auction has already ended");
        
        auctionEnded = true;
        
        if (currentWinner != address(0)) {
            // Transfer the winning bid to the owner
            payable(owner).transfer(address(this).balance);
        }
    }

    function withdraw() public onlyAfterEnd {
        require(auctionEnded, "Auction is still ongoing");
        require(msg.sender != currentWinner, "The current winner cannot withdraw");
        
        uint refundAmount = address(this).balance;
        payable(msg.sender).transfer(refundAmount);
    }
}