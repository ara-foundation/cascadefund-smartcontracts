import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  defaultNetwork: "baseSepolia",
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_NETWORK!,
      accounts: [process.env.BASE_SEPOLIA_PRIVKEY!],
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY!,
    customChains: [
      {
        network: "baseSepolia",
        chainId: parseInt(process.env.BASE_SEPOLIA_CHAINID!),
        urls: {
          apiURL: `https://api.etherscan.io/v2/api?chainid=${process.env.BASE_SEPOLIA_CHAINID!}`,
          browserURL: `https://sepolia.basescan.org`
        }
      }
    ]
  }
  //

};

export default config;
