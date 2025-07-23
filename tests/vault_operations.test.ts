/**
 * Vault Operations Tests (TypeScript)
 * 
 * This is a TypeScript equivalent of the Rust vault_operations.rs
 * Demonstrates TokenVault contract operations including:
 * - Vault deposits
 * - Vault withdrawals
 * - Vault balance checks
 * - Admin operations
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
 * Deploys the CrossContractCall contract
 * (TypeScript equivalent of deploy_cross_contract_call function)
 */
async function deployCrossContractCall(
  adminWallet: WalletUnlocked
): Promise<CrossContractCall> {
  console.log('🚀 Deploying CrossContractCall contract...');

  const factory = new CrossContractCallFactory(adminWallet);
  const { waitForResult } = await factory.deploy();
  const { contract: deployedContract } = await waitForResult();

  console.log(`✅ CrossContractCall deployed at: ${deployedContract.id.toString()}`);
  
  return new CrossContractCall(deployedContract.id, adminWallet);
}

/**
 * Deploys the TokenVault contract
 * (TypeScript equivalent of deploy_token_vault function)
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
 * Test vault deposit and withdrawal functionality
 * (TypeScript equivalent of test_vault_deposit)
 */
test('should handle vault deposit and withdrawal', async () => {
  console.log('🧪 Testing vault deposit and withdrawal...');

  // Set up test wallets (equivalent to Rust wallet setup)
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

  // Extract admin wallet and user wallet (equivalent to Rust wallet assignment)
  const adminWallet = wallets[2]; // Last wallet as admin
  const userWallet = wallets[1]; // Second wallet as user

  if (!adminWallet || !userWallet) {
    throw new Error('Failed to initialize admin and user wallets');
  }

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);
  console.log(`   User wallet: ${userWallet.address.toString()}`);

  // Deploy contracts (equivalent to Rust contract deployment)
  console.log('🚀 Deploying contracts...');

  const tokenContract = await deploySrc20Token(
    adminWallet,
    "VAULTOK",
    "VAULT", 
    6
  );

  const crossContractCallContract = await deployCrossContractCall(adminWallet);

  const vaultContract = await deployTokenVault(
    adminWallet,
    crossContractCallContract
  );

  console.log('✅ All contracts deployed successfully');

  // Mint tokens to the user wallet (equivalent to Rust mint operation)
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: userWallet.address.toB256() } };

  console.log(`🔄 Creating admin token contract instance...`);
  const adminTokenContract = new Src20Token(tokenContract.id, adminWallet);

  console.log(`🔄 Minting ${mintAmount} tokens to user...`);
  
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

  // Check user balance after mint and get asset ID
  console.log('🔄 Getting asset ID...');
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  console.log(`✅ Got asset ID: ${assetIdString}`);

  const userBalance = await userWallet.getBalance(assetIdString);
  console.log(`💰 User balance before deposit: ${userBalance.toString()}`);

  // Deposit tokens into the vault (equivalent to Rust deposit operation)
  const depositAmount = 100_000;

  console.log(`🔄 Preparing deposit of ${depositAmount} tokens...`);

  // Check if user has enough balance
  if (userBalance.toNumber() < depositAmount) {
    throw new Error(
      `❌ User has insufficient balance: ${userBalance.toString()} < ${depositAmount}`
    );
  }

  console.log('🔄 Executing deposit with user wallet...');

  // Create user vault contract instance for deposit
  const userVaultContract = new TokenVault(vaultContract.id, userWallet);

  try {
    const depositCall = await userVaultContract.functions
      .deposit()
      .callParams({
        forward: [depositAmount, assetIdString],
      })
      .call();

    await depositCall.waitForResult();
    console.log('✅ Deposit successful');
  } catch (error) {
    console.log(`❌ Deposit failed: ${error}`);
    throw error;
  }

  // Verify deposit (equivalent to Rust deposit verification)
  console.log('🔄 Verifying deposit...');
  
  try {
    const depositBalanceResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const depositBalanceCall = await depositBalanceResult.waitForResult();
    const depositBalance = depositBalanceCall.value;

    console.log(`✅ Got deposit balance: ${depositBalance}`);
    expect(Number(depositBalance)).toBe(depositAmount);
    console.log('✅ Deposit verification passed');
  } catch (error) {
    console.log(`❌ Failed to get deposit balance: ${error}`);
    throw error;
  }

  // Test withdrawal (equivalent to Rust withdrawal operation)
  const withdrawalAmount = 50_000;

  console.log(`🔄 Preparing withdrawal of ${withdrawalAmount} tokens...`);

  try {
    const withdrawCall = await userVaultContract.functions
      .withdraw(withdrawalAmount)
      .callParams({
        forward: [0, assetIdString], // No forward amount for withdrawal
      })
      .call();

    await withdrawCall.waitForResult();
    console.log('✅ Withdrawal successful');
  } catch (error) {
    console.log(`❌ Withdrawal failed: ${error}`);
    throw error;
  }

  // Verify withdrawal (equivalent to Rust withdrawal verification)
  console.log('🔄 Verifying withdrawal...');
  
  try {
    const remainingDepositResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const remainingDepositCall = await remainingDepositResult.waitForResult();
    const remainingDeposit = remainingDepositCall.value;

    console.log(`✅ Got remaining deposit balance: ${remainingDeposit}`);
    
    const expectedRemaining = depositAmount - withdrawalAmount;
    expect(Number(remainingDeposit)).toBe(expectedRemaining);
    console.log('✅ Withdrawal verification passed');
  } catch (error) {
    console.log(`❌ Failed to get remaining deposit balance: ${error}`);
    throw error;
  }

  // Check final user balance (equivalent to Rust final balance check)
  const finalUserBalance = await userWallet.getBalance(assetIdString);
  console.log(`💰 User final balance: ${finalUserBalance.toString()}`);

  console.log('✅ Vault deposit and withdrawal test passed');
});
