# Instructions to run the solution

Install latest lts version of node using nvm: nvm install node --lts
If already installed: nvm use --lts

1. npm install
2. To produce abi code of the latest contract that will interact with frontend, run: npx hardhat compile
3. Setup local eth blockchain network using node. It will provide pre-funded accounts also.: npx hardhat node
4. Open a new terminal and deploy our script on the hardhat local network that we just created: npx hardhat run scripts/deployAxelToken.ts --network localhost
5. Compile contracts, save artifact to frontend. npx hardhat compile

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


```
npx hardhat coverage --solcoverjs ./.solcover.js
```

```
REPORT_GAS=true npx hardhat test
```

```
npm run dev
```

```
npx hardhat 
```