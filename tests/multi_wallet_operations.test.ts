/**
 * Multi Wallet Operations Tests (TypeScript)
 * 
 * Demonstrates multi-wallet interactions including:
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

// Common test constants
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

// Utility functions for consistent formatting
const formatAmount = (amount: number): string => amount.toLocaleString();
const formatAddress = (address: string): string => `${address.slice(0, 10)}...`;
const logSection = (title: string): void => {
  console.log(`\n${title}`);
  console.log('━'.repeat(title.length + 10));
};

/**
 * Deploys the SRC20 token contract with the given wallet and metadata.
 */
async function deploySrc20Token(
  wallet: WalletUnlocked,
  name: string,
  symbol: string,
  decimals: number
): Promise<Src20Token> {
  console.log(`Deploying ${name} (${symbol}) contract...`);

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

  console.log(`${name} deployed | Contract: ${formatAddress(deployedContract.id.toString())}`);
  
  return new Src20Token(deployedContract.id, wallet);
}

/**
 * Test multi-wallet interactions: minting to multiple users and transferring tokens between them.
 */
test('should handle multi-wallet interactions', async () => {
  logSection('MULTI-WALLET OPERATIONS TEST');

  console.log('\nInitializing wallets...');
  // Set up test wallets with 5 wallets
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

  // Extract admin wallet and user wallets
  const adminWallet = wallets[4]; // Last wallet as admin
  const userWallets = wallets.slice(0, 4); // First 4 wallets as users

  if (!adminWallet) {
    throw new Error('Failed to initialize admin wallet');
  }

  console.log(`5 wallets created | Admin: ${formatAddress(adminWallet.address.toString())}`);
  console.log('Test wallets ready\n');

  // Deploy the SRC20 token contract
  console.log('Deploying contracts...');
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

  console.log('All contracts deployed\n');

  logSection('MINTING TOKENS TO USERS');
  
  for (let i = 0; i < userWallets.length; i++) {
    const userWallet = userWallets[i];
    if (!userWallet) {
      throw new Error(`Failed to access user wallet ${i + 1}`);
    }
    
    const amount = TOKEN_AMOUNT + (i * 1000); // Different amounts for each user
    const recipient = { Address: { bits: userWallet.address.toB256() } };

    console.log(`Minting ${formatAmount(amount)} tokens to User ${i + 1} (${formatAddress(userWallet.address.toString())})`);

    // Mint tokens to the user wallet
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, amount)
      .call();

    await mintCall.waitForResult();
  }

  console.log(`Minting completed | ${userWallets.length} users funded\n`);

  // Get the asset ID for transfers
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  logSection('PRE-TRANSFER BALANCES');
  for (let i = 0; i < userWallets.length; i++) {
    const wallet = userWallets[i];
    if (wallet) {
      const balance = await wallet.getBalance(assetIdString);
      console.log(`User ${i + 1}: ${formatAmount(balance.toNumber())} tokens`);
    }
  }

  logSection('TOKEN TRANSFER OPERATION');
  const transferAmount = 50_000;

  const senderWallet = userWallets[0];
  const recipientWallet = userWallets[1];

  if (!senderWallet || !recipientWallet) {
    throw new Error('Failed to access sender or recipient wallet');
  }

  // Get initial balances for proper assertion
  const senderInitialBalance = await senderWallet.getBalance(assetIdString);
  const recipientInitialBalance = await recipientWallet.getBalance(assetIdString);

  console.log(`Transferring ${formatAmount(transferAmount)} tokens`);
  console.log(`From: User 1 (${formatAddress(senderWallet.address.toString())})`);
  console.log(`To: User 2 (${formatAddress(recipientWallet.address.toString())})`);

  // Verify sender has enough tokens
  if (senderInitialBalance.toNumber() < transferAmount) {
    throw new Error(
      `Insufficient balance: ${formatAmount(senderInitialBalance.toNumber())} < ${formatAmount(transferAmount)}`
    );
  }

  // Attempt to transfer tokens from user1 to user2
  try {
    const transferTx = await senderWallet.transfer(
      recipientWallet.address,
      transferAmount,
      assetIdString
    );

    await transferTx.waitForResult();
    console.log(`Transfer completed | TX: ${formatAddress(transferTx.id)}`);
  } catch (error) {
    throw new Error(`Transfer failed: ${error}`);
  }

  logSection('POST-TRANSFER VERIFICATION');

  // Query balances after transfer
  const senderFinalBalance = await senderWallet.getBalance(assetIdString);
  const recipientFinalBalance = await recipientWallet.getBalance(assetIdString);

  console.log(`User 1 balance: ${formatAmount(senderFinalBalance.toNumber())} (was ${formatAmount(senderInitialBalance.toNumber())})`);
  console.log(`User 2 balance: ${formatAmount(recipientFinalBalance.toNumber())} (was ${formatAmount(recipientInitialBalance.toNumber())})`);

  // Calculate expected balances based on initial amounts
  const expectedSenderBalance = senderInitialBalance.toNumber() - transferAmount;
  const expectedRecipientBalance = recipientInitialBalance.toNumber() + transferAmount;

  // Assert balances are as expected after transfer
  expect(senderFinalBalance.toNumber()).toBe(expectedSenderBalance);
  expect(recipientFinalBalance.toNumber()).toBe(expectedRecipientBalance);

  // Additional verification: Check other user balances remain unchanged
  console.log('\nVerifying other user balances...');
  for (let i = 2; i < userWallets.length; i++) {
    const wallet = userWallets[i];
    if (wallet) {
      const balance = await wallet.getBalance(assetIdString);
      const expectedBalance = TOKEN_AMOUNT + (i * 1000); // Original minted amount
      
      console.log(`User ${i + 1}: ${formatAmount(balance.toNumber())} tokens (unchanged)`);
      expect(balance.toNumber()).toBe(expectedBalance);
    }
  }

  logSection('TEST SUMMARY');
  console.log('All operations completed successfully');
  console.log(`Total users: ${userWallets.length}`);
  console.log(`Transfer amount: ${formatAmount(transferAmount)} tokens`);
  console.log('All balance assertions passed\n');
}); 