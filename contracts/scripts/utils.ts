import path from "path";
import { promises as fs } from "fs";

export interface CompiledCode {
  sierraCode: any;
  casmCode: any;
}

export interface DeploymentInfo {
  network: string;
  contractName: string;
  contractAddress: string;
  constructorArgs: Record<string, any>;
  deploymentHash: string;
  timestamp: string;
}

/**
 * Get compiled code from Scarb build output
 * @param filename - Name of the contract to compile
 * @returns Promise containing sierra and casm code
 */
export async function getCompiledCode(filename: string): Promise<CompiledCode> {
  const sierraFilePath = path.join(
    process.cwd(),
    `target/dev/${filename}.contract_class.json`
  );
  const casmFilePath = path.join(
    process.cwd(),
    `target/dev/${filename}.compiled_contract_class.json`
  );

  const code = [sierraFilePath, casmFilePath].map(async (filePath) => {
    const file = await fs.readFile(filePath);
    return JSON.parse(file.toString("ascii"));
  });

  const [sierraCode, casmCode] = await Promise.all(code);

  return {
    sierraCode,
    casmCode,
  };
}

/**
 * Write deployment information to a JSON file
 * @param contract - Type of contract (e.g., 'htlc', 'uda', 'registry')
 * @param network - Network name (e.g., 'sepolia', 'mainnet')
 * @param deployInfo - Deployment information to save
 */
export async function writeDeploymentInfo(
  contract: string,
  network: string,
  deployInfo: DeploymentInfo
): Promise<void> {
  await fs.mkdir("./deployments", { recursive: true });

  const deploymentPath = `./deployments/${contract}_${network}_${deployInfo.contractAddress}.json`;
  try {
    await fs.access(deploymentPath);
    console.log("Deployment file already exists");
  } catch (error) {
    await fs.writeFile(deploymentPath, JSON.stringify(deployInfo, null, 2));
    console.log("Created deployment file:", deploymentPath);
  }
}

