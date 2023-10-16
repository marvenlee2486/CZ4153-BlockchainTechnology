import { ethers } from "hardhat";

async function main() {
  const initialSupply = 10000;
  const token = await ethers.deployContract("AxelToken", [initialSupply]);
  await token.waitForDeployment();

  console.log(
    `AxelToken with ${initialSupply} tokens deployed to ${token.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
