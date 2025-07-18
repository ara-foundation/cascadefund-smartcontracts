// contracts/TestToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(address hodler, string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(hodler, 100_000 * 10 ** 18);
    }
}