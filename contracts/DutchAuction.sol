// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";
import "./ErrorDutchAuction.sol";
// TODO REFACTOR
// 1. REFACTOR the update logic as its cost a lot of gas if everytime it is revoked (considered caching it)
// 2. REFACTOR the require to be revert with Custom error (require will return error(string) that actually cost more)
// 4. Add proper documentation -  https://docs.soliditylang.org/en/develop/natspec-format.html (unfortunately it is part of the grading tho haha)
// 5. REFACTOR to Safe Math

// For presentation purpose
// 1. Mentioned that the discount rate is calculated based on duration ... (Bs on this)
// 2. Mentioned how we handle with the updates.address

contract DutchAuction {
    event TokenLeft(
        uint256 tokenleft
    );

    enum Stages {
        AuctionConstructed,
        AuctionStarted,
        RevealClearingPrice,
        AuctionEnded
    }

    ERC20Burnable public immutable token;
    uint256 public immutable tokenAmount;
    uint256 public tokenLeft;

    address public immutable owner;
    address[] private buyers;

    mapping(address => uint256) private buyersPosition; //address, value ETH to commit
    // mapping(address => uint256) private funds; 
    uint256 public ownerFunds;
    uint256 public immutable startingPrice;
    uint256 public immutable reservePrice; 
    uint256 public immutable discountRate;
    uint256 public clearingPrice;
    uint256 public startAt;
    uint256 public expiresAt;
    uint256 public immutable duration;
    
    Stages public stage = Stages.AuctionConstructed;
    uint256 revenue = 0;
    
    // TODO add token amount, I think it would be best for user to choose how many token instead of all token is bid
    // TODO do we actually need duration as parameter? I know it is better but the documentation said that 20 mins
    modifier atStage(Stages stage_) {
        if (stage != stage_)
            revert FunctionInvalidAtThisStage();
        _;
    }

    modifier auctionStart(){
        if (stage == Stages.AuctionConstructed) 
            revert FunctionInvalidAtThisStage();
        _;
    }

    function _burnUnusedToken() internal{
        _updateTokenAmount();
        token.burn(tokenLeft);
    }

    function _revealClearingPrice() internal{
        // TODO Delete when fractional issue solved
        if (block.timestamp >= expiresAt)
            clearingPrice = reservePrice;
        else 
            clearingPrice = getPrice();
        _updateTokenAmount(); 
        // console.log(clearingPrice);
        // funds[owner] = clearingPrice * (tokenAmount - tokenLeft);
        ownerFunds = clearingPrice * (tokenAmount - tokenLeft); 
    }
    
    function nextStage() internal {
        stage = Stages(uint(stage) + 1);
        if (stage == Stages.RevealClearingPrice){
            _revealClearingPrice(); 
            nextStage();
            _burnUnusedToken();
        }
    }

    // Perform timed transitions. Be sure to mention
    // this modifier first, otherwise the guards
    // will not take the new stage into account.
    modifier timedTransitions() {
        if (stage == Stages.AuctionStarted && block.timestamp >= expiresAt)
            nextStage();
        // The other stages transition by transaction
        _;
    }

    constructor(uint256 _startingPrice, uint256 _reservePrice, address _token, uint256 _duration) {
        if(_startingPrice < _reservePrice || _reservePrice == 0 || _duration == 0 || ERC20Burnable(_token).totalSupply() == 0)
            revert ConstructorInvalidInput();

        owner = msg.sender;

        token = ERC20Burnable(_token);
        tokenAmount = token.balanceOf(owner);
        tokenLeft = tokenAmount;

        duration = _duration;

        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        discountRate = (startingPrice - reservePrice) / duration;
    }

    modifier onlyOwner() {
        if(msg.sender != owner)
            revert OnlyOwnerCanCallFunction();
        // require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    function startAuction() public onlyOwner atStage(Stages.AuctionConstructed){
        token.transferFrom(owner, address(this), tokenAmount);
        // require(token.transferFrom(owner, address(this), tokenAmount), "Token transfer failed");
        
    
        startAt = block.timestamp;
        expiresAt = block.timestamp + duration;
        
        nextStage();
    }   

    function getPrice() public auctionStart view returns (uint256) {
        // WORK AROUND TODO DELETE WHEN Floating point issue is solved
        if (block.timestamp >= expiresAt)
            return reservePrice;
        //
        if (stage == Stages.AuctionEnded)
            return clearingPrice;
        else
            return startingPrice - discountRate * (block.timestamp - startAt);
    }

    function getTokenLeft() external auctionStart returns (uint256) {
        _updateTokenAmount();
        emit TokenLeft(tokenLeft);
        return tokenLeft;
    }

    function getPosition() external auctionStart view returns (uint256) {
        return buyersPosition[msg.sender];
    }

    function _updateTokenAmount() internal{
        // require(auctionStarted, "Auction has not started");
        
        uint256 currentPrice = getPrice();
        
        int256 tempTokenLeft = int(tokenAmount);
        
        for (uint256 i = 0; i < buyers.length; i++) 
            tempTokenLeft -= int(buyersPosition[buyers[i]] / currentPrice);
        
        if (tempTokenLeft <= 0) {
            tokenLeft = 0;
        }
        else {
            tokenLeft = uint(tempTokenLeft);
        }
    }

    function placeBid() external payable timedTransitions atStage(Stages.AuctionStarted) {
        
        uint256 currentPrice = getPrice();
        if(msg.value < currentPrice) revert InvalidBidValue();

        _updateTokenAmount();
        

        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0) buyers.push(buyer); //new buyer
        // console.log(tokenLeft);
        // console.log(currentPrice);
        // console.log(msg.value);
        uint256 bid = Math.min(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
        revenue += bid;
        
        uint256 refund = msg.value - bid;
        if (refund > 0) {
            // funds[buyer] = refund; // TODO Maybe this is ok? because if msg.sender is malicious, it only affect herself.
            //
            payable(msg.sender).transfer(refund);
            nextStage();
        }
        _updateTokenAmount();
    }

    function withdrawTokens () public timedTransitions() atStage(Stages.AuctionEnded){
        if (buyersPosition[msg.sender] == 0) revert InvalidWithdrawer();
        //require(buyersPosition[buyer] > 0, "You did not submit a valid bid or you have withdrawn your token");
        
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //clear records and transfer token to buyer
        buyersPosition[msg.sender] = 0;
        token.transfer(msg.sender, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (refund > 0) payable(msg.sender).transfer(refund);
    }

    function withdrawBid() external onlyOwner() timedTransitions() atStage(Stages.AuctionEnded){
        if (ownerFunds == 0) revert InvalidWithdrawer();
        ownerFunds = 0;
        payable(owner).transfer(ownerFunds);
    }
}
