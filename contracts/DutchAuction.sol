// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

// TODO REFACTOR
// 1. REFACTOR the update logic as its cost a lot of gas if everytime it is revoked (considered caching it)
// 2. REFACTOR the require to be revert with Custom error (require will return error(string) that actually cost more)
// 3. REFACTOR Changed the logic into state machine pattern using enum.  for better practice and readlibility.
// 4. Add proper documentation -  https://docs.soliditylang.org/en/develop/natspec-format.html (unfortunately it is part of the grading tho haha)
// 5. REFACTOR to Safe Math

// Functionality needed
// 1. Refund cases - I put 10 dollar, but the price is 7 .. so essentially, I get 1 token only .. and 3 ether refund 


// For presentation purpose
// 1. Mentioned that the discount rate is calculated based on duration ... (Bs on this)
// 2. Mentioned how we handle with the updates.address
contract DutchAuction {
    ERC20Burnable public immutable token;
    uint256 public immutable tokenAmount;
    uint256 public tokenLeft;

    address public immutable owner;
    address[] private buyers;
    mapping(address => uint256) private buyersPosition; //address, value ETH to commit

    uint256 public immutable startingPrice;
    uint256 public immutable reservePrice; 
    uint256 public immutable discountRate;
    
    uint256 public immutable startAt;
    uint256 public immutable expiresAt;
    
    bool auctionEndedEarly = false;
    bool hasBurnedUnsoldTokens = false;
    uint256 revenue = 0;
    
    // TODO add token amount, I think it would be best for user to choose how many token instead of all token is bid
    // TODO do we actually need duration as parameter? I know it is better but the documentation said that 20 mins

    constructor(uint256 _startingPrice, uint256 _reservePrice, address _token, uint256 _duration) {
        require(_startingPrice >= _reservePrice, "Starting price must be equal / larger than ending price");
        require(_reservePrice > 0 , "Reserve price must be more than 0");
        require(_duration > 0, "Duration must be more than 0");
        require(ERC20Burnable(_token).totalSupply() > 0, "Invalid ERC-20 token address");
        require(ERC20Burnable(_token).balanceOf(msg.sender) > 0, "You do not have token balance");

        owner = msg.sender;

        token = ERC20Burnable(_token);
        tokenAmount = token.balanceOf(owner);
        tokenLeft = tokenAmount;

        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        discountRate = (startingPrice - reservePrice) / _duration;

        startAt = block.timestamp;
        expiresAt = block.timestamp + _duration;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    function getPrice() public view returns (uint256) {
        if (auctionEndedEarly || block.timestamp >= expiresAt) 
            return Math.max(revenue / tokenAmount, reservePrice);
        else
            return startingPrice - discountRate * (block.timestamp - startAt);
    }

    function getTokenLeft() external returns (uint256) {
        _updateTokenAmount();
        return tokenLeft;
    }

    function getPosition() external view returns (uint256) {
        return buyersPosition[msg.sender];
    }

    function _updateTokenAmount() internal{
        uint256 currentPrice = getPrice();
        tokenLeft = tokenAmount;
        
        for (uint256 i = 0; i < buyers.length; i++) 
            tokenLeft -= buyersPosition[buyers[i]] * currentPrice;

        if (tokenLeft <= 0) 
            auctionEndedEarly = true;
    }

    function placeBid() external payable {
        uint256 currentPrice = getPrice();
        _updateTokenAmount();

        require(block.timestamp < expiresAt && !auctionEndedEarly, "Auction has ended");
        require(msg.value >= currentPrice, "Bid is too low");

        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0) buyers.push(buyer); //new buyer

        uint256 bid = Math.max(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
        revenue += bid;

        uint256 refund = msg.value - bid;
        if (refund > 0) payable(buyer).transfer(refund);

        _updateTokenAmount();
    }

    function withdrawTokens (address buyer) public{
        if (msg.sender != owner)
            require(buyer == address(0), "Only owner of auction can withdraw tokens on winners behalf");
        else 
            buyer = msg.sender;

        require(block.timestamp > expiresAt || auctionEndedEarly, "Auction is still ongoing");
        require(buyersPosition[buyer] > 0, "You did not submit a valid bid or you have withdrawn your token");

        uint256 clearingPrice = getPrice();
        uint256 bid = buyersPosition[buyer];
        uint256 tokenBought = bid / clearingPrice;
        uint256 amountPaid = tokenBought * clearingPrice;

        //make sure that unsold tokens has been burned
        if (!hasBurnedUnsoldTokens) _burnUnusedToken();

        //clear records and transfer token to buyer
        buyersPosition[buyer] = 0;
        token.transferFrom(owner, buyer, tokenBought);

        //refund
        uint256 refund = bid - amountPaid;
        if (refund > 0) payable(buyer).transfer(refund);

        //transfer eth to seller
        payable(owner).transfer(amountPaid);
    }

    function transferAllTokens() external onlyOwner(){
        require(block.timestamp > expiresAt || auctionEndedEarly, "Auction is still ongoing");
        for (uint256 i = 0; i < buyers.length; i++)
            if (buyersPosition[buyers[i]] > 0) 
                withdrawTokens(buyers[i]);
    }

    function _burnUnusedToken() internal{
        require(!hasBurnedUnsoldTokens, "Unsold token has been burnt");
        token.burnFrom(owner, tokenLeft);
        hasBurnedUnsoldTokens = true;
    }
}
