'use strict';

const clean   = require('./CleanCommand');
const list    = require('./ListCommand');
const publish = require('./PublishCommand');
const remove  = require('./RemoveCommand');
const replace = require('./ReplaceCommand');

const COMMANDS = { clean, list, publish, remove, replace };

module.exports = {
  list: COMMANDS,
  createCommand,
};

/**
 * @param {Config} config
 * @param {AbstractTransport} transport
 * @return {AbstractCommand}
 */
function createCommand(config, transport) {
  const Command = COMMANDS[config.command];
  return new Command(config, transport);
}
