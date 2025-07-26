/**
 * Multi-Sig Script Debug Tests
 * 
 * This module contains tests for debugging multi-signature logic using scripts:
 * - Script instantiation with configurable constants
 * - Signature verification logic
 * - Transaction witness data handling
 * - Detailed logging for debugging
 */

import { test, expect } from "bun:test";
import { 
  Wallet,
  Provider,
  Script,
  getRandomB256,
  bn,
  ScriptTransactionRequest,
  type AssetId,
  type WalletUnlocked
} from 'fuels';
import { MultiSigDebug, MultiSigDebugFactory} from '../src/sway-api';
import { launchTestNode } from 'fuels/test-utils';

/**
 * Helper function to format numbers with commas
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString();
}

/**
 * Helper function to truncate addresses
 */
function formatAddress(address: string): string {
  return `${address.substring(0, 10)}...`;
}

/**
 * Complete script debugging test for multisig logic
 * 1. Set up wallets
 * 2. Configure script with signing wallets
 * 3. Create a transaction with witness data
 * 4. Run the script to validate signatures
 * 5. Examine detailed logs for debugging
 */
test('should debug multisig signature verification using script', async () => {
  console.log('\nMULTI-SIG SCRIPT DEBUG TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Launch test node with 3 wallets configured
  using launched = await launchTestNode({
    walletsConfig: {
      count: 3,
      amountPerCoin: 1_000_000_000,
    },
  });

  // Extract the 3 wallets from the launched node
  const {
    wallets: [wallet1, wallet2, wallet3],
    provider,
  } = launched;

  // Verify we have 3 wallets
  expect(wallet1).toBeDefined();
  expect(wallet2).toBeDefined();
  expect(wallet3).toBeDefined();
  expect(provider).toBeDefined();

  // Ensure wallets are defined before using them
  if (!wallet1 || !wallet2 || !wallet3) {
    throw new Error('Failed to initialize wallets');
  }

  console.log('\nInitializing wallets...');
  console.log(`Wallet 1: ${formatAddress(wallet1.address.toString())}`);
  console.log(`Wallet 2: ${formatAddress(wallet2.address.toString())}`);
  console.log(`Wallet 3: ${formatAddress(wallet3.address.toString())}`);

  // Check initial balances
  const balance1 = await wallet1.getBalance();
  const balance2 = await wallet2.getBalance();
  const balance3 = await wallet3.getBalance();

  console.log('\nInitial balances:');
  console.log(`Wallet 1: ${formatAmount(balance1.toNumber())}`);
  console.log(`Wallet 2: ${formatAmount(balance2.toNumber())}`);
  console.log(`Wallet 3: ${formatAmount(balance3.toNumber())}`);

  // Step 2: Configure script with signing wallets
  console.log('\nCONFIGURING SCRIPT');
  console.log('━━━━━━━━━━━━━━━━━━━');
  
  // Convert wallet addresses to the format expected by the script
  const signer1 = { bits: wallet1.address.toB256() };
  const signer2 = { bits: wallet2.address.toB256() };
  const signer3 = { bits: wallet3.address.toB256() };

  // Configure the script with our 3 signers and require 2 signatures
  const scriptConfig = {
    SIGNERS: [signer1, signer2, signer3] as [typeof signer1, typeof signer2, typeof signer3],
    REQUIRED_SIGNATURES: 2,
  };

  console.log('MultiSig configuration:');
  console.log(`Signers: 3 wallets`);
  console.log(`Required signatures: ${scriptConfig.REQUIRED_SIGNATURES}`);

  // Step 3: Instantiate the script using Script class with bytecode and ABI
  const script = new Script(MultiSigDebugFactory.bytecode, MultiSigDebug.abi, wallet1);

  // Set configurable constants
  script.setConfigurableConstants(scriptConfig);

  console.log(`Script instantiated with wallet1`);
  console.log('Script configuration applied\n');

  // Step 4: Create a script transaction with witness data
  console.log('CREATING SCRIPT TRANSACTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Create a simple receiver wallet
  const receiver = Wallet.generate({ provider });
  console.log(`Receiver: ${formatAddress(receiver.address.toString())}`);
  
  // Get the base asset ID for transfers
  const baseAssetId = await provider.getBaseAssetId();
  
  console.log('Setting up script call with proper transaction context...');

  // Step 5: Build a proper transaction for multisig signing
  console.log('\nBUILDING MULTISIG TRANSACTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Create the script call with transaction parameters
  console.log('Creating script transaction...');
  const tx = script.functions.main().txParams({
    gasLimit: 300000,
  });
  
  // Get the entire transaction request prior to submission
  console.log('Getting transaction request...');
  const txRequest = await tx.getTransactionRequest();
  
  // Get the transaction ID for signing
  const chainId = await provider.getChainId();
  const txId = txRequest.getTransactionId(chainId);
  console.log(`Transaction ID: ${txId}`);

  // Step 6: Sign the transaction with multiple wallets
  console.log('\nSIGNING WITH MULTIPLE WALLETS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('Signing transaction with wallet1...');
  const signature1 = await wallet1.signTransaction(txRequest);
  console.log(`Signature 1: ${signature1.substring(0, 20)}...`);
  
  console.log('Signing transaction with wallet2...');
  const signature2 = await wallet2.signTransaction(txRequest);
  console.log(`Signature 2: ${signature2.substring(0, 20)}...`);
  
  // Add both signatures as witness data
  txRequest.witnesses = [signature1, signature2];
  console.log(`Added ${txRequest.witnesses.length} signatures as witness data`);

  console.log(txRequest.witnesses);
  console.log(txRequest.getTransactionId(chainId));

  // Step 7: Execute the transaction with multisig witness data
  console.log('\nEXECUTING MULTISIG TRANSACTION');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('Submitting transaction with multisig signatures...');
  
  try {
    // Execute the script with the signed transaction request
    const scriptExecution = await tx.call();
    
    // Wait for the result  
    const scriptResult = await scriptExecution.waitForResult();

    // console.log("HELLO LOGS", scriptResult.logs);

    console.log('\nSCRIPT EXECUTION RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Check the result
    expect(scriptResult).toBeDefined();
    console.log(`Script result: ${scriptResult.value}`);
    console.log(`Gas used: ${scriptResult.gasUsed.toNumber()}`);

    // Print all logs from the script execution
    console.log('\nDETAILED SCRIPT LOGS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━');
    
    if (scriptResult.logs && scriptResult.logs.length > 0) {
      scriptResult.logs.forEach((log: any, index: number) => {
        console.log(`Log ${index + 1}: ${log}`);
      });
    } else {
      console.log('No logs found in script execution');
    }

    // Final summary
    console.log('\nTEST SUMMARY');
    console.log('━━━━━━━━━━━━');
    console.log('✓ 3 wallets initialized');
    console.log('✓ Script configured with 2-of-3 multisig');
    console.log('✓ Multiple signatures collected');
    console.log('✓ Script executed with detailed logging');
    console.log(`✓ Script validation result: ${scriptResult.value}`);

    console.log('\nDebug test completed successfully');
    
  } catch (error: any) {
    console.log('\nSCRIPT EXECUTION ERROR');
    console.log('━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Error: ${error.message}`);
    
    // Print logs from error metadata if available
    if (error.metadata && error.metadata.logs) {
      console.log('\nDEBUG LOGS FROM ERROR:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
      console.log("HELLO LOGS", error.metadata.logs);
      error.metadata.logs.forEach((log: any, index: number) => {
        console.log(`Log ${index + 1}: ${log}`);
      });
    }
    
    // Re-throw the error so the test fails but we get the debug info
    throw error;
  }
}); 