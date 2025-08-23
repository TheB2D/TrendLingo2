#!/usr/bin/env node

import { program } from 'commander';
import { listen } from './commands/listen';

program
  .name('browser-use')
  .description('CLI to some JavaScript string utilities')
  .version('0.8.0')
  .addCommand(listen)
  .parse(process.argv);
