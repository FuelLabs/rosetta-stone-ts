/**
 * Simple Token Test (TypeScript)
 * 
 * Demonstrates basic SRC20 token functionality testing
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
import { Src20Token, Src20TokenFactory } from '../src/sway-api';
import { launchTestNode } from 'fuels/test-utils';

// Test constants
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

// Helper function to format addresses
const formatAddress = (address: string): string => `${address.slice(0, 10)}...`;

// Helper function to format amounts
const formatAmount = (amount: number | string | bigint): string => {
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  return num.toLocaleString();
};

/**
 * Test 1: Simple token operations
 * Covers: deployment, minting, balance checks, supply verification, metadata validation
 */
test('should perform simple token operations', async () => {
  console.log('\nSIMPLE TOKEN OPERATIONS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set up test wallets
  using launched = await launchTestNode({
    walletsConfig: {
      count: 3,
      amountPerCoin: 1_000_000_000,
    },
  });

  const { wallets, provider } = launched;
  const [adminWallet, userWallet] = wallets;

  if (!adminWallet || !userWallet) {
    throw new Error('Failed to initialize wallets');
  }

  console.log('\nSetting up test environment...');
  console.log(`Admin: ${formatAddress(adminWallet.address.toString())}`);
  console.log(`User:  ${formatAddress(userWallet.address.toString())}`);

  // Deploy the SRC20 token contract
  const tokenConfig = {
    NAME: 'MYTOKEN',
    SYMBOL: 'TOKEN', 
    DECIMALS: 9,
    INITIAL_SUPPLY: 0,
    ADMIN: { Address: { bits: adminWallet.address.toB256() } },
  };

  console.log(`\nDeploying SRC20 token (${tokenConfig.NAME}/${tokenConfig.SYMBOL})...`);

  const factory = new Src20TokenFactory(adminWallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: tokenConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  // Create contract instances
  const adminTokenContract = new Src20Token(deployedContract.id, adminWallet);
  const userTokenContract = new Src20Token(deployedContract.id, userWallet);

  // Get the asset ID
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  console.log(`Contract deployed at ${formatAddress(deployedContract.id.toString())}`);
  console.log(`Asset ID: ${formatAddress(assetIdString)}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RUNNING TOKEN TESTS');

  // Test 1: Check initial supply
  const initialSupplyResult = await userTokenContract.functions
    .total_supply(assetIdObj)
    .call();
  const initialSupplyCall = await initialSupplyResult.waitForResult();
  const initialSupply = initialSupplyCall.value;

  expect(Number(initialSupply)).toBe(0);
  console.log('Initial supply verified: 0 tokens');

  // Test 2: Mint tokens
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: adminWallet.address.toB256() } };

  console.log(`\nMinting ${formatAmount(mintAmount)} tokens to admin (${formatAddress(adminWallet.address.toString())})...`);
  const mintCall = await adminTokenContract.functions
    .mint(recipient, SUB_ID, mintAmount)
    .call();

  await mintCall.waitForResult();

  // Test 3: Check admin balance
  const adminBalance = await adminWallet.getBalance(assetIdString);
  expect(adminBalance.toNumber()).toBe(mintAmount);

  // Test 4: Check total supply after minting
  const totalSupplyResult = await userTokenContract.functions
    .total_supply(assetIdObj)
    .call();
  const totalSupplyCall = await totalSupplyResult.waitForResult();
  const totalSupply = totalSupplyCall.value;

  expect(Number(totalSupply)).toBe(mintAmount);

  console.log(`Mint completed | Balance: ${formatAmount(adminBalance.toString())} | Supply: ${formatAmount(Number(totalSupply))}`);

  // Test 5: Check token metadata
  const nameResult = await userTokenContract.functions
    .name(assetIdObj)
    .call();
  const nameCall = await nameResult.waitForResult();
  const tokenName = nameCall.value;

  const symbolResult = await userTokenContract.functions
    .symbol(assetIdObj)
    .call();
  const symbolCall = await symbolResult.waitForResult();
  const tokenSymbol = symbolCall.value;

  expect(tokenName).toBe('MYTOKEN');
  expect(tokenSymbol).toBe('TOKEN');
  console.log(`Metadata verified: ${tokenName}/${tokenSymbol}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST COMPLETED SUCCESSFULLY');
  console.log(`Final balance: ${formatAmount(adminBalance.toString())} tokens`);
  console.log(`Total supply: ${formatAmount(Number(totalSupply))} tokens`);
  console.log('All operations verified\n');
});

/**
 * Test 2: Token minting scenarios
 * Tests multiple minting operations with different amounts
 */
test('should handle token minting scenarios', async () => {
  console.log('\nTOKEN MINTING SCENARIOS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Set up test wallets
  using launched = await launchTestNode({
    walletsConfig: {
      count: 2,
      amountPerCoin: 1_000_000_000,
    },
  });

  const { wallets, provider } = launched;
  const [adminWallet] = wallets;

  if (!adminWallet) {
    throw new Error('Failed to initialize admin wallet');
  }

  console.log('\nSetting up test environment...');
  console.log(`Admin: ${formatAddress(adminWallet.address.toString())}`);

  // Deploy the SRC20 token contract
  const tokenConfig = {
    NAME: 'TESTTOK',
    SYMBOL: 'TESTT', 
    DECIMALS: 6,
    INITIAL_SUPPLY: 0,
    ADMIN: { Address: { bits: adminWallet.address.toB256() } },
  };

  console.log(`\nDeploying SRC20 token (${tokenConfig.NAME}/${tokenConfig.SYMBOL})...`);

  const factory = new Src20TokenFactory(adminWallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: tokenConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  const adminTokenContract = new Src20Token(deployedContract.id, adminWallet);

  // Get the asset ID
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  console.log(`Contract deployed at ${formatAddress(deployedContract.id.toString())}`);
  console.log(`Asset ID: ${formatAddress(assetIdString)}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RUNNING MULTIPLE MINT OPERATIONS');

  // Test minting different amounts
  const mintAmounts = [1000, 10000, 100000, 1000000];
  
  for (const amount of mintAmounts) {
    const recipient = { Address: { bits: adminWallet.address.toB256() } };
    
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, amount)
      .call();

    await mintCall.waitForResult();
    
    const balance = await adminWallet.getBalance(assetIdString);
    console.log(`Minted ${formatAmount(amount)} | Balance: ${formatAmount(balance.toString())}`);
  }

  // Verify final balance
  const finalBalance = await adminWallet.getBalance(assetIdString);
  const expectedTotal = mintAmounts.reduce((sum, amount) => sum + amount, 0);
  
  expect(finalBalance.toNumber()).toBe(expectedTotal);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST COMPLETED SUCCESSFULLY');
  console.log(`Total minted: ${formatAmount(expectedTotal)} tokens`);
  console.log(`Final balance: ${formatAmount(finalBalance.toString())} tokens`);
  console.log(`Operations completed: ${mintAmounts.length}\n`);
});
