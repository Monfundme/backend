const { joinSignature, hashMessage, recoverAddress, Contract } = require('ethers');


const erc20Abi = [
    "function balanceOf(address account) view returns (uint256)"
];


const contract = new Contract(process.env.VOTE_TOKEN_ADDRESS, erc20Abi, provider);

const verifySignature = async (message, r, s, v) => {
    try {
        const signature = joinSignature({ r, s, v });
        const messageHash = hashMessage(message);
        const recoveredAddress = recoverAddress(messageHash, signature);
        return recoveredAddress;
    } catch (error) {
        console.error('Error verifying signature:', error);
        return null;
    }
};

const verifyVoter = async (message, r, s, v) => {
    try {
        const recoveredAddress = await verifySignature(message, r, s, v);
        const balance = await contract.balanceOf(recoveredAddress);
        if (balance > 0) {
            return { recoveredAddress, message };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error verifying voter:', error);
        return null;
    }
};

module.exports = {
    verifyVoter
};
