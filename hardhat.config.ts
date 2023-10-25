import { HardhatUserConfig } from "hardhat/config";
import helpers from "@nomicfoundation/hardhat-toolbox/network-helpers";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  paths: {
    artifacts: "./src/artifacts",
  },
  networks: {
    hardhat: {
      // specify a unique identifier for the blockchain network. A chainId helps in preventing replay attacks where a transaction valid on one network could be broadcast on another network. The value 1337 is commonly used for local development networks.
      chainId: 1337,
    }
    /**
     * The following is an example of a configuration for the Ropsten testnet. You can uncomment it and replace the URL and accounts with your own.
     * ropsten: {
     * url: "https://ropsten.infura.io/v3/YOUR-PROJECT-ID",
     * accounts: [`0x${process.env.ACCOUNT_PRIVATE_KEY}`]
     * }
     */
  }
};

export default config;
