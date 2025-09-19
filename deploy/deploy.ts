import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);

  // Deploy a default PrivateVote with 2 options for convenience if not present
  // Allow reexec skip by tag control; ignore failures if already deployed
  try {
    const deployedPrivateVote = await deploy("PrivateVote", {
      from: deployer,
      log: true,
      args: [2],
    });
    console.log(`PrivateVote contract: `, deployedPrivateVote.address);
  } catch (e) {
    console.warn("PrivateVote deploy skipped:", (e as Error).message);
  }

  // Deploy factory
  try {
    const deployedFactory = await deploy("PrivateVoteFactory", {
      from: deployer,
      log: true,
    });
    console.log(`PrivateVoteFactory contract: `, deployedFactory.address);
  } catch (e) {
    console.warn("PrivateVoteFactory deploy skipped:", (e as Error).message);
  }

  // Deploy RatingFactory
  try {
    const deployedRatingFactory = await deploy("RatingFactory", {
      from: deployer,
      log: true,
    });
    console.log(`RatingFactory contract: `, deployedRatingFactory.address);
  } catch (e) {
    console.warn("RatingFactory deploy skipped:", (e as Error).message);
  }
};
export default func;
func.id = "deploy_fheCounter"; // id required to prevent reexecution
func.tags = ["FHECounter", "PrivateVote", "PrivateVoteFactory", "RatingFactory"];
