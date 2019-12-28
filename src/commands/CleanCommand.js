'use strict';

const AbstractCommand = require('./AbstractCommand');

class CleanCommand extends AbstractCommand {
  async beforeAction() {
    await this.transport.beforeRemove();
  }

  async action() {
    const options = this.options;
    const updatesJson = await this.transport.fetchUpdatesJson();

    if (updatesJson.isEmpty) {
      console.warn('Can\'t clean because updates.json is not available.');
      return [];
    }

    const existedList = await this.transport.fetchBuildsList();
    const exceptionList = this
      .extractKeysFromUpdatesJson(updatesJson)
      .concat(options.except);

    const list = this.filterExceptions(existedList, exceptionList);

    for (const build of list) {
      await this.transport.removeBuild(build, false);
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

  extractKeysFromUpdatesJson(updatesJson) {
    const values = Object.values(updatesJson).reduce((keys, section) => {
      if (!section) return keys;

      Object.values(section).forEach((str) => {
        if (!str.match) return;

        const matches = str.match(/((\w+-){1,3}v\d+\.\d+\.\d+(-\w+)?)/);
        if (matches && matches[1]) {
          keys.push(matches[1]);
        }
      });

      return keys;
    }, []);

    return [...new Set(values)];
  }
}

module.exports = CleanCommand;
