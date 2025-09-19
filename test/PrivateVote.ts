import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { PrivateVote, PrivateVote__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture(options = 2) {
  const factory = (await ethers.getContractFactory("PrivateVote")) as PrivateVote__factory;
  const contract = (await factory.deploy(options)) as PrivateVote;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("PrivateVote", function () {
  let signers: Signers;
  let contract: PrivateVote;
  let address: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This test suite runs only on Hardhat mock env`);
      this.skip();
    }
    ({ contract, address } = await deployFixture(3));
  });

  it("initial tallies are uninitialized", async function () {
    const n = await contract.numOptions();
    for (let i = 0; i < Number(n); i++) {
      const enc = await contract.getTally(i);
      expect(enc).to.eq(ethers.ZeroHash);
    }
  });

  it("alice votes option 1; bob votes option 2", async function () {
    const encAlice = await fhevm.createEncryptedInput(address, signers.alice.address).add32(1).encrypt();
    const tx1 = await contract.connect(signers.alice).vote(encAlice.handles[0], encAlice.inputProof);
    await tx1.wait();

    const encBob = await fhevm.createEncryptedInput(address, signers.bob.address).add32(2).encrypt();
    const tx2 = await contract.connect(signers.bob).vote(encBob.handles[0], encBob.inputProof);
    await tx2.wait();

    // Ensure alice is allowed by the contract to read all tallies
    const txAllow = await contract.allowAllTo(signers.alice.address);
    await txAllow.wait();

    // decrypt tallies for alice (she got access via FHE.allow in contract)
    const n = await contract.numOptions();
    const counts: number[] = [];
    for (let i = 0; i < Number(n); i++) {
      const enc = await contract.getTally(i);
      if (enc === ethers.ZeroHash) {
        counts.push(0);
        continue;
      }
      const clear = await fhevm.userDecryptEuint(FhevmType.euint32, enc, address, signers.alice);
      counts.push(Number(clear));
    }

    expect(counts[0]).to.eq(0);
    expect(counts[1]).to.eq(1);
    expect(counts[2]).to.eq(1);
  });
});
