# rosetta-stone-ts
Rosetta Stone Example (Typescript)

## Overview

This project demonstrates a complete predicate workflow using the Fuel TypeScript SDK, including:
- Multi-signature predicate configuration
- Predicate funding
- Predicate spending
- Real on-chain transactions

## Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Fuel Core](https://docs.fuel.network/guides/installation/) - Fuel blockchain node

## Setup

1. Install dependencies:
```bash
bun install
```

2. Build the predicate:
```bash
cd predicates/multi-sig
forc build
cd ../..
```

3. Generate TypeScript types:
```bash
bunx fuels typegen
```

## Running Tests

### Simulated Mode (Default)
Run the tests without a local Fuel node:
```bash
bun test tests/predicate_operations.test.ts
```

This will demonstrate the workflow structure and provide instructions for running with a real node.

### Real Transaction Mode
To run the tests with actual on-chain transactions:

1. Start a local Fuel node:
```bash
bunx fuels dev
```

2. Wait for the node to be ready (check logs for "Dev completed successfully")

3. Run the tests:
```bash
bun test tests/predicate_operations.test.ts
```

The test will automatically detect if a Fuel node is running and connect to it for real transactions.

## Test Workflow

The predicate operations test demonstrates:

1. **Wallet Setup**: Creating and configuring wallets for testing
2. **Predicate Configuration**: Setting up a multi-signature predicate with 3 signers requiring 2 signatures
3. **Predicate Loading**: Instantiating the predicate with the Fuel SDK
4. **Predicate Funding**: Transferring funds to the predicate address
5. **Predicate Spending**: Transferring funds from the predicate to a receiver

## Project Structure

```
rosetta-stone-ts/
├── predicates/multi-sig/     # Sway predicate source
├── src/sway-api/            # Generated TypeScript types
├── tests/                   # Test files
│   └── predicate_operations.test.ts
├── fuels.config.ts          # Fuels CLI configuration
└── package.json
```

## Key Files

- `predicates/multi-sig/src/main.sw` - Multi-signature predicate implementation
- `tests/predicate_operations.test.ts` - Complete predicate workflow test
- `src/sway-api/MultiSig.ts` - Generated TypeScript predicate class

## Troubleshooting

If you encounter connection issues:
1. Make sure Fuel Core is installed: `curl --proto "=https" --tlsv1.2 -sSf https://install.fuel.network | sh`
2. Start the node with: `bunx fuels dev`
3. Wait for the node to fully start before running tests

## References

- [Fuel TypeScript SDK Documentation](https://docs.fuel.network/docs/fuels-ts/)
- [Predicates Guide](https://docs.fuel.network/docs/fuels-ts/predicates/send-and-spend-funds-from-predicates/)
- [Testing with Fuel](https://docs.fuel.network/docs/fuels-ts/testing/launching-a-test-node/)
