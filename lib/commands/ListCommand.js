'use strict';

const AbstractCommand = require('./AbstractCommand');

class ListCommand extends AbstractCommand {
  async action() {
    this.results = await this.transport.fetchBuildsList();
    console.log(this.results);
  }

  async run() {
    await this.action();

    if (this.results.length > 0) {
      console.error('Releases on the hosting:');
      console.log(this.results.join('\n'));
    } else {
      console.error('There are no releases on the hosting.');
    }
  }
}

module.exports = ListCommand;
