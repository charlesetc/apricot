#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];

if (command === 'run' || !command) {
  process.chdir(path.join(__dirname, '..'));
  execSync('npm run start', { stdio: 'inherit' });
} else {
  console.log('Usage: npx apricot-notes [run]');
  process.exit(1);
}