// /**
//  * Predicate Operations Tests
//  * 
//  * This module contains tests for predicate authorization including:
//  * - Multi-signature predicates
//  * - Predicate funding
//  * - Predicate balance checks
//  * - Authorization workflows
//  */

// import { test, expect } from "bun:test";
// import { 
//   Wallet,
//   Provider,
//   getRandomB256,
//   bn,
//   ScriptTransactionRequest,
//   type AssetId,
//   type WalletUnlocked
// } from 'fuels';
// import { MultiSig } from '../src/sway-api';
// import { launchTestNode } from 'fuels/test-utils';

// /**
//  * Helper function to format numbers with commas
//  */
// function formatAmount(amount: number): string {
//   return amount.toLocaleString();
// }

// /**
//  * Helper function to truncate addresses
//  */
// function formatAddress(address: string): string {
//   return `${address.substring(0, 10)}...`;
// }

// /**
//  * Complete predicate workflow test with real funding and spending
//  * 1. Set up wallets
//  * 2. Configure predicate with signing wallets
//  * 3. Load the predicate
//  * 4. Fund the predicate
//  * 5. Spend funds from the predicate
//  */
// test('should complete full predicate workflow with real funding and spending', async () => {
//   console.log('\nMULTI-SIG PREDICATE TEST');
//   console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');

//   // Launch test node with 3 wallets configured
//   using launched = await launchTestNode({
//     walletsConfig: {
//       count: 3,
//       amountPerCoin: 1_000_000,
//     },
//   });

//   // Extract the 3 wallets from the launched node
//   const {
//     wallets: [wallet1, wallet2, wallet3],
//     provider,
//   } = launched;

//   // Verify we have 3 wallets
//   expect(wallet1).toBeDefined();
//   expect(wallet2).toBeDefined();
//   expect(wallet3).toBeDefined();
//   expect(provider).toBeDefined();

//   // Ensure wallets are defined before using them
//   if (!wallet1 || !wallet2 || !wallet3) {
//     throw new Error('Failed to initialize wallets');
//   }

//   console.log('\nInitializing wallets...');
//   console.log(`Wallet 1: ${formatAddress(wallet1.address.toString())}`);
//   console.log(`Wallet 2: ${formatAddress(wallet2.address.toString())}`);
//   console.log(`Wallet 3: ${formatAddress(wallet3.address.toString())}`);

//   // Check initial balances
//   const balance1 = await wallet1.getBalance();
//   const balance2 = await wallet2.getBalance();
//   const balance3 = await wallet3.getBalance();

//   console.log('\nInitial balances:');
//   console.log(`Wallet 1: ${formatAmount(balance1.toNumber())}`);
//   console.log(`Wallet 2: ${formatAmount(balance2.toNumber())}`);
//   console.log(`Wallet 3: ${formatAmount(balance3.toNumber())}`);

//   // Verify all wallets have initial funds
//   expect(balance1.toNumber()).toBeGreaterThan(0);
//   expect(balance2.toNumber()).toBeGreaterThan(0);
//   expect(balance3.toNumber()).toBeGreaterThan(0);

//   // Step 2: Configure predicate with signing wallets
//   console.log('\nCONFIGURING PREDICATE');
//   console.log('━━━━━━━━━━━━━━━━━━━━━');
  
//   // Convert wallet addresses to the format expected by the predicate
//   const signer1 = { bits: wallet1.address.toB256() };
//   const signer2 = { bits: wallet2.address.toB256() };
//   const signer3 = { bits: wallet3.address.toB256() };

//   // Configure the predicate with our 3 signers and require 2 signatures
//   const predicateConfig = {
//     SIGNERS: [signer1, signer2, signer3] as [typeof signer1, typeof signer2, typeof signer3],
//     REQUIRED_SIGNATURES: 2,
//   };

//   console.log('MultiSig configuration:');
//   console.log(`Signers: 3 wallets`);
//   console.log(`Required signatures: ${predicateConfig.REQUIRED_SIGNATURES}`);

//   // Step 3: Instantiate the predicate
//   const predicate = new MultiSig({
//     provider,
//     configurableConstants: predicateConfig,
//   });

//   console.log(`Predicate: ${formatAddress(predicate.address.toString())}`);
//   console.log('Predicate instantiated\n');

//   // Verify predicate was created correctly
//   expect(predicate).toBeDefined();
//   expect(predicate.address).toBeDefined();
//   expect(predicate.address.toString()).toMatch(/^0x[a-fA-F0-9]{64}$/);

//   // Step 4: Fund the predicate
//   console.log('FUNDING PREDICATE');
//   console.log('━━━━━━━━━━━━━━━━━');
  
//   // Get the base asset ID for transfers
//   const baseAssetId = await provider.getBaseAssetId();

//   // Amount to transfer to the predicate
//   const amountToPredicate = 500_000;
//   console.log(`Transferring ${formatAmount(amountToPredicate)} from Wallet 1...`);

//   // Check wallet1 balance before transfer
//   const wallet1BalanceBefore = await wallet1.getBalance();

