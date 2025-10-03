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