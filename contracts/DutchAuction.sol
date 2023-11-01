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
    enum Stages {
        AuctionConstructed,
        AuctionStarted,
        // RevealClearingPrice, TODO Optimization 1.
        AuctionEnded
    }

    ERC20Burnable public immutable token;
    uint256 public tokenAmount;
    uint256 public tokenLeft;

    address public immutable owner;
    address[] private buyers;

    mapping(address => uint256) private buyersPosition; //address, value ETH to commit
    uint256 private lastBidRefund;
    address private lastBidOwner;
    
    uint256 public ownerFunds;

    uint256 public immutable startingPrice;
    uint256 public immutable reservePrice; 
    uint256 public immutable discountRate;
    uint256 public clearingPrice;

    uint256 public startAt;
    uint256 public expiresAt;
    uint256 public immutable duration;

    uint256 public constant DECIMAL_PLACE = 10**10;
    
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
        token.burn(tokenLeft);
    }

    function _revealClearingPrice() internal{
        // TODO Delete when fractional issue solved
        // Clearing Price error ... TODO Think how to resolve ..
        if (block.timestamp >= expiresAt){
            uint256 currentPrice = getPrice();
            clearingPrice = (revenue / currentPrice >= tokenAmount) ? revenue / tokenAmount : reservePrice;
        }
            
        else{
            clearingPrice = getPrice();
        }
            
        _updateTokenLeft(); 
        ownerFunds = clearingPrice * (tokenAmount - tokenLeft); 
    }
    
    function _nextStage() internal {
        if (stage == Stages.AuctionStarted){
            _revealClearingPrice(); 
            _burnUnusedToken();
        }
        stage = Stages(uint(stage) + 1);
        
    }

    // Perform timed transitions. 
    modifier timedTransitions() {
        if (stage == Stages.AuctionStarted && block.timestamp >= expiresAt)
            _nextStage();
        _;
    }

    constructor(uint256 _startingPrice, uint256 _reservePrice, address _token, uint256 _duration) {
        if(_startingPrice < _reservePrice || _reservePrice == 0 || _duration == 0 || ERC20Burnable(_token).totalSupply() == 0)
            revert InvalidAuctionInput();

        owner = msg.sender;
        token = ERC20Burnable(_token);
        duration = _duration;
        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        discountRate = (startingPrice * DECIMAL_PLACE - reservePrice * DECIMAL_PLACE) / duration;
    }

    modifier onlyOwner() {
        if(msg.sender != owner)
            revert OnlyOwnerCanCallFunction();
        _;
    }

    function startAuction() public onlyOwner atStage(Stages.AuctionConstructed){
        tokenAmount = token.allowance(owner, address(this));
        
        if (tokenAmount == 0)
            revert InvalidAuctionInput();
        
        tokenLeft = tokenAmount;
        token.transferFrom(owner, address(this), tokenAmount); // This is to lock the token so owner cannot transfer during auction
        startAt = block.timestamp;
        expiresAt = block.timestamp + duration;
        _nextStage();
    }   
    
    function getPrice() auctionStart public view returns (uint256) {
        uint256 curTime = block.timestamp;
        uint256 currentPrice = (startingPrice * DECIMAL_PLACE - discountRate * (curTime - startAt)) / DECIMAL_PLACE;
        currentPrice = Math.max(currentPrice, reservePrice);
        return (revenue / currentPrice > tokenAmount) ? revenue / tokenAmount : currentPrice;
    }

    function getTokenLeft() external view returns (uint256) {
        return _calculateTokenLeft();
    }

    function getPosition() external view returns (uint256) {
        return buyersPosition[msg.sender];
    }
    
    function _calculateTokenLeft() view internal returns (uint256){
        uint256 currentPrice = getPrice();
        int256 tempTokenLeft = int(tokenAmount);
        for (uint256 i = 0; i < buyers.length; i++) 
            tempTokenLeft -= int(buyersPosition[buyers[i]] / currentPrice);
        
        if (tempTokenLeft <= 0) 
            tempTokenLeft = 0;

        return uint256(tempTokenLeft);
    }
    
    function _updateTokenLeft() internal{
        tokenLeft = _calculateTokenLeft();
    }

    function placeBid() external payable timedTransitions atStage(Stages.AuctionStarted) {
        
        uint256 currentPrice = getPrice();
        if(msg.value < currentPrice) revert InvalidBidValue();

        _updateTokenLeft();
        // Wah this case damn Axel see
        if(tokenLeft == 0){
            // nextStage();
            // return;
            // LETS HAVE CASE STUDY FOR THIS....TOMORROW TO MEET
        }

        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0) buyers.push(buyer); //new buyer
        uint256 bid = Math.min(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
        revenue += bid;
        
        uint256 refund = msg.value - bid;
        if (refund > 0) {
            _nextStage();
            lastBidOwner = msg.sender;
            lastBidRefund = refund;
        }
    }

    function withdrawTokens () public timedTransitions() atStage(Stages.AuctionEnded){
        if (buyersPosition[msg.sender] == 0) revert InvalidWithdrawer();
        
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //clear records and transfer token to buyer
        buyersPosition[msg.sender] = 0;
        token.transfer(msg.sender, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (msg.sender == lastBidOwner) {
            refund += lastBidRefund;
            lastBidRefund = 0;
        }

        if (refund > 0) payable(msg.sender).transfer(refund);
    }
     
    function withdrawBid() external onlyOwner() timedTransitions() atStage(Stages.AuctionEnded){
        if (ownerFunds == 0) return;//revert InvalidWithdrawer(); TODO Think see if withdraw token need or not
        uint withdrawAmount = ownerFunds; // (Security) reentry attack
        ownerFunds = 0;
        payable(msg.sender).transfer(withdrawAmount);
    }

    // Make it only msg.sender can query its own information (privacy)
    function getRefund() external view atStage(Stages.AuctionEnded) returns(uint256){
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;
        uint256 refund = bid - amountPaid;
        if (msg.sender == lastBidOwner) refund += lastBidRefund;
        return refund;
    }

    function getTokens() external view atStage(Stages.AuctionEnded) returns(uint256){
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / clearingPrice;
        return tokenBought;
    }
    
    function getOwnerRevenue() external view onlyOwner() atStage(Stages.AuctionEnded) returns(uint256){
        return ownerFunds;
    }

    // function endAuction() public onlyOwner() atStage(Stages.AuctionStarted){

    // }
}
