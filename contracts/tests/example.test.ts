import { Account, Contract, RpcProvider, json, CallData, cairo } from 'starknet';
import fs from 'fs';
import path from 'path';

function loadArtifact(name: string) {
  const artifactPath = path.join(__dirname, '../target/dev', `${name}.sierra.json`);
  return json.parse(fs.readFileSync(artifactPath, 'utf8'));
}

describe('Registry + UDA deterministic deploy (ERC20 pre-funding)', () => {
  const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL || 'http://127.0.0.1:5050' });
  let account: Account;

  beforeAll(async () => {
    const pk = process.env.STARKNET_PK || '0x1';
    const addr = process.env.STARKNET_ACCOUNT || '0x1';
    account = new Account(provider, addr, pk);
  });

  test('predict -> fail before funding -> mint -> deploy -> verify', async () => {
    // Load compiled artifacts from Scarb target (ensure `scarb build` ran)
    const UDA = loadArtifact('contracts_uda_uda');
    const REG = loadArtifact('contracts_registry_registry');

    // Declare UDA and Registry
    const udaDecl = await account.declare({ contract: UDA });
    const udaClassHash = udaDecl.class_hash;
    const regDecl = await account.declare({ contract: REG });
    const regClassHash = regDecl.class_hash;

    // Deploy Registry with uda_class_hash in constructor
    const regDeploy = await account.deployContract({
      classHash: regClassHash,
      constructorCalldata: CallData.compile({ class_hash: udaClassHash }),
    });
    const registryAddr = regDeploy.contract_address;
    const registry = new Contract(REG.abi, registryAddr, account);

    // Load OZ ERC20 Mintable artifact and deploy
    const OZ_ERC20_PATH = require.resolve('@openzeppelin/contracts-cairo/artifacts/token/erc20/ERC20_Mintable.sierra.json');
    const OZ_ERC20 = json.parse(fs.readFileSync(OZ_ERC20_PATH, 'utf8'));
    const ercDecl = await account.declare({ contract: OZ_ERC20 });
    const erc20Deploy = await account.deployContract({
      classHash: ercDecl.class_hash,
      constructorCalldata: CallData.compile({
        name: 'TestToken',
        symbol: 'TT',
        decimals: 18,
        initial_supply: 0,
        recipient: 0,
      }),
    });
    const erc20Addr = erc20Deploy.contract_address;
    const erc20 = new Contract(OZ_ERC20.abi, erc20Addr, account);

    // Inputs
    const user = cairo.felt('0x111');
    const target = cairo.felt('0x222');
    const token = erc20Addr;
    const action = 7n;
    const amount = cairo.uint256(1000n);

    // Predict address
    const predicted: string = (await registry.predict_address(user, action, amount, token, target)).toString();

    // Expect deploy to fail before funding
    await expect(registry.deploy_vault(user, action, amount, token, target)).rejects.toThrow();

    // Mint to predicted
    await erc20.mint(predicted, amount);

    // Deploy and confirm predicted == deployed
    const tx = await registry.deploy_vault(user, action, amount, token, target);
    await provider.waitForTransaction(tx.transaction_hash);

    // Verify UDA state via calls
    const uda = new Contract(UDA.abi, predicted, provider);
    expect(await uda.get_user()).toBe(user);
    expect(await uda.get_amount()).toEqual(amount);
    expect(await uda.get_token()).toBe(token);
    expect(await uda.get_target_address()).toBe(target);
  });
});
