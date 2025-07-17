// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IResourceConverter {
    function convert(
        uint inAmount, address from, address to
    ) external returns (uint outAmount);
}