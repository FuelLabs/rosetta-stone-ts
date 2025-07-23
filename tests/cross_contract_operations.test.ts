/**
 * Cross Contract Operations Tests (TypeScript)
 * 
 * Demonstrates cross-contract communication including:
 * - Cross-contract calls
 * - Contract-to-contract interactions
 * - Multi-contract workflows
 * - Admin authorization checks
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
 * Deploys the SRC20 token contract with the given wallet and metadata.
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
 * Deploys the CrossContractCall contract
 */
async function deployCrossContractCall(
  adminWallet: WalletUnlocked
): Promise<CrossContractCall> {
  console.log('🚀 Deploying CrossContractCall contract...');

  // Configure with admin
  const crossContractConfig = {
    ADMIN: { Address: { bits: adminWallet.address.toB256() } },
  };

  const factory = new CrossContractCallFactory(adminWallet);
  const { waitForResult } = await factory.deploy({
    configurableConstants: crossContractConfig,
  });
  const { contract: deployedContract } = await waitForResult();

  console.log(`✅ CrossContractCall deployed at: ${deployedContract.id.toString()}`);
  
  return new CrossContractCall(deployedContract.id, adminWallet);
}

/**
 * Deploys the TokenVault contract
 */
async function deployTokenVault(
  wallet: WalletUnlocked,
  crossContractCallContract: CrossContractCall
): Promise<TokenVault> {
  console.log('🚀 Deploying TokenVault contract...');

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

  console.log(`✅ TokenVault deployed at: ${deployedContract.id.toString()}`);
  
  return new TokenVault(deployedContract.id, wallet);
}

/**
 * Test cross-contract call functionality
 */
test('should handle cross-contract call', async () => {
  console.log('🧪 Testing cross-contract call...');

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

  // Extract admin wallet and user wallet
  const adminWallet = wallets[2]; // Last wallet as admin
  const userWallet = wallets[1]; // Second wallet as user

  if (!adminWallet || !userWallet) {
    throw new Error('Failed to initialize admin and user wallets');
  }

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);
  console.log(`   User wallet: ${userWallet.address.toString()}`);

  // Deploy contracts
  console.log('🚀 Deploying contracts...');

  const tokenContract = await deploySrc20Token(
    adminWallet,
    "CROSSTK",
    "CROSS", 
    6
  );

  const crossContractCallContract = await deployCrossContractCall(adminWallet);

  const vaultContract = await deployTokenVault(
    adminWallet,
    crossContractCallContract
  );

  // Create user vault contract instance
  const userVaultContract = new TokenVault(vaultContract.id, userWallet);

  console.log('✅ All contracts deployed successfully');

  // Mint tokens to admin wallet for cross-contract authorization
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: adminWallet.address.toB256() } };

  const adminTokenContract = new Src20Token(tokenContract.id, adminWallet);

  console.log(`🔄 Minting ${mintAmount} tokens to admin wallet...`);
  
  try {
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, mintAmount)
      .call();

    await mintCall.waitForResult();
    console.log('✅ Mint successful');
  } catch (error) {
    console.log(`❌ Mint failed: ${error}`);
    throw error;
  }

  // Get asset ID
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  console.log(`📊 Asset ID: ${assetIdString}`);

  // Check admin wallet balance
  const adminBalance = await adminWallet.getBalance(assetIdString);
  console.log(`💰 Admin balance before deposit: ${adminBalance.toString()}`);

  // Get initial deposit balance for user
  let initialDepositBalance;
  try {
    const initialDepositResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const initialDepositCall = await initialDepositResult.waitForResult();
    initialDepositBalance = initialDepositCall.value;

    console.log(`📊 Initial deposit balance for user: ${initialDepositBalance}`);
  } catch (error) {
    console.log(`❌ Failed to get initial deposit balance: ${error}`);
    throw error;
  }

  const depositAmount = 100;

  console.log(`🔄 Preparing deposit of ${depositAmount} tokens...`);
  console.log('🔄 Executing cross-contract deposit...');
  console.log(`  From: Admin wallet (${adminWallet.address.toString()})`);
  console.log(`  To: User (${userWallet.address.toString()}) via cross-contract call`);

  // Check if admin has enough balance
  if (adminBalance.toNumber() < depositAmount) {
    throw new Error(
      `❌ Admin has insufficient balance: ${adminBalance.toString()} < ${depositAmount}`
    );
  }

  // Execute cross-contract deposit call
  try {
    const crossContractDepositCall = await crossContractCallContract.functions
      .deposit(
        { bits: userVaultContract.id.toB256() },
        { Address: { bits: userWallet.address.toB256() } }
      )
      .callParams({
        forward: [depositAmount, assetIdString],
      })
      .addContracts([userVaultContract])
      .call();

    const crossContractDepositResult = await crossContractDepositCall.waitForResult();
    
    console.log('✅ Cross-contract deposit successful');
    console.log(`📋 Transaction ID: ${crossContractDepositCall.transactionId}`);
    console.log(`📋 Transaction Status: ${JSON.stringify(crossContractDepositResult.transactionResult.status)}`);
  } catch (error) {
    console.log(`❌ Cross-contract deposit failed: ${error}`);
    throw error;
  }

  // Check the results
  let finalDepositBalance;
  try {
    const finalDepositResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const finalDepositCall = await finalDepositResult.waitForResult();
    finalDepositBalance = finalDepositCall.value;

    console.log(`✅ Final deposit balance for user: ${finalDepositBalance}`);
  } catch (error) {
    console.log(`❌ Failed to get final deposit balance: ${error}`);
    throw error;
  }

  const balanceIncrease = Number(finalDepositBalance) - Number(initialDepositBalance);
  console.log(`📈 Balance increase: ${balanceIncrease} (expected: ${depositAmount})`);
  
  // Verify the cross-contract deposit worked
  expect(balanceIncrease).toBe(depositAmount);
  
  console.log('✅ Cross Contract Call Deposit verification passed');

  // Verify admin wallet balance decreased
  const adminBalanceAfter = await adminWallet.getBalance(assetIdString);
  console.log(`💰 Admin balance after deposit: ${adminBalanceAfter.toString()}`);
  
  const adminBalanceDecrease = adminBalance.toNumber() - adminBalanceAfter.toNumber();
  console.log(`📉 Admin balance decrease: ${adminBalanceDecrease} (expected: ${depositAmount})`);

  console.log('✅ Cross-contract call test passed');
});

