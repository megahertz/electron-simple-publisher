'use strict';

class AbstractCommand {
  /**
   * @param {Config} config
   * @param {AbstractTransport} transport
   */
  constructor(config, transport) {
    /**
     * @type {Config}
     */
    this.config = config;

    /**
     * @type {AbstractTransport}
     */
    this.transport = transport;

    /**
     * @type {string[]}
     */
    this.results = [];

    /**
     * @type {string}
     */
    this.name = this.constructor.name.replace('Command', '').toLowerCase();
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
    await this.transport.init();

    await this.beforeAction();
    await this.action();
    await this.afterAction();

    const actionVerb = this.name + (this.name.slice(-1) === 'e' ? 'd' : 'ed');
    this.showResult(this.results, actionVerb);
  }

  showResult(list, verb) {
    if (list && list.length > 0) {
      console.error(`Successfully ${verb}:`);
      console.info(list.join('\n'));
    } else {
      console.error(`Nothing was ${verb}.`);
    }
  }
}

module.exports = AbstractCommand;
