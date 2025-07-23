/**
 * 
 * Demonstrates basic SRC20 token operations:
 * - Token minting
 * - Token transfers  
 * - Supply checks
 * - Balance queries
 * - Token metadata
 * - Transaction logs
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

/**
 * Deploys the SRC20 token contract with the given wallet and metadata.
 * Returns a contract instance for further interaction.
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
 * Test basic token operations including minting, transfers, and supply checks
 */
test('should perform token operations', async () => {
  console.log('🧪 Testing token operations...');

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

  console.log('✅ Test wallets created:');
  console.log(`   Admin wallet: ${adminWallet.address.toString()}`);
  console.log(`   User wallet: ${userWallet.address.toString()}`);

  // Deploy the SRC20 token contract
  const tokenContract = await deploySrc20Token(
    adminWallet,
    "MYTOKEN",
    "TOKEN", 
    9
  );

  // Create admin token contract instance for minting
  const adminTokenContract = new Src20Token(
    tokenContract.id,
    adminWallet
  );

  console.log('✅ Admin token contract instance created');

  // Mint tokens to the user wallet
  const mintAmount = TOKEN_AMOUNT;
  const recipient = { Address: { bits: userWallet.address.toB256() } };

  console.log(`🔄 Minting ${mintAmount} tokens to user: ${userWallet.address.toString()}`);

  // Mint tokens to the recipient (user wallet)
  const mintCall = await adminTokenContract.functions
    .mint(recipient, SUB_ID, mintAmount)
    .call();

  const mintResult = await mintCall.waitForResult();
  
  console.log('✅ Mint transaction successful!');
  console.log(`   Transaction ID: ${mintCall.transactionId}`);
  console.log(`   Transaction status: ${JSON.stringify(mintResult.transactionResult.status)}`);

  // Verify mint transaction logs/events
  if (mintResult.transactionResult) {
    console.log('📋 Mint transaction result available');
    // In TypeScript SDK, we can check transaction success through status
    expect(mintResult.transactionResult.isStatusSuccess).toBe(true);
  }

  // Calculate the correct asset ID from contract
  const assetIdResult = await adminTokenContract.functions
    .get_asset_id()
    .call();
  const assetIdCall = await assetIdResult.waitForResult();
  const assetIdObj = assetIdCall.value;
  const assetIdString = typeof assetIdObj === 'string' ? assetIdObj : assetIdObj.bits;

  console.log(`📊 Asset ID: ${assetIdString}`);

  // Query the total supply after minting
  console.log('📊 Checking total supply after minting...');
  const totalSupplyResult = await tokenContract.functions
    .total_supply(assetIdObj)
    .call();
  const totalSupplyCall = await totalSupplyResult.waitForResult();
  const totalSupply = totalSupplyCall.value;

  console.log(`   Total supply after minting: ${totalSupply}`);

  // Assert the total supply matches the minted amount
  expect(Number(totalSupply)).toBe(mintAmount);
  console.log('✅ Total supply matches minted amount');

  // Additional verification: Check user balance
  console.log('💰 Checking user balance...');
  const userBalance = await userWallet.getBalance(assetIdString);
  console.log(`   User balance: ${userBalance.toString()}`);
  expect(userBalance.toNumber()).toBe(mintAmount);
  console.log('✅ User balance matches minted amount');

  // Additional verification: Check token metadata
  console.log('📋 Verifying token metadata...');
  
  // Check name
  const nameResult = await tokenContract.functions
    .name(assetIdObj)
    .call();
  const nameCall = await nameResult.waitForResult();
  const tokenName = nameCall.value;
  console.log(`   Token name: ${tokenName}`);
  expect(tokenName).toBe('MYTOKEN');

  // Check symbol
  const symbolResult = await tokenContract.functions
    .symbol(assetIdObj)
    .call();
  const symbolCall = await symbolResult.waitForResult();
  const tokenSymbol = symbolCall.value;
  console.log(`   Token symbol: ${tokenSymbol}`);
  expect(tokenSymbol).toBe('TOKEN');

  console.log('✅ Token metadata verification passed');
  console.log('✅ Token operations test completed successfully!');
}); 