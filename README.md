# Instructions to run the solution

Install latest lts version of node using nvm: nvm install node --lts
If already installed: nvm use --lts

1. npm install
2. To produce abi code of the latest contract that will interact with frontend, run: 
```
npx hardhat compile
```

3. Setup local eth blockchain network using node. It will provide pre-funded accounts also.: 
```
npx hardhat node
```

4. Run the frontend code
```
npm run dev
```

# Development
## Test Case Report
To run the test case report together with the reported gas used, run
```
REPORT_GAS=true npx hardhat test
```

## coverage report
To run the coverage report, you may run npx hardhat coverage
```
npx hardhat coverage --solcoverjs ./.solcover.js
```
You may find the coverage report under coverage folder

