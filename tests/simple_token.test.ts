/**
 * Simple Token Test (TypeScript)
 * 
 * This is a TypeScript equivalent of the Rust simple_token_test.rs
 * Demonstrates basic SRC20 token functionality testing using Fuel TypeScript SDK
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

// Test constants (matching Rust version)
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Test 1: Simple token operations (TypeScript equivalent of test_simple_token_operations)
 * Covers: deployment, minting, balance checks, supply verification, metadata validation
 */
test('should perform simple token operations', async () => {
  console.log('🧪 Testing simple token operations...');

  // Set up test wallets (equivalent to Rust wallet setup)
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

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);
  console.log(`   User wallet: ${userWallet.address.toString()}`);

  // Deploy the SRC20 token contract (equivalent to Rust contract deployment)
  console.log('🚀 Deploying SRC20 token contract...');

  // Configure the token parameters (matching Rust configurables)
  const tokenConfig = {
    NAME: 'MYTOKEN',
    SYMBOL: 'TOKEN', 
    DECIMALS: 9,
    INITIAL_SUPPLY: 0, // Start with 0 supply
    ADMIN: { Address: { bits: adminWallet.address.toB256() } },
  };

  console.log('📋 Token configuration:');
  console.log(`   Name: ${tokenConfig.NAME}`);
  console.log(`   Symbol: ${tokenConfig.SYMBOL}`);
  console.log(`   Decimals: ${tokenConfig.DECIMALS}`);
  console.log(`   Admin: ${adminWallet.address.toString()}`);

  // Deploy the contract with configurables using factory
  const factory = new Src20TokenFactory(adminWallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: tokenConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  console.log(`✅ Token deployed at: ${deployedContract.id.toString()}`);

  // Create contract instances for admin and user
  const adminTokenContract = new Src20Token(deployedContract.id, adminWallet);
  const userTokenContract = new Src20Token(deployedContract.id, userWallet);

  console.log('✅ Contract instances created for admin and user');

  // Get the asset ID for this token (equivalent to Rust get_asset_id call)
  console.log('🔍 Getting asset ID...');
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = assetIdObj.bits || assetIdObj;

  console.log(`📊 Asset ID: ${assetIdString}`);

  // Test 1: Check initial supply (equivalent to Rust initial supply check)
  console.log('📊 Checking initial token supply...');
  const initialSupplyResult = await userTokenContract.functions
    .total_supply(assetIdObj)
    .call();
  const initialSupplyCall = await initialSupplyResult.waitForResult();
  const initialSupply = initialSupplyCall.value;

  console.log(`   Initial supply: ${initialSupply}`);
  expect(Number(initialSupply)).toBe(0); // Expecting 0 for initial supply
  console.log('✅ Initial supply check passed');

  // Test 2: Mint tokens (equivalent to Rust mint operation)
  console.log('🪙 Minting tokens to admin...');
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: adminWallet.address.toB256() } };

  const mintCall = await adminTokenContract.functions
    .mint(recipient, SUB_ID, mintAmount)
    .call();

  const mintResult = await mintCall.waitForResult();
  console.log(`   Minted ${mintAmount} tokens to admin`);
  console.log(`   Mint transaction completed`);

  // Test 3: Check admin balance (equivalent to Rust balance check)
  console.log('💰 Checking admin balance...');
  const adminBalance = await adminWallet.getBalance(assetIdString);

  console.log(`   Admin balance: ${adminBalance.toString()}`);
  expect(adminBalance.toNumber()).toBe(mintAmount);
  console.log('✅ Admin balance check passed');

  // Test 4: Check total supply after minting (equivalent to Rust supply verification)
  console.log('📊 Checking total supply after minting...');
  const totalSupplyResult = await userTokenContract.functions
    .total_supply(assetIdObj)
    .call();
  const totalSupplyCall = await totalSupplyResult.waitForResult();
  const totalSupply = totalSupplyCall.value;

  console.log(`   Total supply: ${totalSupply}`);
  expect(Number(totalSupply)).toBe(mintAmount);
  console.log('✅ Total supply check passed');

  // Test 5: Check token metadata (equivalent to Rust metadata validation)
  console.log('📋 Checking token metadata...');
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

  console.log(`   Token name: ${tokenName}`);
  console.log(`   Token symbol: ${tokenSymbol}`);

  expect(tokenName).toBe('MYTOKEN');
  expect(tokenSymbol).toBe('TOKEN');
  console.log('✅ Token metadata check passed');

  console.log('✅ Simple token operations test completed successfully!');
});

/**
 * Test 2: Token minting scenarios (TypeScript equivalent of test_token_minting_scenarios)
 * Tests multiple minting operations with different amounts
 */
test('should handle token minting scenarios', async () => {
  console.log('🧪 Testing token minting scenarios...');

  // Set up test wallets (equivalent to Rust wallet setup)
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

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);

  // Deploy the SRC20 token contract (equivalent to Rust contract deployment)
  console.log('🚀 Deploying SRC20 token contract...');

  // Configure the token parameters (different from first test)
  const tokenConfig = {
    NAME: 'TESTTOK',
    SYMBOL: 'TESTT', 
    DECIMALS: 6,
    INITIAL_SUPPLY: 0,
    ADMIN: { Address: { bits: adminWallet.address.toB256() } },
  };

  console.log('📋 Token configuration:');
  console.log(`   Name: ${tokenConfig.NAME}`);
  console.log(`   Symbol: ${tokenConfig.SYMBOL}`);
  console.log(`   Decimals: ${tokenConfig.DECIMALS}`);

  // Deploy the contract with configurables using factory
  const factory = new Src20TokenFactory(adminWallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: tokenConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  console.log(`✅ Token deployed at: ${deployedContract.id.toString()}`);

  const adminTokenContract = new Src20Token(deployedContract.id, adminWallet);

  // Get the asset ID for this token
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = assetIdObj.bits || assetIdObj;

  console.log(`📊 Asset ID: ${assetIdString}`);

  // Test minting different amounts (equivalent to Rust mint_amounts vector)
  const mintAmounts = [1000, 10000, 100000, 1000000];
  
  for (const amount of mintAmounts) {
    console.log(`🪙 Minting ${amount} tokens...`);
    
    const recipient = { Address: { bits: adminWallet.address.toB256() } };
    
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, amount)
      .call();

    await mintCall.waitForResult();
    
    const balance = await adminWallet.getBalance(assetIdString);
        
    console.log(`   Admin balance after minting ${amount}: ${balance.toString()}`);
  }

  // Verify final balance is the sum of all mints
  const finalBalance = await adminWallet.getBalance(assetIdString);
  const expectedTotal = mintAmounts.reduce((sum, amount) => sum + amount, 0);
  
  console.log(`💰 Final balance: ${finalBalance.toString()}`);
  console.log(`💰 Expected total: ${expectedTotal}`);
  
  expect(finalBalance.toNumber()).toBe(expectedTotal);

  console.log('✅ Token minting scenarios test completed successfully!');
});
