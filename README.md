# Basic Sample Hardhat Project with TypeScript

For TypeScript Configuration use this [link](https://hardhat.org/guides/typescript.html)

Below command will compile the contract and generates Typescript typings for contracts
```shell
npx hardhat compile
```

Below command will run TypeScript compiler and convert all TypeScript files to JS and placed them in dist folder
```shell
tsc
```

Below command will deploy contracts on hardhat network
```shell
npx hardhat run dist/scripts/sample-script.js
```

Instructions to run

Install latest lts version of node using nvm: nvm install node --lts
If already installed: nvm use --lts

1. npm install
2. To produce abi code of the latest contract that will interact with frontend, run: npx hardhat compile
3. Setup local eth blockchain network using node. It will provide pre-funded accounts also.: npx hardhat node
4. Open a new terminal and deploy our script on the hardhat local network that we just created: npx hardhat run scripts/deployAxelToken.ts --network localhost

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/sample-script.js
npx hardhat help
```