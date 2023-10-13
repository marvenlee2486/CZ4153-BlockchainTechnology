const MyToken = artifacts.require("AxelToken");
const initialSupply = 10000;

module.exports = function (deployer) {
  deployer.deploy(MyToken, initialSupply);
};