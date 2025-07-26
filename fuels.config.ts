import { createConfig } from 'fuels';

export default createConfig({
  contracts: [
    'sway-programs/contracts/cross-contract-call',
    'sway-programs/contracts/src20-token',
    'sway-programs/contracts/token-vault',
  ],
  predicates: [
    'sway-programs/predicates/multi-sig',
  ],
  scripts: [
    'sway-programs/scripts/multi-asset-transfer',
    'sway-programs/scripts/multi-sig-debug',
  ],
  output: './src/sway-api',
});

/**
 * Check the docs:
 * https://docs.fuel.network/docs/fuels-ts/fuels-cli/config-file/
 */
