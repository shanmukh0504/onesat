import { Account, RpcProvider } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode, writeDeploymentInfo } from "./utils";
dotenv.config();

type NetworkType = "sepolia" | "mainnet" | "devnet";

/**
 * Declare a contract only (without deploying)
 * @param network - Network to declare on
 * @param rpcUrl - RPC URL for the network
 * @param contractName - Contract name to declare
 */
async function declareContract(network: string, rpcUrl: string, contractName: string) {
    if (!["sepolia", "mainnet", "devnet"].includes(network as NetworkType)) {
        console.error(
            `Invalid network. Supported networks: sepolia, mainnet, devnet`
        );
        process.exit(1);
    }

    const provider = new RpcProvider({
        nodeUrl: rpcUrl,
    });

    console.log(`Declaring contract on ${network}...`);
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Contract name: ${contractName}`);

    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    const accountAddress = process.env.DEPLOYER_ADDRESS;

    if (!privateKey || !accountAddress) {
        console.error("Missing DEPLOYER_PRIVATE_KEY or DEPLOYER_ADDRESS in .env");
        process.exit(1);
    }

    const account = new Account(provider, accountAddress, privateKey, "1", "0x3");
    console.log("Account connected:", accountAddress);

    try {
        const { sierraCode, casmCode } = await getCompiledCode(contractName);

        console.log("Declaring contract...");
        const declareResponse = await account.declare({
            contract: sierraCode,
            casm: casmCode,
        });

        console.log("✅ Contract declared successfully!");
        console.log("Class hash:", declareResponse.class_hash);
        console.log("Transaction hash:", declareResponse.transaction_hash);

        // Save declaration info
        const declareInfo = {
            network,
            contractName,
            classHash: declareResponse.class_hash,
            declarationHash: declareResponse.transaction_hash,
            timestamp: new Date().toISOString(),
        };

        await writeDeploymentInfo(contractName, network, declareInfo);

        return declareResponse.class_hash;
    } catch (error: any) {
        console.error("Declaration failed:", error.message);
        process.exit(1);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error(
            "Usage: ts-node declare.ts <contract_name> <network> <rpc_url>"
        );
        console.error("Example: ts-node declare.ts contracts_uda sepolia https://rpc.sepolia.starknet.io");
        process.exit(1);
    }

    const [contractName, network, rpcUrl] = args;

    await declareContract(network, rpcUrl, contractName);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

