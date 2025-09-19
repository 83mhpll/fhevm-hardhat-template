// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title RatingItem - encrypted rating item (1..5 by default)
/// @notice Stores encrypted sum and count of ratings. Average is computed off-chain after user decryption.
contract RatingItem is SepoliaConfig {
    error InvalidBounds();

    string public name;
    string public description;
    address public creator;
    address public factory;

    uint8 public minScore;
    uint8 public maxScore;
    uint256 public revealFee = 0.0005 ether; // 0.0005 ETH per reveal

    euint32 private _sum;
    euint32 private _count;

    constructor(string memory _name, string memory _description, uint8 _min, uint8 _max) {
        if (!(_min >= 1 && _max >= _min && _max <= 10)) revert InvalidBounds();
        name = _name;
        description = _description;
        creator = msg.sender;
        factory = msg.sender; // Factory deploys this contract
        minScore = _min;
        maxScore = _max;
    }

    /// @notice Submit an encrypted rating
    function rate(externalEuint32 inputScore, bytes calldata inputProof) external {
        euint32 v = FHE.fromExternal(inputScore, inputProof);

        // Clamp to [minScore, maxScore]
        euint32 minE = FHE.asEuint32(minScore);
        euint32 maxE = FHE.asEuint32(maxScore);
        euint32 clamped = FHE.min(FHE.max(v, minE), maxE);

        _sum = FHE.add(_sum, clamped);
        _count = FHE.add(_count, FHE.asEuint32(1));

        FHE.allowThis(_sum);
        FHE.allowThis(_count);
        FHE.allow(_sum, msg.sender);
        FHE.allow(_count, msg.sender);
    }

    function getSum() external view returns (euint32) {
        return _sum;
    }

    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Grant read permission to a reader for both sum and count (with fee)
    function allowAllTo(address reader) external payable {
        require(msg.value >= revealFee, "Insufficient reveal fee");

        FHE.allow(_sum, reader);
        FHE.allow(_count, reader);

        // Transfer fee to factory
        if (factory != address(0)) {
            payable(factory).transfer(msg.value);
        }
    }

    function updateRevealFee(uint256 _revealFee) external {
        require(msg.sender == factory, "Only factory can update fee");
        revealFee = _revealFee;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