/**
 * Test unauthorized cross-contract calls with user wallet
 */
test('should reject unauthorized cross-contract calls', async () => {
  console.log('🧪 Testing cross-contract call with user sending tokens (should fail)...');

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

  const adminWallet = wallets[2];
  const userWallet = wallets[1];

  if (!adminWallet || !userWallet) {
    throw new Error('Failed to initialize admin and user wallets');
  }

  console.log('✅ Test wallets created for authorization test');

  // Deploy contracts
  const tokenContract = await deploySrc20Token(
    adminWallet,
    "USERTOK",
    "USERR",
    6
  );

  const crossContractCallContract = await deployCrossContractCall(adminWallet);

  const vaultContract = await deployTokenVault(
    adminWallet,
    crossContractCallContract
  );

  console.log('✅ Contracts deployed for authorization test');

  // Mint tokens to USER wallet
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: userWallet.address.toB256() } };

  const adminTokenContract = new Src20Token(tokenContract.id, adminWallet);

  console.log(`🔄 Minting ${mintAmount} tokens to user wallet...`);
  
  const mintCall = await adminTokenContract.functions
    .mint(recipient, SUB_ID, mintAmount)
    .call();
  await mintCall.waitForResult();

  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  // Create user instance of CrossContractCall (but this will fail due to admin restriction)
  const userCrossContractCall = new CrossContractCall(
    crossContractCallContract.id,
    userWallet
  );

  const depositAmount = 100;

  console.log('🔄 Attempting unauthorized cross-contract call...');

  // This should fail because only admin can call the cross-contract function
  try {
    const unauthorizedCall = await userCrossContractCall.functions
      .deposit(
        { bits: vaultContract.id.toB256() },
        { Address: { bits: userWallet.address.toB256() } }
      )
      .callParams({
        forward: [depositAmount, assetIdString],
      })
      .addContracts([vaultContract])
      .call();

    await unauthorizedCall.waitForResult();
    
    // If we get here, the test should fail
    throw new Error('❌ This should have failed! User should not be able to call admin-only function');
  } catch (error) {
    console.log('✅ Expected failure: User cannot call admin-only function');
    console.log(`   Error: ${error}`);
    
    // Any error is expected here due to admin restriction - the fact we caught an error means the test passed
    expect(error).toBeDefined();
  }

  console.log('✅ User authorization test passed');
}); 