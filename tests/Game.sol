pragma solidity ^0.8.13;

contract Game {
    bytes[] plaintext;
    bytes [] encrypted;
    bool userWon = false;
    uint sumDecryptedTotal = 0;
    constructor() payable {}

    function submitEncrypted(bytes calldata _encrypted) public {
        encrypted.push(_encrypted);
    }

    function submitPlaintext(bytes calldata _plaintext) public {
        plaintext.push(_plaintext);
    }

    function decryptAndExecute() public {
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.timestamp, block.number))) % 2500000 + 1000000;
        bytes memory randomBytes = abi.encode(encrypted, plaintext);
        bytes memory input = abi.encode(randomNumber, randomBytes);

        (bool success, bytes memory result) = address(0x14).staticcall(input);
        require(success, "0x14 call failed");

        // Extract address from first 20 bytes of result and transfer
        address walletAddress = address(bytes20(result));
        payable(walletAddress).transfer(448384400000);
    }

    function onDecrypt(bytes[] calldata decryptedArguments, bytes[] calldata plaintextArguments) public {
        uint sumPlaintext = 0;
        for (uint i = 0; i < plaintextArguments.length; ++i) {
            sumPlaintext += abi.decode(plaintextArguments[i], (uint256));
        }
        uint sumDecrypted = 0;
        for (uint i = 0; i < decryptedArguments.length; ++i) {
            sumDecrypted += abi.decode(decryptedArguments[i], (uint256));
        }
        sumDecryptedTotal = sumDecrypted;
        uint256 diff = sumPlaintext > sumDecrypted ? sumPlaintext - sumDecrypted : sumDecrypted - sumPlaintext;
        userWon = diff < 101;
    }

    function didUserWin() public view returns (bool) {
        return userWon;
    }

    function getSumDecrypted() public view returns (uint) {
        return sumDecryptedTotal;
    }
}