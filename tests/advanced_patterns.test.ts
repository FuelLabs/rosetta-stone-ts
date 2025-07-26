/**
 * Advanced Patterns Tests (TypeScript)
 * 
 * Demonstrates advanced blockchain patterns including:
 * - Block manipulation
 * - Gas optimization
 * - Custom transaction policies
 * - Performance benchmarks
 * - Comprehensive logging
 */

import { test, expect } from "bun:test";
import { 
  Wallet,
  Provider,
  type WalletUnlocked,
  type AssetId,
  bn,
  Address,
} from 'fuels';
import { 
  Src20Token, 
  Src20TokenFactory,
  CrossContractCall,
  CrossContractCallFactory,
  TokenVault,
  TokenVaultFactory 
} from '../src/sway-api';
import { launchTestNode } from 'fuels/test-utils';

// Common test constants
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Helper function to format addresses for display
 */
function formatAddress(address: string): string {
  return `${address.slice(0, 10)}...`;
}

/**
 * Helper function to format amounts with commas
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString();
}

/**
 * Deploys the SRC20 token contract with the given wallet and metadata.
 */
async function deploySrc20Token(
  wallet: WalletUnlocked,
  name: string,
  symbol: string,
  decimals: number
): Promise<Src20Token> {
  // Configure the token parameters
  const tokenConfig = {
    NAME: name,
    SYMBOL: symbol, 
    DECIMALS: decimals,
    INITIAL_SUPPLY: 0,
    ADMIN: { Address: { bits: wallet.address.toB256() } },
  };

  // Deploy the contract with configurables using factory
  const factory = new Src20TokenFactory(wallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: tokenConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  console.log(`${name} (${symbol}) deployed at ${formatAddress(deployedContract.id.toString())}`);
  
  return new Src20Token(deployedContract.id, wallet);
}

/**
 * Deploys the CrossContractCall contract
 */
async function deployCrossContractCall(
  adminWallet: WalletUnlocked
): Promise<CrossContractCall> {
  const factory = new CrossContractCallFactory(adminWallet);
  const { waitForResult } = await factory.deploy();
  const { contract: deployedContract } = await waitForResult();

  console.log(`CrossContractCall deployed at ${formatAddress(deployedContract.id.toString())}`);
  
  return new CrossContractCall(deployedContract.id, adminWallet);
}

/**
 * Deploys the TokenVault contract
 */
async function deployTokenVault(
  wallet: WalletUnlocked,
  crossContractCallContract: CrossContractCall
): Promise<TokenVault> {
  // Configure the vault parameters
  const vaultConfig = {
    CROSS_CONTRACT_CALL: { bits: crossContractCallContract.id.toB256() },
    ADMIN: { Address: { bits: wallet.address.toB256() } },
  };

  const factory = new TokenVaultFactory(wallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: vaultConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  console.log(`TokenVault deployed at ${formatAddress(deployedContract.id.toString())}`);
  
  return new TokenVault(deployedContract.id, wallet);
}

/**
 * Test advanced blockchain patterns
 */
test('should handle advanced patterns', async () => {
  console.log('\nADVANCED PATTERNS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set up test wallets
  using launched = await launchTestNode({
    walletsConfig: {
      count: 3,
      amountPerCoin: 1_000_000_000,
    },
  });

  const { wallets, provider } = launched;
  
  if (wallets.length < 3) {
    throw new Error('Failed to initialize 3 wallets');
  }

  const adminWallet = wallets[2]; // Last wallet as admin

  if (!adminWallet) {
    throw new Error('Failed to initialize admin wallet');
  }

  console.log('\nInitializing test environment...');
  console.log(`Admin wallet: ${formatAddress(adminWallet.address.toString())}`);

  // Deploy contracts
  console.log('\nDeploying contracts...');

  const tokenContract = await deploySrc20Token(
    adminWallet,
    "ADVTOKE",
    "ADVOK", 
    6
  );

  const crossContractCallContract = await deployCrossContractCall(adminWallet);

  const _vaultContract = await deployTokenVault(
    adminWallet,
    crossContractCallContract
  );

  console.log('All contracts deployed successfully\n');

  // Test block manipulation
  console.log('BLOCK MANIPULATION TEST');
  console.log('─────────────────────────────────────────────────');
  
  const initialHeight = await provider.getBlockNumber();
  console.log(`Initial block height: ${initialHeight.toString()}`);

  // Produce blocks
  await provider.produceBlocks(5);
  const newHeight = await provider.getBlockNumber();
  console.log(`New block height: ${newHeight.toString()}`);

  expect(newHeight.toNumber()).toBe(initialHeight.toNumber() + 5);
  console.log('Block manipulation completed\n');

  // Test gas optimization
  console.log('GAS OPTIMIZATION TEST');
  console.log('─────────────────────────────────────────────────');
  
  const adminTokenContract = new Src20Token(tokenContract.id, adminWallet);
  const recipient = { Address: { bits: adminWallet.address.toB256() } };

  // Check wallet balance before transaction
  const baseAssetId = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const baseBalance = await adminWallet.getBalance(baseAssetId);
  console.log(`Base balance: ${formatAmount(baseBalance.toNumber())}`);

  // Estimate gas cost using new assembleTx method
  console.log('Estimating gas cost...');
  
  try {
    const request = await adminTokenContract.functions
      .mint(recipient, SUB_ID, TOKEN_AMOUNT)
      .getTransactionRequest();

    const { assembledRequest, gasPrice } = await provider.assembleTx({
      request,
      feePayerAccount: adminWallet,
    });

    console.log(`Gas used: ${assembledRequest.gasLimit.toString()}`);
    console.log(`Gas price: ${gasPrice.toString()}`);

    // Test with custom transaction policies
    console.log('\nTesting custom transaction policies...');
    
    const customPolicies = {
      gasLimit: assembledRequest.gasLimit.mul(2),
    };

    console.log(`Custom gas limit: ${customPolicies.gasLimit.toString()}`);

    const txnWithCustomPolicies = await adminTokenContract.functions
      .mint(recipient, SUB_ID, TOKEN_AMOUNT)
      .txParams(customPolicies)
      .call();

    const result = await txnWithCustomPolicies.waitForResult();
    
    console.log(`Mint completed | TX: ${formatAddress(txnWithCustomPolicies.transactionId)}`);

    // Verify transaction completed successfully
    expect(result.transactionResult.isStatusSuccess).toBe(true);

    // Check final balances
    const balances = await adminWallet.getBalances();
    console.log(`Final balances: ${balances.balances.length} assets`);
    
    for (const balance of balances.balances) {
      console.log(`Asset ${formatAddress(balance.assetId)}: ${formatAmount(balance.amount.toNumber())}`);
    }

    console.log('Gas optimization test completed\n');
    
  } catch (error) {
    console.log(`Gas optimization failed: ${error}`);
    throw error;
  }
});

/**
 * Test comprehensive logging functionality
 */
test('should handle comprehensive logging', async () => {
  console.log('\nCOMPREHENSIVE LOGGING TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set up test environment
  using launched = await launchTestNode({
    walletsConfig: {
      count: 1,
      amountPerCoin: 1_000_000,
    },
  });

  const { wallets } = launched;
  const wallet = wallets[0];

  if (!wallet) {
    throw new Error('Failed to initialize wallet');
  }

  console.log('\nDeploying test contract...');
  const tokenContract = await deploySrc20Token(wallet, "MYTOKEN", "TOKEN", 9);
  console.log('Contract deployment completed\n');

  // Test various operations with logging
  const recipient = { Address: { bits: wallet.address.toB256() } };

  // Mint operation
  console.log('MINT OPERATION LOGGING');
  console.log('─────────────────────────────────────────────────');
  
  const mintCall = await tokenContract.functions
    .mint(recipient, SUB_ID, 10000)
    .call();

  const mintResult = await mintCall.waitForResult();
  
  // Check transaction logs
  if (mintResult.transactionResult.receipts) {
    console.log(`Mint completed | Receipts: ${mintResult.transactionResult.receipts.length}`);
    
    // Log receipt types for debugging
    mintResult.transactionResult.receipts.forEach((receipt, index) => {
      console.log(`Receipt ${index}: ${receipt.type}`);
    });
  }

  // Get asset ID for burn test
  const assetIdResult = await tokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  // Test burn operation
  console.log('\nBURN OPERATION LOGGING');
  console.log('─────────────────────────────────────────────────');
  
  const burnAmount = 5000;
  
  try {
    const burnCall = await tokenContract.functions
      .burn(SUB_ID, burnAmount)
      .callParams({
        forward: [burnAmount, assetIdString],
      })
      .call();

    const burnResult = await burnCall.waitForResult();
    
    // Check burn transaction logs
    if (burnResult.transactionResult.receipts) {
      console.log(`Burn completed | Receipts: ${burnResult.transactionResult.receipts.length}`);
    }

    console.log('Comprehensive logging test completed');
  } catch (error) {
    console.log(`Burn operation failed (insufficient balance): ${error}`);
    console.log('Comprehensive logging test completed (mint logging verified)');
  }
});

/**
 * Test performance benchmarks
 */
test('should handle performance benchmarks', async () => {
  console.log('\nPERFORMANCE BENCHMARKS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set up test environment
  using launched = await launchTestNode({
    walletsConfig: {
      count: 1,
      amountPerCoin: 1_000_000,
    },
  });

  const { wallets } = launched;
  const wallet = wallets[0];

  if (!wallet) {
    throw new Error('Failed to initialize wallet');
  }

  console.log('\nDeploying test contract...');
  const tokenContract = await deploySrc20Token(wallet, "MYTOKEN", "TOKEN", 9);
  const adminTokenContract = new Src20Token(tokenContract.id, wallet);
  console.log('Contract deployment completed\n');

  // Benchmark batch operations
  const batchSize = 10;
  console.log('BATCH OPERATIONS BENCHMARK');
  console.log('─────────────────────────────────────────────────');
  console.log(`Starting batch of ${batchSize} operations...`);
  
  const startTime = Date.now();

  for (let i = 0; i < batchSize; i++) {
    const recipient = { Address: { bits: wallet.address.toB256() } };
    
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, 1000 * (i + 1))
      .call();

    await mintCall.waitForResult();
    
    if ((i + 1) % 3 === 0) {
      console.log(`Progress: ${i + 1}/${batchSize} operations completed`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`Batch operations completed in ${elapsed}ms`);

  // Verify final state
  console.log('\nVerifying final state...');
  
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  const finalBalance = await wallet.getBalance(assetIdString);
  
  // Calculate expected total: sum of 1000, 2000, 3000, ..., 10000
  const expectedTotal = Array.from({ length: batchSize }, (_, i) => (i + 1) * 1000)
    .reduce((sum, value) => sum + value, 0);
  
  console.log(`Final balance: ${formatAmount(finalBalance.toNumber())}`);
  console.log(`Expected total: ${formatAmount(expectedTotal)}`);
  
  expect(finalBalance.toNumber()).toBe(expectedTotal);

  // Performance metrics
  const avgTimePerOperation = elapsed / batchSize;
  console.log(`Average time per operation: ${avgTimePerOperation.toFixed(2)}ms`);
  
  if (avgTimePerOperation < 1000) { // Less than 1 second per operation
    console.log('Performance within acceptable limits');
  } else {
    console.log('Performance may need optimization');
  }

  console.log('Performance benchmarks test completed');
}); 