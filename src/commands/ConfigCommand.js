'use strict';

const AbstractCommand = require('./AbstractCommand');

class ConfigCommand extends AbstractCommand {
  async run() {
    console.info(this.config);
    process.exit();
  }
}

module.exports = ConfigCommand;
