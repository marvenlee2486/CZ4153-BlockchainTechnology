// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/*
What is ERC20 token? Watch this video to understand:
https://www.youtube.com/watch?v=cqZhNzZoMh8

Documentation:
https://docs.openzeppelin.com/cGLDToken.balanceOfontracts/2.x/erc20
*/

contract AxelToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Axel", "AXL") {
        _mint(msg.sender, initialSupply);
    }
}



