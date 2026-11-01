#!/usr/bin/env -S node --no-warnings
import { runCli } from '../dist/cli.js';

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
