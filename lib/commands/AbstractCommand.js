'use strict';

class AbstractCommand {
  constructor(options) {
    this.name = this.constructor.name
      .replace('Command', '').toLowerCase();

    this.results = [];

    this.options = options;

    if (!options.transport) {
      return;
    }

    /** @type {AbstractTransport} */
    this.transport = options.transport.instance;
  }

  async beforeAction() {
    return Promise.resolve();
  }

  async action() {
    throw new Error('Not implemented');
  }

  async afterAction() {
    return Promise.resolve();
  }

  async run() {
    await this.beforeAction();
    await this.action();
    await this.afterAction();

    const actionVerb = this.name + (this.name.slice(-1) === 'e' ? 'd' : 'ed');
    this.showResult(this.results, actionVerb);
  }

  showResult(list, verb) {
    if (list && list.length > 0) {
      console.error(`Successfully ${verb}:`);
      console.log(list.join('\n'));
    } else {
      console.error(`Nothing was ${verb}.`);
    }
  }
}

module.exports = AbstractCommand;
