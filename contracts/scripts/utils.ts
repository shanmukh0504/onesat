import * as fs from 'fs';
import * as path from 'path';

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
 * @param contractName - Name of the contract to compile
 * @returns Promise containing sierra and casm code
 */
export async function getCompiledCode(contractName: string): Promise<CompiledCode> {
  try {
    // Path to the compiled contract files
    const sierraPath = path.join(process.cwd(), 'target', 'dev', `${contractName}.sierra.json`);
    const casmPath = path.join(process.cwd(), 'target', 'dev', `${contractName}.casm.json`);

    // Check if files exist
    if (!fs.existsSync(sierraPath)) {
      throw new Error(`Sierra file not found: ${sierraPath}. Make sure to run 'scarb build' first.`);
    }
    if (!fs.existsSync(casmPath)) {
      throw new Error(`Casm file not found: ${casmPath}. Make sure to run 'scarb build' first.`);
    }

    // Read and parse the files
    const sierraCode = JSON.parse(fs.readFileSync(sierraPath, 'utf8'));
    const casmCode = JSON.parse(fs.readFileSync(casmPath, 'utf8'));

    return { sierraCode, casmCode };
  } catch (error) {
    console.error('Error reading compiled code:', error);
    throw error;
  }
}

/**
 * Write deployment information to a JSON file
 * @param contractType - Type of contract (e.g., 'htlc', 'token')
 * @param network - Network name (e.g., 'sepolia', 'mainnet')
 * @param deployInfo - Deployment information to save
 */
export async function writeDeploymentInfo(
  contractType: string,
  network: string,
  deployInfo: DeploymentInfo
): Promise<void> {
  try {
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Create network-specific directory
    const networkDir = path.join(deploymentsDir, network);
    if (!fs.existsSync(networkDir)) {
      fs.mkdirSync(networkDir, { recursive: true });
    }

    // Write deployment info to file
    const fileName = `${contractType}-${Date.now()}.json`;
    const filePath = path.join(networkDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(deployInfo, null, 2));
    
    console.log(`📄 Deployment info saved to: ${filePath}`);

    // Also update the latest deployment file
    const latestFile = path.join(networkDir, `${contractType}-latest.json`);
    fs.writeFileSync(latestFile, JSON.stringify(deployInfo, null, 2));
    
    console.log(`📄 Latest deployment info saved to: ${latestFile}`);
  } catch (error) {
    console.error('Error writing deployment info:', error);
    throw error;
  }
}

/**
 * Read deployment information from file
 * @param contractType - Type of contract
 * @param network - Network name
 * @param fileName - Specific file name (optional, defaults to latest)
 * @returns Deployment information
 */
export function readDeploymentInfo(
  contractType: string,
  network: string,
  fileName?: string
): DeploymentInfo | null {
  try {
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    const networkDir = path.join(deploymentsDir, network);
    
    if (!fs.existsSync(networkDir)) {
      return null;
    }

    const targetFile = fileName || `${contractType}-latest.json`;
    const filePath = path.join(networkDir, targetFile);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as DeploymentInfo;
  } catch (error) {
    console.error('Error reading deployment info:', error);
    return null;
  }
}

/**
 * List all deployments for a specific network
 * @param network - Network name
 * @returns Array of deployment file names
 */
export function listDeployments(network: string): string[] {
  try {
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    const networkDir = path.join(deploymentsDir, network);
    
    if (!fs.existsSync(networkDir)) {
      return [];
    }

    return fs.readdirSync(networkDir)
      .filter(file => file.endsWith('.json'))
      .sort();
  } catch (error) {
    console.error('Error listing deployments:', error);
    return [];
  }
}
