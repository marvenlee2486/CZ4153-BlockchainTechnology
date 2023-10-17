// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract DutchAuction {
    IERC20 public immutable token;
    uint256 public immutable tokenAmount;
    uint256 public tokenLeft;

    address payable public immutable seller;
    address[] private buyers;
    mapping(address => uint256) public buyersPosition; //address, value ETH to commit

    uint256 public immutable startingPrice;
    uint256 public immutable reservePrice; 
    uint256 public immutable discountRate;
    
    uint256 public immutable startAt;
    uint256 public immutable expiresAt;
    
    bool auctionEndedEarly = false;
    uint256 revenue = 0;

    constructor(uint256 _startingPrice, uint256 _reservePrice, address _token, uint256 _duration) {
        require(_startingPrice >= _reservePrice, "Starting price must be equal / larger than ending price");
        require(_reservePrice > 0 , "Reserve price must be more than 0");
        require(_duration > 0, "Duration must be more than 0");
        require(IERC20(_token).totalSupply() > 0, "Invalid ERC-20 token address");

        seller = payable(msg.sender);

        token = IERC20(_token);
        tokenAmount = IERC20(_token).totalSupply();
        tokenLeft = tokenAmount;

        startingPrice = _startingPrice;
        reservePrice = _reservePrice;
        discountRate = (reservePrice - startingPrice) / _duration;

        startAt = block.timestamp;
        expiresAt = block.timestamp + _duration;
    }

    function getPrice() public view returns (uint256) {
        return startingPrice - discountRate * (block.timestamp - startAt);
    }

    function updateTokenAmount() internal{
        uint256 currentPrice = getPrice();
        for (uint256 i = 0; i < buyers.length; i++) 
            tokenLeft -= buyersPosition[buyers[i]] * currentPrice;
        if (tokenLeft <= 0) auctionEndedEarly = true;
    }

    function placeBid() external payable {
        uint256 currentPrice = getPrice();
        updateTokenAmount();

        require(block.timestamp < expiresAt && !auctionEndedEarly, "Auction has ended");
        require(msg.value >= currentPrice, "Bid is too low");

        address buyer = msg.sender;
        if (buyersPosition[buyer] == 0) buyers.push(buyer); //new buyer

        uint256 bid = Math.max(tokenLeft * currentPrice, msg.value);
        buyersPosition[buyer] += bid;
        revenue += bid;

        uint256 refund = bid - tokenLeft * currentPrice;
        if (refund > 0) payable(buyer).transfer(refund);

        updateTokenAmount();
    }

    function withdrawTokens() external{
        require(block.timestamp > expiresAt || auctionEndedEarly, "Auction is still ongoing");
        require(buyersPosition[msg.sender] > 0, "You did not submit a valid bid or you have withdrawn your token");

        address buyer = msg.sender;
        uint256 clearingPrice = tokenAmount / revenue;
        uint256 tokenBought = buyersPosition[buyer] / clearingPrice;

        //transfer token
        token.transfer(buyer, tokenBought);

        //refund
        uint256 refund = buyersPosition[buyer] - clearingPrice * tokenBought;
        if (refund > 0)payable(buyer).transfer(refund);

        //clear records
        buyersPosition[buyer] = 0;
    }
}
