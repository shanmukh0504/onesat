import { Account, Contract, RpcProvider, json, CallData, cairo, hash } from 'starknet';
import fs from 'fs';
import path from 'path';

function loadArtifact(name: string) {
  const sierraPath = path.join(__dirname, '../target/dev', `${name}.contract_class.json`);
  const casmPath = path.join(__dirname, '../target/dev', `${name}.compiled_contract_class.json`);
  
  const sierra = json.parse(fs.readFileSync(sierraPath, 'utf8'));
  const casm = json.parse(fs.readFileSync(casmPath, 'utf8'));
  
  return {
    contract: sierra,
    casm: casm,
    abi: sierra.abi,
  };
}

describe('Registry + UDA deterministic deploy (ERC20 pre-funding)', () => {
  const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050' });
  let account: Account;

  beforeAll(async () => {
    // Use predeployed devnet account
    const pk = process.env.STARKNET_PK || '0x71d7bb07b9a64f6f78ac4c816aff4da9';
    const addr = process.env.STARKNET_ACCOUNT || '0x64b48806902a367c8598f4f95c305e8c1a1acba5f082d294a43793113115691';
    account = new Account(provider, addr, pk);
  });

  test('predict -> transfer -> deploy -> verify', async () => {
    // Load compiled artifacts from Scarb target (ensure `scarb build` ran)
    const UDA = loadArtifact('contracts_uda');
    const REG = loadArtifact('contracts_registryContract');

    // Declare UDA and Registry (handle already declared classes)
    let udaClassHash: string;
    let regClassHash: string;
    
    try {
      const udaDecl = await account.declare(UDA);
      udaClassHash = udaDecl.class_hash;
    } catch (error: any) {
      if (error.message?.includes('is already declared')) {
        // Compute class hash from the contract
        udaClassHash = hash.computeContractClassHash(UDA.contract);
        console.log('UDA already declared, using class hash:', udaClassHash);
      } else {
        throw error;
      }
    }

    try {
      const regDecl = await account.declare(REG);
      regClassHash = regDecl.class_hash;
    } catch (error: any) {
      if (error.message?.includes('is already declared')) {
        regClassHash = hash.computeContractClassHash(REG.contract);
        console.log('Registry already declared, using class hash:', regClassHash);
      } else {
        throw error;
      }
    }

    // Deploy Registry with uda_class_hash in constructor
    const regDeploy = await account.deployContract({
      classHash: regClassHash,
      constructorCalldata: CallData.compile({ class_hash: udaClassHash }),
    });
    const registryAddr = regDeploy.contract_address;
    const registry = new Contract(REG.abi, registryAddr, account);

    // Use predeployed ETH token on devnet
    const erc20Addr = '0x49D36570D4E46F48E99674BD3FCC84644DDD6B96F7C741B1562B82F9E004DC7';
    const ERC20_ABI = [
      {
        "type": "function",
        "name": "transfer",
        "inputs": [
          { "name": "recipient", "type": "core::starknet::contract_address::ContractAddress" },
          { "name": "amount", "type": "core::integer::u256" }
        ],
        "outputs": [{ "type": "core::bool" }],
        "state_mutability": "external"
      },
      {
        "type": "function",
        "name": "balance_of",
        "inputs": [{ "name": "account", "type": "core::starknet::contract_address::ContractAddress" }],
        "outputs": [{ "type": "core::integer::u256" }],
        "state_mutability": "view"
      }
    ];
    const erc20 = new Contract(ERC20_ABI, erc20Addr, account);

    // Inputs - use action=2 as mentioned
    const user = account.address;
    const target = cairo.felt('0x222');
    const deposit_id = cairo.felt('0x1');
    const token = erc20Addr;
    const action = 2n;
    const amount = cairo.uint256(1000n);

    // Predict address
    const predictedResult = await registry.predict_address(user, deposit_id, action, amount, token, target);
    const predicted = typeof predictedResult === 'string' && predictedResult.startsWith('0x') 
      ? predictedResult 
      : '0x' + BigInt(predictedResult.toString()).toString(16);
    console.log('Predicted address:', predicted);

    // Transfer ERC20 tokens to predicted address
    const transferTx = await erc20.transfer(predicted, amount);
    await provider.waitForTransaction(transferTx.transaction_hash);
    console.log('Transferred tokens to predicted address');

    // Verify balance before deployment
    const balanceBefore = await erc20.balance_of(predicted);
    console.log('Balance before deploy:', balanceBefore);
    const balanceValue = typeof balanceBefore === 'bigint' ? balanceBefore : BigInt(balanceBefore.low || balanceBefore);
    const amountValue = typeof amount === 'bigint' ? amount : BigInt(amount.low);
    expect(balanceValue).toBeGreaterThanOrEqual(amountValue);

    // Deploy vault
    const deployTx = await registry.deploy_vault(user, deposit_id, action, amount, token, target);
    await provider.waitForTransaction(deployTx.transaction_hash);
    console.log('Deployed vault at:', predicted);

    // Verify UDA state via calls
    const uda = new Contract(UDA.abi, predicted, provider);
    const udaUser = await uda.get_user();
    const udaAction = await uda.get_action();
    const udaAmount = await uda.get_amount();
    const udaToken = await uda.get_token();
    const udaTarget = await uda.get_target_address();

    console.log('Expected user:', user);
    console.log('Actual user:', udaUser);
    console.log('Expected action:', action);
    console.log('Actual action:', udaAction);
    console.log('Expected amount:', amount);
    console.log('Actual amount:', udaAmount);
    console.log('Expected token:', token);
    console.log('Actual token:', udaToken);
    console.log('Expected target:', target);
    console.log('Actual target:', udaTarget);

    // Convert values to comparable format
    const normalizeAddress = (addr: any) => {
      if (typeof addr === 'bigint') {
        return '0x' + addr.toString(16).toLowerCase();
      }
      if (typeof addr === 'number') {
        return '0x' + addr.toString(16).toLowerCase();
      }
      if (typeof addr === 'string') {
        // If it starts with 0x, it's already hex
        if (addr.startsWith('0x')) {
          const hex = addr.slice(2);
          return '0x' + BigInt('0x' + hex).toString(16).toLowerCase();
        }
        // Otherwise, treat it as decimal
        return '0x' + BigInt(addr).toString(16).toLowerCase();
      }
      // Fallback for any other type
      return '0x' + BigInt(addr.toString()).toString(16).toLowerCase();
    };

    expect(normalizeAddress(udaUser)).toBe(normalizeAddress(user));
    expect(BigInt(udaAction.toString())).toBe(action);
    
    // Compare amounts - convert both to BigInt
    const udaAmountValue = typeof udaAmount === 'bigint' ? udaAmount : BigInt(udaAmount.low || udaAmount);
    const expectedAmountValue = typeof amount === 'bigint' ? amount : BigInt(amount.low);
    expect(udaAmountValue).toBe(expectedAmountValue);
    
    expect(normalizeAddress(udaToken)).toBe(normalizeAddress(token));
    expect(normalizeAddress(udaTarget)).toBe(normalizeAddress(target));
    
    console.log('All assertions passed!');
  }, 120000); // Increased timeout to 120s for blockchain operations
});
