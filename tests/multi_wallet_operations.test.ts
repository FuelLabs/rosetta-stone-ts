/**
 * Multi Wallet Operations Tests (TypeScript)
 * 
 * This is a TypeScript equivalent of the Rust multi_wallet_operations.rs
 * Demonstrates multi-wallet interactions using Fuel TypeScript SDK including:
 * - Minting to multiple users
 * - Token transfers between wallets
 * - Multi-wallet balance management
 * - Complex wallet interactions
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

// Common test constants (matching Rust version)
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Deploys the SRC20 token contract with the given wallet and metadata.
 * (TypeScript equivalent of deploy_src20_token function)
 */
async function deploySrc20Token(
  wallet: WalletUnlocked,
  name: string,
  symbol: string,
  decimals: number
): Promise<Src20Token> {
  console.log(`🚀 Deploying SRC20 token: ${name} (${symbol})`);

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

  console.log(`✅ Token '${name}' (${symbol}) deployed at: ${deployedContract.id.toString()}`);
  
  return new Src20Token(deployedContract.id, wallet);
}

/**
 * Test multi-wallet interactions: minting to multiple users and transferring tokens between them.
 * (TypeScript equivalent of test_multi_wallet_interactions)
 */
test('should handle multi-wallet interactions', async () => {
  console.log('🧪 Testing multi-wallet interactions...');

  // Set up test wallets (equivalent to Rust wallet setup with 5 wallets)
  using launched = await launchTestNode({
    walletsConfig: {
      count: 5,
      amountPerCoin: 1_000_000_000,
    },
  });

  const { wallets, provider } = launched;
  
  if (wallets.length < 5) {
    throw new Error('Failed to initialize 5 wallets');
  }

  // Extract admin wallet and user wallets (equivalent to Rust wallet assignment)
  const adminWallet = wallets[4]; // Last wallet as admin
  const userWallets = wallets.slice(0, 4); // First 4 wallets as users

  if (!adminWallet) {
    throw new Error('Failed to initialize admin wallet');
  }

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);
  userWallets.forEach((wallet, i) => {
    if (wallet) {
      console.log(`   User ${i + 1} wallet: ${wallet.address.toString()}`);
    }
  });

  // Deploy the SRC20 token contract (equivalent to deploy_src20_token call)
  const tokenContract = await deploySrc20Token(
    adminWallet,
    "MULTITK",
    "MULTK", 
    6
  );

  // Create admin token contract instance for minting
  const adminTokenContract = new Src20Token(
    tokenContract.id,
    adminWallet
  );

  console.log('✅ Admin token contract instance created');

  // Mint tokens to ALL user wallets (equivalent to Rust minting loop)
  console.log('🔄 Starting multi-wallet minting...');
  
  for (let i = 0; i < userWallets.length; i++) {
    const userWallet = userWallets[i];
    if (!userWallet) {
      throw new Error(`Failed to access user wallet ${i + 1}`);
    }
    
    const amount = TOKEN_AMOUNT + (i * 1000); // Different amounts for each user
    const recipient = { Address: { bits: userWallet.address.toB256() } };

    console.log(`🔄 Attempting to mint ${amount} tokens to user ${i + 1}: ${userWallet.address.toString()}`);

    // Mint tokens to the user wallet
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, amount)
      .call();

    await mintCall.waitForResult();
    console.log(`✅ Mint transaction successful for user ${i + 1}!`);
  }

  console.log('✅ Multi-wallet minting completed');

  // Get the asset ID for transfers (equivalent to get_asset_id call)
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = assetIdObj.bits || assetIdObj;

  console.log(`📊 Asset ID: ${assetIdString}`);

  // Verify balances before transfer (equivalent to Rust balance checking)
  console.log('🔍 Checking balances before transfer...');
  for (let i = 0; i < userWallets.length; i++) {
    const wallet = userWallets[i];
    if (wallet) {
      const balance = await wallet.getBalance(assetIdString);
      console.log(`User ${i + 1} balance: ${balance.toString()}`);
    }
  }

  // Now perform the transfer (equivalent to Rust transfer operation)
  const transferAmount = 50_000;

  const senderWallet = userWallets[0];
  const recipientWallet = userWallets[1];

  if (!senderWallet || !recipientWallet) {
    throw new Error('Failed to access sender or recipient wallet');
  }

  console.log(`🔄 About to transfer ${transferAmount} tokens`);
  console.log(`From: ${senderWallet.address.toString()} (User 1)`);
  console.log(`To: ${recipientWallet.address.toString()} (User 2)`);
  console.log(`Asset ID: ${assetIdString}`);

  // Get initial balances for proper assertion (equivalent to Rust initial balance tracking)
  const senderInitialBalance = await senderWallet.getBalance(assetIdString);
  const recipientInitialBalance = await recipientWallet.getBalance(assetIdString);

  console.log('📊 Initial balances:');
  console.log(`  Sender: ${senderInitialBalance.toString()}`);
  console.log(`  Recipient: ${recipientInitialBalance.toString()}`);

  // Verify sender has enough tokens (equivalent to Rust balance verification)
  if (senderInitialBalance.toNumber() < transferAmount) {
    throw new Error(
      `❌ Sender has insufficient balance: ${senderInitialBalance.toString()} < ${transferAmount}`
    );
  }

  // Attempt to transfer tokens from user1 to user2 (equivalent to Rust transfer)
  console.log('🔄 Executing transfer...');
  try {
    const transferTx = await senderWallet.transfer(
      recipientWallet.address,
      transferAmount,
      assetIdString
    );

    const transferResult = await transferTx.waitForResult();
    console.log(`✅ Transfer successful! Transaction ID: ${transferTx.id}`);
    console.log(`   Transaction status: ${JSON.stringify(transferResult.status)}`);
  } catch (error) {
    console.log(`❌ Transfer failed: ${error}`);
    throw error;
  }

  console.log('🔄 Checking balances after transfer...');

  // Query balances after transfer (equivalent to Rust final balance checking)
  const senderFinalBalance = await senderWallet.getBalance(assetIdString);
  const recipientFinalBalance = await recipientWallet.getBalance(assetIdString);

  console.log('📊 Final balances:');
  console.log(`  Sender: ${senderFinalBalance.toString()} (was ${senderInitialBalance.toString()})`);
  console.log(`  Recipient: ${recipientFinalBalance.toString()} (was ${recipientInitialBalance.toString()})`);

  // Calculate expected balances based on initial amounts (equivalent to Rust expected balance calculation)
  const expectedSenderBalance = senderInitialBalance.toNumber() - transferAmount;
  const expectedRecipientBalance = recipientInitialBalance.toNumber() + transferAmount;

  console.log('🔄 Running assertions...');
  console.log(`  Expected sender balance: ${expectedSenderBalance}`);
  console.log(`  Expected recipient balance: ${expectedRecipientBalance}`);

  // Assert balances are as expected after transfer (equivalent to Rust assertions)
  expect(senderFinalBalance.toNumber()).toBe(expectedSenderBalance);
  expect(recipientFinalBalance.toNumber()).toBe(expectedRecipientBalance);

  console.log('✅ All assertions passed!');

  // Additional verification: Check other user balances remain unchanged
  console.log('🔍 Verifying other user balances remained unchanged...');
  for (let i = 2; i < userWallets.length; i++) {
    const wallet = userWallets[i];
    if (wallet) {
      const balance = await wallet.getBalance(assetIdString);
      const expectedBalance = TOKEN_AMOUNT + (i * 1000); // Original minted amount
      
      console.log(`User ${i + 1} balance: ${balance.toString()} (expected: ${expectedBalance})`);
      expect(balance.toNumber()).toBe(expectedBalance);
    }
  }

  console.log('✅ All user balances verified!');
  console.log('✅ Multi-wallet interactions test completed successfully!');
}); 