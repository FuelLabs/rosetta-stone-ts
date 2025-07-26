# Rosetta Stone TS - Fuel Blockchain Integration Testing

[![CI](https://github.com/FuelLabs/rosetta-stone-ts/workflows/CI/badge.svg)](https://github.com/FuelLabs/rosetta-stone-ts/actions)

A comprehensive TypeScript + Sway integration testing template for the Fuel blockchain ecosystem. This project demonstrates real-world patterns for building and testing Fuel applications with a focus on maintainability and beginner-friendly organization.

## 🏗️ Project Structure

```
rosetta-stone-ts/
├── sway-programs/                # Sway blockchain programs
│   ├── contracts/               # Smart contracts
│   │   ├── src20-token/        # SRC20 token implementation
│   │   ├── token-vault/        # Token vault for deposits/withdrawals
│   │   └── cross-contract-call/ # Cross-contract communication
│   ├── scripts/                # Sway scripts
│   │   └── multi-asset-transfer/ # Multi-asset transfer script
│   └── predicates/             # Sway predicates
│       └── multi-sig/          # Multi-signature predicate
├── src/sway-api/               # Generated TypeScript types
│   ├── common.ts               # Common types and utilities
│   ├── Src20Token.ts          # SRC20 token contract types
│   ├── TokenVault.ts          # Token vault contract types
│   ├── CrossContractCall.ts   # Cross-contract call types
│   ├── MultiAssetTransfer.ts  # Multi-asset transfer script types
│   └── MultiSig.ts            # Multi-signature predicate types
├── tests/                      # TypeScript integration tests
│   ├── simple_token.test.ts    # Beginner-friendly standalone example
│   ├── token_operations.test.ts # Basic token operations
│   ├── vault_operations.test.ts # Vault deposits/withdrawals
│   ├── cross_contract_operations.test.ts # Cross-contract calls
│   ├── multi_wallet_operations.test.ts # Multi-wallet scenarios
│   ├── predicate_operations.test.ts # Predicate authorization
│   ├── script_operations.test.ts # Script execution
│   └── advanced_patterns.test.ts # Advanced patterns & benchmarks
├── fuels.config.ts             # Fuels CLI configuration
└── index.ts                    # Main entry point
```

## 🚀 Getting Started

### Prerequisites
- **Bun** (latest stable) - [Install Bun](https://bun.sh/)
- **Fuel toolchain** - [Install Fuel](https://docs.fuel.network/guides/installation/)
- **Sway compiler** - `forc` (included with Fuel toolchain)

### Installation & Setup
```bash
# Clone the repository
git clone <repository-url>
cd rosetta-stone-ts

# Install dependencies
bun install

# Build all Sway programs and generate TypeScript types
bun run build

# Run all tests
bun test

# Run tests with verbose output
bun test --verbose
```

### Navigating the Project
- **sway-programs/contracts/**: Sway smart contracts (SRC20 token, token vault, cross-contract call)
- **sway-programs/scripts/**: Sway scripts (multi-asset transfer)
- **sway-programs/predicates/**: Sway predicates (multi-sig)
- **src/sway-api/**: Generated TypeScript types and factories for all Sway programs
- **tests/**: TypeScript integration tests, each file is self-contained and tests specific functionality:
  - `simple_token.test.ts`: Standalone, beginner-friendly example
  - `token_operations.test.ts`: Basic token operations
  - `vault_operations.test.ts`: Vault deposits/withdrawals
  - `cross_contract_operations.test.ts`: Cross-contract calls
  - `multi_wallet_operations.test.ts`: Multi-wallet scenarios
  - `predicate_operations.test.ts`: Predicate authorization
  - `script_operations.test.ts`: Script execution
  - `advanced_patterns.test.ts`: Advanced patterns & benchmarks

### Running Specific Tests
```bash
bun test tests/simple_token.test.ts
bun test tests/token_operations.test.ts
bun test tests/vault_operations.test.ts
bun test tests/cross_contract_operations.test.ts
bun test tests/multi_wallet_operations.test.ts
bun test tests/predicate_operations.test.ts
bun test tests/script_operations.test.ts
bun test tests/advanced_patterns.test.ts
```

## 🧪 Test Modes

### Simulated Mode (Default)
Tests run in simulated mode by default, using a temporary in-memory blockchain:
```bash
bun test
```

## 📚 Key Features Demonstrated

### Token Operations
- SRC20 token deployment and minting
- Token transfers and balance queries
- Multi-wallet token management

### Vault Operations
- Token deposits and withdrawals
- Vault balance management
- Secure fund storage patterns

### Cross-Contract Communication
- Contract-to-contract calls
- Data passing between contracts
- Complex interaction patterns

### Predicate Authorization
- Multi-signature predicate setup
- Predicate funding and spending
- Cryptographic authorization patterns

### Script Execution
- Multi-asset transfer scripts
- Batch operations
- Complex transaction composition

### Advanced Patterns
- Performance benchmarking
- Error handling strategies
- Gas optimization techniques

## 🔧 Configuration

### Fuels Configuration
The `fuels.config.ts` file controls:
- Contract compilation settings
- TypeScript type generation
- Test network configuration

### TypeScript Configuration
The `tsconfig.json` provides:
- Strict TypeScript settings
- Path mapping for clean imports
- Modern ES module support

## Troubleshooting

### Common Issues
- **Type generation failures**: Run `bunx fuels typegen` after building contracts
- **Test timeout**: Use `bun test --timeout 30000` for longer timeouts
- **Balance issues**: Check wallet funding and token minting in test setup
- **Connection issues**: Ensure `bunx fuels dev` is running for real node tests

### Debug Mode
For detailed logging:
```bash
DEBUG=* bun test tests/your_test.test.ts
```

### Build Issues
If contracts fail to build:
```bash
# Clean and rebuild
rm -rf src/sway-api/*
bun run build
bunx fuels typegen
```

## 📖 Resources

- [Fuel Documentation](https://docs.fuel.network/)
- [Fuel TypeScript SDK](https://docs.fuel.network/docs/fuels-ts/)
- [Sway Language Book](https://docs.fuel.network/docs/sway/)
- [Fuel Forum](https://forum.fuel.network/)
- [Predicates Guide](https://docs.fuel.network/docs/fuels-ts/predicates/send-and-spend-funds-from-predicates/)
- [Testing with Fuel](https://docs.fuel.network/docs/fuels-ts/testing/launching-a-test-node/)

## 🤝 Contributing

This project serves as a comprehensive example and learning resource. Feel free to:
- Add new test patterns
- Improve documentation
- Optimize performance examples
- Share usage feedback

Each test file is designed to be educational and self-contained, making it easy to understand specific Fuel blockchain concepts and patterns.
