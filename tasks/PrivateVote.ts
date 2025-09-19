import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * PrivateVote tasks
 */

task("task:pv:address", "Prints the PrivateVote address").setAction(async function (_args: TaskArguments, hre) {
  const { deployments } = hre;
  const deployed = await deployments.get("PrivateVote");
  console.log("PrivateVote address is " + deployed.address);
});

task("task:pv:deploy", "Deploys PrivateVote with --options <n>")
  .addParam("options", "Number of options (uint8)")
  .setAction(async function (args: TaskArguments, hre) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const n = parseInt(args.options);
    if (!Number.isInteger(n) || n <= 0 || n > 16) throw new Error("--options must be 1..16");

    const deployed = await deploy("PrivateVote", { from: deployer, log: true, args: [n] });
    console.log("PrivateVote:", deployed.address);
  });

task("task:pv:vote", "Cast a private vote: --index <i> [--address <contract>]")
  .addParam("index", "Chosen option index (uint8)")
  .addOptionalParam("address", "Optionally specify the PrivateVote contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const pvDeployment = args.address ? { address: args.address } : await deployments.get("PrivateVote");
    console.log(`PrivateVote: ${pvDeployment.address}`);

    const choice = parseInt(args.index);
    if (!Number.isInteger(choice)) throw new Error("--index must be an integer");

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateVote", pvDeployment.address);

    const encryptedChoice = await fhevm
      .createEncryptedInput(pvDeployment.address, signers[0].address)
      .add32(choice)
      .encrypt();

    const tx = await contract.connect(signers[0]).vote(encryptedChoice.handles[0], encryptedChoice.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:pv:decrypt-all", "Decrypt all tallies [--address <contract>]")
  .addOptionalParam("address", "Optionally specify the PrivateVote contract address")
  .setAction(async function (args: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const pvDeployment = args.address ? { address: args.address } : await deployments.get("PrivateVote");
    console.log(`PrivateVote: ${pvDeployment.address}`);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PrivateVote", pvDeployment.address);

    // Read number of options from chain (via call)
    const numOptions: bigint = await contract.numOptions();
    const counts: number[] = [];

    for (let i = 0n; i < numOptions; i++) {
      const enc = await contract.getTally(Number(i));
      if (enc === ethers.ZeroHash) {
        counts.push(0);
        continue;
      }
      const clear = await fhevm.userDecryptEuint(FhevmType.euint32, enc, pvDeployment.address, signers[0]);
      counts.push(Number(clear));
    }
    console.log("Tallies:", counts);
  });
