const Migrations = artifacts.require("Migrations");
const Lottery = artifacts.require("LotteryTry");
const NFT = artifacts.require("Cryptoducks");


module.exports = function (deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(NFT).then(function () {
    return deployer.deploy(Lottery, NFT.address);
  });
};

