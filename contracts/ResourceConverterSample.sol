// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import { ResourceConverter } from "./ResourceConverter.sol";

contract ResourceConverterSample is ResourceConverter {
    
    constructor() {

    }

    /**
     * Convert the inAmount of from tokens to the outAmount of to tokens.
     * @param inAmount amount of tokens that we need to convert
     * @param from the token address
     * @param to the token address
     * @return outAmount amount of tokens that is retreived
     */
    function convert(uint inAmount, address from, address to) external returns (uint outAmount) {

    }
}