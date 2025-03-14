const { keccak256, toUtf8Bytes, Contract, JsonRpcProvider, Wallet, solidityPacked, getBytes, parseEther } = require("ethers");
const voteExecutorABI = require("../../abi/voteExecutorABI.json");
require("dotenv").config();

// WALLET RELATED STUFFS
const provider = new JsonRpcProvider(process.env.RPC_URL);
const protocolWallet = new Wallet(process.env.PRIVATE_KEY, provider);
const voteExecutor = new Contract(process.env.VOTE_EXECUTOR_ADDRESS, voteExecutorABI, protocolWallet);
const validator1 = new Wallet(process.env.v_1, provider);
const validator2 = new Wallet(process.env.v_2, provider);

const registerProposalOnChain = async (campaignParams) => {
    try {
        console.log("Creating proposal...");

        // Proposal configuration
        const campaignDetails = {
            campaignOwner: campaignParams.campaignOwner,
            title: campaignParams.title,
            description: campaignParams.description,
            image: campaignParams.imageUrl,
            target: parseEther(campaignParams.targetAmount.toString()),
            deadline: campaignParams.deadline
        }

        const startTime = Math.floor(Date.now() / 1000) + 300
        const endTime = Math.floor(Date.now() / 1000) + 30 * 1000

        console.log(
            campaignParams.proposalId,
            startTime,
            endTime,
            campaignDetails
        )

        console.log("Registering proposal...");

        console.log("current time", Math.floor(Date.now() / 1000));

        const proposalTx = await voteExecutor.createProposal(
            campaignParams.proposalId,
            startTime,
            endTime,
            campaignDetails
        );
        await proposalTx.wait();

        console.log(`Prosposal ${campaignParams.title} created successfully! --- ${proposalTx.hash}`);

        return {
            success: true,
            message: "Proposal created successfully!",
            hash: proposalTx.hash,
            proposalId: proposalConfig.proposalId
        }

    } catch (error) {
        console.log("Error from registerProposalOnChain ---- ", error);
        return {
            success: false,
            message: "Error ---- ",
            hash: null,
            proposalId: null
        }
    }
};

const executeProposalOnChain = async (proposalId, voteResults) => {
    try {
        console.log("Executing proposal...");

        const resultHash = keccak256(toUtf8Bytes(process.env.SIGN_MESSAGE));

        const messageHash = keccak256(
            solidityPacked(
                ["bytes32", "bytes32"],
                [proposalId, resultHash]
            )
        );

        // check if the results is a pass or fail
        const voteResult = voteResults.passed ? true : false;

        // Get signatures from all validators
        const signatures = [];
        signatures.push(await protocolWallet.signMessage(getBytes(messageHash)));
        signatures.push(await validator1.signMessage(getBytes(messageHash)));
        signatures.push(await validator2.signMessage(getBytes(messageHash)));

        console.log("Executing proposal...");
        const executeTx = await voteExecutor.executeResult(
            proposalId,
            voteResult,
            resultHash,
            signatures
        );
        await executeTx.wait();
        console.log("Proposal executed successfully!");

        return {
            success: true,
            message: "Proposal executed successfully!",
            hash: executeTx.hash
        }
    } catch (error) {
        return {
            success: false,
            message: "Error ---- ",
            hash: null
        }
    }
}


module.exports = {
    registerProposalOnChain,
    executeProposalOnChain
};
