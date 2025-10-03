import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode, writeDeploymentInfo } from "./utils";
dotenv.config();

type NetworkType = "sepolia" | "mainnet" | "devnet";

interface DeployConfig {
  contractName: string;
  constructorArgs?: Record<string, any>;
  salt?: string;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: ts-node deploy.ts <network> <rpc_url> [contract_name] [constructor_args_json]"
    );
    console.error("Example: ts-node deploy.ts sepolia https://rpc.sepolia.starknet.io contracts_Contract '{\"arg1\":\"value1\"}'");
    process.exit(1);
  }

  const [network, rpcUrl, contractName = "contracts_Contract", constructorArgsJson] = args;
  
  if (!["sepolia", "mainnet", "devnet"].includes(network as NetworkType)) {
    console.error(
      `Invalid network. Supported networks: sepolia, mainnet, devnet`
    );
    process.exit(1);
  }

  const provider = new RpcProvider({
    nodeUrl: rpcUrl,
  });

  console.log(`Deploying to ${network}...`);
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

    let constructorCalldata: any[] = [];
    
    // Parse constructor arguments if provided
    if (constructorArgsJson) {
      try {
        const constructorArgs = JSON.parse(constructorArgsJson);
        const callData = new CallData(sierraCode.abi);
        constructorCalldata = callData.compile("constructor", constructorArgs);
        console.log("Constructor arguments:", constructorArgs);
      } catch (error) {
        console.error("Failed to parse constructor arguments:", error);
        process.exit(1);
      }
    }

    console.log("Declaring and deploying contract...");
    const deployResponse = await account.declareAndDeploy({
      contract: sierraCode,
      casm: casmCode,
      constructorCalldata,
      salt: stark.randomAddress(),
    });

    const deployedContract = new Contract(
      sierraCode.abi,
      deployResponse.deploy.contract_address,
      provider
    );

    console.log("✅ Contract deployed successfully!");
    console.log("Contract address:", deployedContract.address);
    console.log("Transaction hash:", deployResponse.deploy.transaction_hash);

    // Save deployment info
    const deployInfo = {
      network,
      contractName,
      contractAddress: deployedContract.address,
      constructorArgs: constructorArgsJson ? JSON.parse(constructorArgsJson) : {},
      deploymentHash: deployResponse.deploy.transaction_hash,
      timestamp: new Date().toISOString(),
    };

    await writeDeploymentInfo(contractName, network, deployInfo);
  } catch (error: any) {
    console.error("Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
