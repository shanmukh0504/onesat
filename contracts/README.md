# OneSat Contracts

This project contains Cairo smart contracts for OneSat.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Scarb (Cairo package manager)

### Installation

1. Install Node.js dependencies:
```bash
npm install
```

2. Install Scarb dependencies:
```bash
scarb build
```

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for TypeScript compilation
- `npm test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Development

1. **Cairo Development**: Write your Cairo contracts in the `src/` directory
2. **Testing**: Write tests in the `tests/` directory

### Testing

The project uses Jest for testing with TypeScript support. Tests are located in the `tests/` directory and follow the naming convention `*.test.ts` or `*.spec.ts`.

Example test:
```typescript
describe('MyContract', () => {
  test('should work correctly', () => {
    expect(true).toBe(true);
  });
});
```

### Deployment

Before deploying, make sure to:
1. Copy `env.example` to `.env` and fill in your deployer credentials:
   ```bash
   cp env.example .env
   ```
2. Edit `.env` and add your `DEPLOYER_PRIVATE_KEY` and `DEPLOYER_ADDRESS`

#### Step 1: Declare UDA Contract

The UDA contract is **declared only** (not deployed). This generates a class hash that will be used by the Registry.

```bash
# Sepolia
ts-node scripts/declare.ts contracts_uda sepolia https://rpc.sepolia.starknet.io

# Mainnet
ts-node scripts/declare.ts contracts_uda mainnet https://rpc.starknet.io

# Devnet
ts-node scripts/declare.ts contracts_uda devnet http://localhost:5050
```

After declaring UDA, save the **class hash** from the output. You'll need it for deploying the Registry.

#### Step 2: Deploy Registry Contract

The Registry contract is **deployed** with the UDA class hash from Step 1.

```bash
# Sepolia
ts-node scripts/deploy.ts registry sepolia https://rpc.sepolia.starknet.io <UDA_CLASS_HASH>

# Mainnet
ts-node scripts/deploy.ts registry mainnet https://rpc.starknet.io <UDA_CLASS_HASH>

# Devnet
ts-node scripts/deploy.ts registry devnet http://localhost:5050 <UDA_CLASS_HASH>
```

Replace `<UDA_CLASS_HASH>` with the class hash from the UDA declaration (Step 1).

**Example:**
```bash
# 1. Declare UDA contract (this only declares, doesn't deploy)
ts-node scripts/declare.ts contracts_uda sepolia https://rpc.sepolia.starknet.io
# Output: "Class hash: 0x1234..."
# Save this class hash!

# 2. Deploy Registry with the UDA class hash
ts-node scripts/deploy.ts registry sepolia https://rpc.sepolia.starknet.io 0x1234...
```

#### Generic Usage

**Declare any contract:**
```bash
ts-node scripts/declare.ts <contract_name> <network> <rpc_url>
```

**Deploy any contract:**
```bash
# Without constructor args
ts-node scripts/deploy.ts <contract_name> <network> <rpc_url>

# With constructor args
ts-node scripts/deploy.ts <contract_name> <network> <rpc_url> '{"arg1": "value1", "arg2": "value2"}'
```