// Cross-platform launcher for scripts/seedCostTracker.ts.
// Sets ts-node's compiler overrides via process.env before registering hooks,
// so this works identically on Windows (cmd/PowerShell) and POSIX shells
// without needing inline `VAR=value` script syntax or a cross-env dependency.
process.env.TS_NODE_PROJECT = 'tsconfig.json';
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node' });

require('dotenv/config');
require('ts-node/register');
require('tsconfig-paths/register');
require('./seedCostTracker.ts');
