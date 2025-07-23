/**
 * Vault Operations Tests (TypeScript)
 * 
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

// Common test constants
const TOKEN_AMOUNT = 1_000_000;
const SUB_ID_ARRAY = new Uint8Array(32).fill(0);
const SUB_ID = '0x' + Array.from(SUB_ID_ARRAY, byte => byte.toString(16).padStart(2, '0')).join('');

/**
 * Helper function to format amounts with commas
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString();
}

/**
 * Helper function to truncate addresses for display
 */
function formatAddress(address: string): string {
  return `${address.slice(0, 10)}...`;
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
  
  return new TokenVault(deployedContract.id, wallet);
}

/**
 * Test vault deposit and withdrawal functionality
 */
test('should handle vault deposit and withdrawal', async () => {
  console.log('\nVAULT OPERATIONS TEST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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

  console.log(`\nWallets initialized:`);
  console.log(`  Admin: ${formatAddress(adminWallet.address.toString())}`);
  console.log(`  User:  ${formatAddress(userWallet.address.toString())}`);

  // Deploy contracts
  console.log('\nCONTRACT DEPLOYMENT');
  console.log('────────────────────────────────────────────────────');

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

  console.log('All contracts deployed successfully');
  console.log(`  Token:   ${formatAddress(tokenContract.id.toString())}`);
  console.log(`  Vault:   ${formatAddress(vaultContract.id.toString())}`);
  console.log(`  CrossCC: ${formatAddress(crossContractCallContract.id.toString())}`);

  // Mint tokens to the user wallet
  console.log('\nTOKEN MINTING');
  console.log('────────────────────────────────────────────────────');

  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: userWallet.address.toB256() } };
  const adminTokenContract = new Src20Token(tokenContract.id, adminWallet);

  console.log(`Minting ${formatAmount(mintAmount)} VAULT tokens to user (${formatAddress(userWallet.address.toString())})`);
  
  try {
    const mintCall = await adminTokenContract.functions
      .mint(recipient, SUB_ID, mintAmount)
      .call();

    await mintCall.waitForResult();
  } catch (error) {
    throw new Error(`Mint failed: ${error}`);
  }

  // Get asset ID and check user balance
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  const userBalance = await userWallet.getBalance(assetIdString);
  console.log(`Mint completed | Balance: ${formatAmount(userBalance.toNumber())} VAULT`);

  // Deposit tokens into the vault
  console.log('\nVAULT DEPOSIT');
  console.log('────────────────────────────────────────────────────');

  const depositAmount = 100_000;

  console.log(`Depositing ${formatAmount(depositAmount)} VAULT tokens...`);

  // Check if user has enough balance
  if (userBalance.toNumber() < depositAmount) {
    throw new Error(
      `Insufficient balance: ${formatAmount(userBalance.toNumber())} < ${formatAmount(depositAmount)}`
    );
  }

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
  } catch (error) {
    throw new Error(`Deposit failed: ${error}`);
  }

  // Verify deposit
  try {
    const depositBalanceResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const depositBalanceCall = await depositBalanceResult.waitForResult();
    const depositBalance = depositBalanceCall.value;

    expect(Number(depositBalance)).toBe(depositAmount);
    console.log(`Deposit completed | Vault balance: ${formatAmount(Number(depositBalance))} VAULT`);
  } catch (error) {
    throw new Error(`Failed to verify deposit: ${error}`);
  }

  // Test withdrawal
  console.log('\nVAULT WITHDRAWAL');
  console.log('────────────────────────────────────────────────────');

  const withdrawalAmount = 50_000;

  console.log(`Withdrawing ${formatAmount(withdrawalAmount)} VAULT tokens...`);

  try {
    const withdrawCall = await userVaultContract.functions
      .withdraw(withdrawalAmount)
      .callParams({
        forward: [0, assetIdString], // No forward amount for withdrawal
      })
      .call();

    await withdrawCall.waitForResult();
  } catch (error) {
    throw new Error(`Withdrawal failed: ${error}`);
  }

  // Verify withdrawal
  try {
    const remainingDepositResult = await vaultContract.functions
      .get_deposit({ Address: { bits: userWallet.address.toB256() } })
      .call();
    const remainingDepositCall = await remainingDepositResult.waitForResult();
    const remainingDeposit = remainingDepositCall.value;
    
    const expectedRemaining = depositAmount - withdrawalAmount;
    expect(Number(remainingDeposit)).toBe(expectedRemaining);
    console.log(`Withdrawal completed | Remaining vault balance: ${formatAmount(Number(remainingDeposit))} VAULT`);
  } catch (error) {
    throw new Error(`Failed to verify withdrawal: ${error}`);
  }

  // Final summary
  console.log('\nTEST SUMMARY');
  console.log('────────────────────────────────────────────────────');

  const finalUserBalance = await userWallet.getBalance(assetIdString);
  console.log(`Final user wallet balance: ${formatAmount(finalUserBalance.toNumber())} VAULT`);
  console.log(`Final vault balance: ${formatAmount(depositAmount - withdrawalAmount)} VAULT`);
  console.log('All vault operations completed successfully');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
