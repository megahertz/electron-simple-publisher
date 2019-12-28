'use strict';

const AbstractCommand = require('./AbstractCommand');
const PublishCommand  = require('./PublishCommand');
const RemoveCommand   = require('./RemoveCommand');

class ReplaceCommand extends AbstractCommand {
  async beforeAction() {
    this.publisCommand = new PublishCommand(this.options);
    this.removeCommand = new RemoveCommand(this.options);

    await this.publisCommand.beforeAction();
    await this.removeCommand.beforeAction();
  }

  async action() {
    await this.removeCommand.action();
    await this.publisCommand.action();
  }

  async afterAction() {
    await this.transport.afterRemove();
    await this.publisCommand.afterAction();

    this.results = this.publisCommand.results;
  }
}

module.exports = ReplaceCommand;
