// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RatingItem} from "./RatingItem.sol";

contract RatingFactory {
    struct ItemMeta {
        address item;
        address creator;
        uint8 min;
        uint8 max;
        string name;
        string description;
        bool isPromoted;
        uint256 promoteExpiry;
    }
    ItemMeta[] private _items;

    address public owner;
    uint256 public creationFee = 0.001 ether; // 0.001 ETH per item creation
    uint256 public promoteFee = 0.01 ether; // 0.01 ETH for 7 days promotion
    uint256 public promoteDuration = 7 days;

    mapping(address => bool) public promotedItems;

    event ItemCreated(uint256 indexed id, address indexed item, address indexed creator, string name, uint256 fee);
    event ItemPromoted(uint256 indexed id, address indexed item, uint256 expiry, uint256 fee);
    event FeesUpdated(uint256 creationFee, uint256 promoteFee);
    event Withdrawal(address indexed owner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function createItem(
        string memory name,
        string memory description,
        uint8 minScore,
        uint8 maxScore
    ) external payable returns (address item, uint256 id) {
        require(msg.value >= creationFee, "Insufficient creation fee");

        RatingItem r = new RatingItem(name, description, minScore, maxScore);
        item = address(r);
        id = _items.length;
        _items.push(
            ItemMeta({
                item: item,
                creator: msg.sender,
                min: minScore,
                max: maxScore,
                name: name,
                description: description,
                isPromoted: false,
                promoteExpiry: 0
            })
        );
        emit ItemCreated(id, item, msg.sender, name, msg.value);
    }

    function getItemsCount() external view returns (uint256) {
        return _items.length;
    }

    function getItem(
        uint256 id
    )
        external
        view
        returns (
            address item,
            address creator,
            uint8 min,
            uint8 max,
            string memory name,
            string memory description,
            bool isPromoted,
            uint256 promoteExpiry
        )
    {
        ItemMeta storage m = _items[id];
        return (m.item, m.creator, m.min, m.max, m.name, m.description, m.isPromoted, m.promoteExpiry);
    }

    function promoteItem(uint256 id) external payable {
        require(id < _items.length, "Invalid item ID");
        require(msg.value >= promoteFee, "Insufficient promote fee");

        ItemMeta storage item = _items[id];
        item.isPromoted = true;
        item.promoteExpiry = block.timestamp + promoteDuration;
        promotedItems[item.item] = true;

        emit ItemPromoted(id, item.item, item.promoteExpiry, msg.value);
    }

    function updateFees(uint256 _creationFee, uint256 _promoteFee) external onlyOwner {
        creationFee = _creationFee;
        promoteFee = _promoteFee;
        emit FeesUpdated(_creationFee, _promoteFee);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        payable(owner).transfer(balance);
        emit Withdrawal(owner, balance);
    }

    function getPromotedItems() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _items.length; i++) {
            if (_items[i].isPromoted && _items[i].promoteExpiry > block.timestamp) {
                count++;
            }
        }

        address[] memory promoted = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < _items.length; i++) {
            if (_items[i].isPromoted && _items[i].promoteExpiry > block.timestamp) {
                promoted[index] = _items[i].item;
                index++;
            }
        }
        return promoted;
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
