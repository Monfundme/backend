const { hashMessage, recoverAddress, Contract, JsonRpcProvider, Contract } = require('ethers');
require("dotenv").config();

const erc20Abi = [
    "function balanceOf(address account) view returns (uint256)"
];

const provider = new JsonRpcProvider(process.env.RPC_URL);
const contract = new Contract(process.env.VOTE_TOKEN_ADDRESS, erc20Abi, provider);

const verifySignedMessage = async (message, signature, address) => {
    try {
        // Get the address that signed the message
        const messageHash = hashMessage(message);
        const recoveredAddress = recoverAddress(messageHash, signature);

        // Check if recovered address matches the provided address
        return recoveredAddress.toLowerCase() ?? address.toLowerCase();
    } catch (error) {
        console.error('Error verifying signed message:', error);
        return false;
    }
};



const verifyVoter = async (message, signature, address) => {
    try {
        const isAddressVerified = await verifySignedMessage(message, signature, address);

        if (!isAddressVerified) {
            return null;
        }
        const balance = await contract.balanceOf(address);
        if (balance > 0) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error verifying voter:', error);
        return null;
    }
};

module.exports = {
    verifyVoter,
};
