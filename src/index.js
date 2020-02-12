#! /usr/bin/env node

'use strict';

const { createCommand } = require('./commands');
const { createTransport } = require('./transport');
const { getConfig } = require('./utils/config');

module.exports = run;

if (require.main === module) {
  const config = getConfig();

  run(config)
    .catch((e) => {
      console.error(config.debugMode ? e : e.message);
      process.exit(1);
    });
}

async function run(config) {
  if (config.getErrors().length > 0) {
    throw new Error(config.getErrors().join('.\n'));
  }

  const transport = createTransport(config);
  const command = createCommand(config, transport);

  await command.run();
  await transport.close();
}
