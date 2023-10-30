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
    mapping(address => uint256) private funds; 

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
        funds[owner] = clearingPrice * (tokenAmount - tokenLeft);
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
            funds[buyer] = refund;
            nextStage();
        }
        _updateTokenAmount();
    }

    function _withdrawTokens (address buyer) private timedTransitions atStage(Stages.AuctionEnded){
        if (buyersPosition[buyer] == 0) revert InvalidWithdrawer();
        // require(buyersPosition[buyer] > 0, "You did not submit a valid bid or you have withdrawn your token");
        
        uint256 bid = buyersPosition[buyer];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //clear records and transfer token to buyer
        buyersPosition[buyer] = 0;
        token.transfer(buyer, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (refund > 0) funds[buyer] += refund;

        //transfer eth to seller
        //payable(owner).transfer(amountPaid);
    }

    function withdrawTokens (address buyer) public timedTransitions atStage(Stages.AuctionEnded){

        if (msg.sender != owner && buyer != msg.sender)
            revert InvalidWithdrawer();
            //require(buyer == msg.sender, "Only owner of auction can withdraw tokens on winners behalf");
        else 
            buyer = msg.sender;

        if (buyersPosition[buyer] == 0) revert InvalidWithdrawer();
        //require(buyersPosition[buyer] > 0, "You did not submit a valid bid or you have withdrawn your token");
        
        uint256 bid = buyersPosition[buyer];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //clear records and transfer token to buyer
        buyersPosition[buyer] = 0;
        token.transfer(buyer, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (refund > 0) funds[buyer] += refund;
        //funds[owner] += amountPaid;
        //transfer eth to seller
        //payable(owner).transfer(amountPaid);
    }

    function transferAllTokens() external onlyOwner() timedTransitions atStage(Stages.AuctionEnded){
        for (uint256 i = 0; i < buyers.length; i++)
            if (buyersPosition[buyers[i]] > 0) 
                _withdrawTokens(buyers[i]);
    }
    
    // SHOULD WE LIMIT getFUNDS AND WITDRAWFUNDS? TODO and TOASK
    function getFunds(address addr) external view returns (uint256) {
        return funds[addr];
    }

    function withdrawFunds() external{
        if( funds[msg.sender] == 0) revert InvalidWithdrawer();
        // require(funds[msg.sender] > 0, "Do not have enough funds to withdraw"); 
        // to prevent recentry attack
        uint256 amount = funds[msg.sender];
        funds[msg.sender] = 0; 

        payable(msg.sender).transfer(amount);
        // in this way an attack would only cause its own withdrawal to failed.
        // TODO Think see need to require here or not to see if transfer is success.
    }
}
