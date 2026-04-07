#!/usr/bin/env node

const { spawn } = require('node:child_process');

const cliArgs = process.argv.slice(2);

const isHelpRequest = cliArgs.includes('--help') || cliArgs.includes('-h');

const resolvePort = (args) => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;

    if (arg === '--port' || arg === '-p') {
      const next = args[index + 1];
      if (next && /^\d+$/.test(next)) {
        return next;
      }
      continue;
    }

    const inlineMatch = arg.match(/^--port=(\d+)$/);
    if (inlineMatch) {
      return inlineMatch[1];
    }
  }

  return process.env.EXPO_METRO_PORT || '8081';
};

const ensureCodespacesProxyUrl = (env, port) => {
  if (env.EXPO_PACKAGER_PROXY_URL) return;
  if (!env.CODESPACE_NAME || !env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) return;

  env.EXPO_PACKAGER_PROXY_URL = `https://${env.CODESPACE_NAME}-${port}.${env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
};

const expoArgs = ['expo', 'start'];
if (!isHelpRequest && !cliArgs.includes('--clear') && !cliArgs.includes('-c')) {
  expoArgs.push('--clear');
}
expoArgs.push(...cliArgs);

const env = { ...process.env };
if (!env.EXPO_UNSTABLE_HEADLESS) {
  env.EXPO_UNSTABLE_HEADLESS = '1';
}
ensureCodespacesProxyUrl(env, resolvePort(cliArgs));

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const child = spawn(npxCommand, expoArgs, {
  stdio: 'inherit',
  env,
});

child.on('error', (error) => {
  console.error('[start-expo] Failed to start Expo CLI.', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});