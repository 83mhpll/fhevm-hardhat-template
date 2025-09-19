import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("rating:create", "Create a new rating item via RatingFactory")
  .addParam("name", "Item name")
  .addOptionalParam("desc", "Description", "")
  .addOptionalParam("min", "Min score", "1")
  .addOptionalParam("max", "Max score", "5")
  .addOptionalParam("factory", "Factory address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, deployments } = hre;
    const factory = args.factory ? args.factory : (await deployments.get("RatingFactory")).address;
    const signer = (await ethers.getSigners())[0];
    const ratingFactory = await ethers.getContractAt("RatingFactory", factory);
    const tx = await ratingFactory
      .connect(signer)
      .createItem(String(args.name), String(args.desc), parseInt(args.min), parseInt(args.max));
    console.log(`Wait tx: ${tx.hash}...`);
    await tx.wait();
    const count = await ratingFactory.getItemsCount();
    const last = await ratingFactory.getItem(Number(count) - 1);
    console.log("RatingItem:", last[0]);
  });

task("rating:rate", "Rate an item 1..5")
  .addParam("item", "RatingItem address")
  .addParam("score", "Score (1..5)")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    const signer = (await ethers.getSigners())[0];
    await fhevm.initializeCLIApi();
    const item = await ethers.getContractAt("RatingItem", args.item);
    const enc = await fhevm.createEncryptedInput(args.item, signer.address).add32(parseInt(args.score)).encrypt();
    const tx = await item.connect(signer).rate(enc.handles[0], enc.inputProof);
    console.log(`Wait tx: ${tx.hash}...`);
    await tx.wait();
    console.log("Rated!");
  });

task("rating:decrypt", "Decrypt sum/count to get avg")
  .addParam("item", "RatingItem address")
  .setAction(async (args: TaskArguments, hre) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();
    const signer = (await ethers.getSigners())[0];
    const item = await ethers.getContractAt("RatingItem", args.item);
    const sumH = await item.getSum();
    const countH = await item.getCount();
    if (sumH === ethers.ZeroHash || countH === ethers.ZeroHash) {
      console.log("sum=0 count=0 avg=0");
      return;
    }
    const sum = await fhevm.userDecryptEuint(FhevmType.euint32, sumH, args.item, signer);
    const count = await fhevm.userDecryptEuint(FhevmType.euint32, countH, args.item, signer);
    const avg = Number(count) === 0 ? 0 : Number(sum) / Number(count);
    console.log({ sum: Number(sum), count: Number(count), avg });
  });
