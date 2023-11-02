// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "hardhat/console.sol";
import "./ErrorDutchAuction.sol";
// TODO REFACTOR
// 1. REFACTOR the update logic as its cost a lot of gas if everytime it is revoked (considered caching it)
// 4. Add proper documentation -  https://docs.soliditylang.org/en/develop/natspec-format.html (unfortunately it is part of the grading tho haha)
// 5. REFACTOR to Safe Math
// TODO do we actually need duration as parameter? I know it is better but the documentation said that 20 mins

// For presentation purpose
// 1. Mentioned that the discount rate is calculated based on duration ... (Bs on this)
// 2. Mentioned how we handle with the updates.address

contract DutchAuction {
    enum Stages {
        AuctionConstructed,
        AuctionStarted,
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

    // Perform timed transitions. 
    modifier timedTransitions() {
        if (stage == Stages.AuctionStarted && block.timestamp >= expiresAt)
            _nextStage();
        _;
    }

    modifier onlyOwner() {
        if(msg.sender != owner)
            revert OnlyOwnerCanCallFunction();
        _;
    }

    function _nextStage() internal {
        if (stage == Stages.AuctionStarted){
            // Reveal Clearing Price
            _updateTokenLeft(); 
            clearingPrice = getPrice();
            ownerFunds = clearingPrice * (tokenAmount - tokenLeft); 

            // burn unused token
            token.burn(tokenLeft);
        }
        stage = Stages(uint(stage) + 1);
        
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
    
    function _curPrice() atStage(Stages.AuctionStarted) private view returns (uint256){
        return (startingPrice * DECIMAL_PLACE - discountRate * (block.timestamp - startAt)) / DECIMAL_PLACE;
    }
    
    // To be called externally and during revealing price stage only
    function getPrice() auctionStart public view returns (uint256) {

        if (stage == Stages.AuctionEnded){
            return clearingPrice;
        }

        // Doing this to avoid calling getPrice during auctionStart due to long idle and causes math error.
        uint256 currentPrice;
        if (block.timestamp >= expiresAt) currentPrice = reservePrice;
        else currentPrice = (startingPrice * DECIMAL_PLACE - discountRate * (block.timestamp - startAt)) / DECIMAL_PLACE;
        
        if (_calculateTokenSold(currentPrice) >= tokenAmount){
            //binary search 
            uint256 low = currentPrice + 1;
            uint256 high = (address(this).balance - lastBidRefund) / tokenAmount + 1;

            while (low < high){
                uint256 mid = (low + high) / 2;
                // console.log(low, mid, high);
                if (_calculateTokenSold(mid) < tokenAmount) high = mid;
                else low = mid + 1;
            }  
            currentPrice = low - 1;
        }
        return currentPrice;
    }

    // To be called externally and also by updateTokenleft only
    function getTokenLeft() public view returns (uint256) {
        uint256 tokenSold = _calculateTokenSold( _curPrice());
        if(tokenSold > tokenAmount){
            // Consider revert to catch the error TODO
            return 0;
        }
        return tokenAmount - tokenSold;
    }

    function getPosition() external view returns (uint256) {
        return buyersPosition[msg.sender];
    }

    
    function _calculateTokenSold(uint256 price) view internal returns (uint256){
        uint256 tokenSold = 0;
        for (uint256 i = 0; i < buyers.length; i++) 
            tokenSold += uint(buyersPosition[buyers[i]] / price);
        // console.log(tokenSold);
        return tokenSold;
    }
    
    // Make sure to call it during auction start only
    function _updateTokenLeft() internal{
        if(tokenLeft == 0) return; // optimization .. no need to update again if token left is already zero
        tokenLeft = getTokenLeft();
    }

    function placeBid() external payable timedTransitions atStage(Stages.AuctionStarted) {
        uint256 currentPrice = _curPrice();
        if(msg.value < currentPrice) revert InvalidBidValue();

        _updateTokenLeft();
        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0 && tokenLeft > 0) buyers.push(buyer); //new buyer
        uint256 bid = Math.min(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
        
        uint256 refund = msg.value - bid;
        if (refund > 0) {
            lastBidRefund = refund;
            _nextStage();
            lastBidOwner = msg.sender;
        }
    }

    function withdrawTokens () public timedTransitions() atStage(Stages.AuctionEnded){
        if (buyersPosition[msg.sender] == 0) revert InvalidWithdrawer();
        // console.log(buyersPosition[msg.sender]);
        uint256 bid = buyersPosition[msg.sender];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;
        // console.log(tokenBought);
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
     
    function withdrawOwnerFunds() external onlyOwner() timedTransitions() atStage(Stages.AuctionEnded){
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

    function getStage() external view returns(string memory){
        if (stage == Stages.AuctionStarted) return "Started";
        else if (stage == Stages.AuctionEnded) return "Ended";
        return "Unknown Stage";
    }

    function endAuction() public onlyOwner() timedTransitions() atStage(Stages.AuctionStarted){
        _updateTokenLeft();
        if(tokenLeft == 0)
            _nextStage();
    }
}
