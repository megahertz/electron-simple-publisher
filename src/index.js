#! /usr/bin/env node

'use strict';

const commands = require('./commands');
const getOptionsFromCli = require('./utils/get-options-from-cli');
const normalizeOptions = require('./utils/normalize-options');

module.exports = run;
if (require.main === module) {
  main();
}

function main() {
  const cliOptions = getOptionsFromCli(process.argv.slice(2));
  run(cliOptions)
    .catch((e) => {
      console.error(cliOptions.debug ? e : e.message);
      process.exit(1);
    });
}

async function run(options) {
  let transport;

  try {
    options = normalizeOptions(options);
    transport = options.transport.instance;
    transport.init();
  } catch (e) {
    return Promise.reject(e);
  }

  const Command = commands[options.command];
  if (!Command) {
    throw new Error(`Unknown command ${options.command}`);
  }

  /** @type AbstractCommand */
  const command = new Command(options);
  await command.run();
  await transport.close();
}
