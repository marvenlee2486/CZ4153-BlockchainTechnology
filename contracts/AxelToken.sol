// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/*
What is ERC20 token? Watch this video to understand:
https://www.youtube.com/watch?v=cqZhNzZoMh8

Documentation:
https://docs.openzeppelin.com/cGLDToken.balanceOfontracts/2.x/erc20
*/

contract AxelToken is ERC20, ERC20Burnable {
    constructor(uint256 initialSupply) ERC20("Axel", "AXL") {
        _mint(msg.sender, initialSupply);
    }
}


