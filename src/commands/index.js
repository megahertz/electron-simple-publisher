'use strict';

const clean   = require('./CleanCommand');
const list    = require('./ListCommand');
const publish = require('./PublishCommand');
const remove  = require('./RemoveCommand');
const replace = require('./ReplaceCommand');
const showConfig = require('./ConfigCommand');

const commandsList = {
  clean,
  config: showConfig,
  list,
  publish,
  remove,
  replace,
};

module.exports = {
  commandsList,
  createCommand,
};

/**
 * @param {Config} config
 * @param {AbstractTransport} transport
 * @return {AbstractCommand}
 */
function createCommand(config, transport) {
  const Command = commandsList[config.command];
  return new Command(config, transport);
}
