'use strict';

const AbstractCommand = require('./AbstractCommand');

class CleanCommand extends AbstractCommand {
  async beforeAction() {
    await this.transport.beforeRemove();
  }

  async action() {
    const config = this.config;

    const existedList = await this.transport.fetchBuildsList();
    const exceptionList = [this.config.version].concat(config.except);

    const list = this.filterExceptions(existedList, exceptionList);

    for (const build of list) {
      await this.transport.removeResource(build);
    }

    this.results = list;
  }

  async afterAction() {
    await this.transport.afterRemove();
  }

  filterExceptions(list, exceptions) {
    exceptions = exceptions.filter((ex) => {
      return typeof ex === 'string' && ex.length > 2;
    });

    return list.filter((build) => {
      return !exceptions.some(ex => build.includes(ex));
    });
  }
}

module.exports = CleanCommand;
