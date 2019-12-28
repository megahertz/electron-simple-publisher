'use strict';

const AbstractCommand = require('./AbstractCommand');

class RemoveCommand extends AbstractCommand {
  async beforeAction() {
    this.removedBuilds = [];
    return this.transport.beforeRemove();
  }

  async action() {
    for (const build of this.options.builds) {
      await this.remove(build);
    }
  }

  async afterAction() {
    const json = await this.transport.fetchUpdatesJson();

    for (const build of this.removedBuilds) {
      const buildId = this.transport.getBuildId(build, false);
      this.results.push(this.transport.getBuildId(build));

      if (json[buildId] && build.version === json[buildId].version) {
        delete json[buildId];
      }
    }

    await this.transport.pushUpdatesJson(json);

    await this.transport.afterRemove();
  }

  async remove(build) {
    await this.transport.removeBuild(build);
    this.removedBuilds.push(build);
  }
}

module.exports = RemoveCommand;
