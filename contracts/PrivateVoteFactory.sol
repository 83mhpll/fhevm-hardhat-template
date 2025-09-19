// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PrivateVote} from "./PrivateVote.sol";

/// @title PrivateVoteFactory
/// @author fhevm-private-vote
/// @notice Minimal factory allowing anyone to create a new PrivateVote instance with a custom number of options,
///         plus lightweight on-chain metadata for question and option labels.
contract PrivateVoteFactory {
    /// @dev Thrown when options length is not within [2..8].
    error InvalidOptionsCount();
    /// @dev Thrown when an invalid poll id is provided.
    error BadPollId();

    struct PollMeta {
        address poll;
        address creator;
        uint8 optionsCount;
        string question;
        string[] options;
    }

    PollMeta[] private _polls;

    event PollCreated(
        uint256 indexed id,
        address indexed poll,
        address indexed creator,
        uint8 optionsCount,
        string question
    );

    /// @notice Create a new encrypted poll
    /// @param question Human-readable question text
    /// @param options Plaintext option labels (2..8)
    /// @return poll The deployed PrivateVote address
    /// @return id The poll id inside the factory
    function createPoll(string memory question, string[] memory options) external returns (address poll, uint256 id) {
        if (options.length < 2 || options.length > 8) revert InvalidOptionsCount();

        PrivateVote pv = new PrivateVote(uint8(options.length));
        poll = address(pv);
        id = _polls.length;

        _polls.push();
        PollMeta storage m = _polls[id];
        m.poll = poll;
        m.creator = msg.sender;
        m.optionsCount = uint8(options.length);
        m.question = question;
        for (uint256 i = 0; i < options.length; ++i) {
            m.options.push(options[i]);
        }

        emit PollCreated(id, poll, msg.sender, m.optionsCount, question);
    }

    /// @notice Total number of polls created
    function getPollsCount() external view returns (uint256) {
        return _polls.length;
    }

    /// @notice Return poll metadata
    function getPoll(
        uint256 id
    )
        external
        view
        returns (address poll, address creator, uint8 optionsCount, string memory question, string[] memory options)
    {
        if (id >= _polls.length) revert BadPollId();
        PollMeta storage m = _polls[id];
        return (m.poll, m.creator, m.optionsCount, m.question, m.options);
    }
}