//   // Transfer funds from wallet1 to the predicate
//   const transferTx = await wallet1.transfer(
//     predicate.address,
//     amountToPredicate,
//     baseAssetId
//   );

//   // Wait for the transaction to be confirmed
//   const transferResult = await transferTx.waitForResult();

//   // Verify the transfer was successful (check that it's not a failure status)
//   expect(transferResult.status).not.toBe('Failure');
//   expect(transferResult.status).not.toBe('Reverted');

//   // Check wallet1 balance after transfer
//   const wallet1BalanceAfter = await wallet1.getBalance();

//   // Verify wallet1 balance decreased by the transfer amount (plus gas fees)
//   expect(wallet1BalanceAfter.toNumber()).toBeLessThan(wallet1BalanceBefore.toNumber());

//   console.log(`Transfer completed | Status: ${transferResult.status}`);
//   console.log(`Wallet 1 balance: ${formatAmount(wallet1BalanceAfter.toNumber())}\n`);

//   // Step 5: Validate predicate balance
//   console.log('VALIDATING BALANCE');
//   console.log('━━━━━━━━━━━━━━━━━━');
  
//   // Get the predicate's balance
//   const predicateBalance = await predicate.getBalance();

//   // Verify the predicate received the funds
//   expect(predicateBalance.toNumber()).toBe(amountToPredicate);

//   // Also check the predicate's balance using the provider
//   const predicateBalanceFromProvider = await provider.getBalance(predicate.address, baseAssetId);

//   // Verify both balance checks match
//   expect(predicateBalanceFromProvider.toNumber()).toBe(amountToPredicate);

//   console.log(`Predicate balance: ${formatAmount(predicateBalance.toNumber())}`);
//   console.log('Balance validation completed\n');

//   // Step 6: Test predicate functionality (simplified)
//   console.log('TESTING FUNCTIONALITY');
//   console.log('━━━━━━━━━━━━━━━━━━━━━');
  
//   // Create a receiver wallet to receive funds from the predicate
//   const receiver = Wallet.generate({ provider });
//   console.log(`Receiver: ${formatAddress(receiver.address.toString())}`);
  
//   // Verify predicate configuration
//   console.log(`Configured signers: ${predicateConfig.SIGNERS.length}`);
//   console.log(`Required signatures: ${predicateConfig.REQUIRED_SIGNATURES}`);
  
//   // Test predicate address format
//   const predicateAddress = predicate.address.toString();
//   const isValidFormat = predicateAddress.startsWith('0x') && predicateAddress.length === 66;
//   console.log(`Address format valid: ${isValidFormat}\n`);

//   // Test predicate spending with proper signatures
//   console.log('TESTING SPENDING');
//   console.log('━━━━━━━━━━━━━━━━');
  
//   // Amount to transfer from predicate (keep it small to account for gas)
//   const transferAmount = 500;
//   console.log(`Transfer amount: ${formatAmount(transferAmount)}`);

//   // Get the resources (coins) from the predicate that we want to spend
//   const predicateCoins = await predicate.getResourcesToSpend([
//     { amount: transferAmount + 1000, assetId: baseAssetId }, // Add buffer for gas
//   ]);

//   // Create a transaction request
//   const transactionRequest = new ScriptTransactionRequest({
//     gasLimit: bn(10000),
//   });

//   // Add the predicate resources to the transaction
//   transactionRequest.addResources(predicateCoins);

//   // Add the output to the receiver
//   transactionRequest.addCoinOutput(receiver.address, transferAmount, baseAssetId);

//   // Set reasonable gas parameters
//   transactionRequest.gasLimit = bn(100000);
//   transactionRequest.maxFee = bn(50000);

//   // Sign the transaction with wallet1 and wallet2 (2-of-3 signatures)
//   console.log('Collecting signatures (2-of-3)...');
//   const signature1 = await wallet1.signTransaction(transactionRequest);
//   const signature2 = await wallet2.signTransaction(transactionRequest);

//   // Add the signatures as witness data
//   transactionRequest.witnesses = [signature1, signature2];

//   // Send the transaction using the predicate
//   console.log('Executing transfer with signatures...');
//   const transferOutTx = await predicate.sendTransaction(transactionRequest);
  
//   // Wait for the transaction to be confirmed
//   const predicateTransferResult = await transferOutTx.waitForResult();

//   // Verify the transfer was successful
//   expect(predicateTransferResult.status).not.toBe('Failure');
//   expect(predicateTransferResult.status).not.toBe('Reverted');

//   console.log(`Transfer status: ${predicateTransferResult.status}`);
//   console.log('Spending test completed\n');

//   // Final summary
//   console.log('TEST SUMMARY');
//   console.log('━━━━━━━━━━━━');
//   console.log('✓ 3 wallets initialized');
//   console.log('✓ 2-of-3 MultiSig predicate configured');
//   console.log(`✓ Predicate funded with ${formatAmount(amountToPredicate)}`);
//   console.log('✓ Balance validation passed');
//   console.log('✓ Signature authorization tested');
//   console.log('✓ Complete workflow successful');

//   console.log('\nTest completed successfully');
// });
