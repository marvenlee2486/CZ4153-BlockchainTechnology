const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const assert = require('assert');

// TODO ADD Documentation
describe("Token contract", function () {
  const initialAmount: number = 100;
  async function deployTokenFixture() {
    const [owner, addr1, buyer] = await ethers.getSigners();
    const axelToken = await ethers.deployContract("AxelToken", [initialAmount], owner);
    await axelToken.waitForDeployment();

    // Fixtures can return anything you consider useful for your tests
    return { axelToken, owner, addr1, buyer};
  }

  it("Should assign the total supply of tokens to the owner initially", async function () {
    const { axelToken, owner } = await loadFixture(deployTokenFixture);
    const ownerBalance = await axelToken.balanceOf(owner.address);
    assert.equal(ownerBalance, initialAmount);
    //expect(await ownerBalance.to.equal(initialAmount));
    expect(await axelToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should be able to approve by owner ('approve' method) and transfer to buyer", async function () {
    const { axelToken, owner, addr1, buyer } = await loadFixture(deployTokenFixture);
    await axelToken.connect(owner).approve(addr1.address, 10);
    expect(await axelToken.allowance(owner.address, addr1.address)).to.equal(10);

    await axelToken.connect(addr1).transferFrom(owner.address, buyer.address, 10);

    expect(await axelToken.balanceOf(owner.address)).to.equal(initialAmount - 10);
    expect(await axelToken.balanceOf(buyer.address)).to.equal(10); 
    expect(await axelToken.allowance(owner.address, addr1.address)).to.equal(0);
  });
  
  it("Should be able to transfer the tokens from owner 'transfer' methods", async function () {
    const { axelToken, owner, addr1 } = await loadFixture(deployTokenFixture);
    
    await axelToken.connect(owner).transfer(addr1.address, 10)
    
    expect(await axelToken.balanceOf(owner.address)).to.equal(initialAmount - 10);
    expect(await axelToken.balanceOf(addr1.address)).to.equal(10);
  });

  it("Should be able to burn the tokens ('burn' and 'burn from' methods)", async function () {
    const { axelToken, owner, addr1 } = await loadFixture(deployTokenFixture);
    
    await axelToken.connect(owner).burn(10);

    var ownerBalance = await axelToken.balanceOf(owner.address);
    expect(await axelToken.totalSupply()).to.equal(ownerBalance);
    expect(ownerBalance).to.equal(initialAmount - 10);

    await axelToken.connect(owner).approve(addr1.address, 10);
    await axelToken.connect(addr1).burnFrom(owner.address, 10);
    ownerBalance = await axelToken.balanceOf(owner.address);
    expect(await axelToken.totalSupply()).to.equal(ownerBalance);
    expect(ownerBalance).to.equal(initialAmount - 20);
  });

  it("Should not be able to transfer the tokens if not approved", async function () {
    const { axelToken, owner, addr1, buyer} = await loadFixture(deployTokenFixture);
   
    await expect(axelToken.connect(addr1).transferFrom(owner.address, buyer.address, 10)).to.be.revertedWithCustomError(axelToken, "ERC20InsufficientAllowance")
  });

  it("Should not be able to transfer the tokens if amount not enough", async function () {
    const { axelToken, owner, addr1 } = await loadFixture(deployTokenFixture);

    await expect(axelToken.connect(owner).transfer(addr1, initialAmount + 1)).to.be.revertedWithCustomError(axelToken, "ERC20InsufficientBalance")
  });
});