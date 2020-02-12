'use strict';

const Build = require('../utils/Build');
const AbstractCommand = require('./AbstractCommand');
const MetaModifier = require('./MetaModifier');

class RemoveCommand extends AbstractCommand {
  async beforeAction() {
    this.metaModifier = new MetaModifier(
      this.transport,
      (json, build) => {
        this.results.push(build.idWithVersion);

        if (json[build.id] && build.version === json[build.id].version) {
          delete json[build.id];
        }

        return json;
      }
    );

    return this.transport.beforeRemove();
  }

  async action() {
    const builds = Build.normalizeMany(this.config.builds);

    for (const build of builds) {
      if (!build.hasCompleteSpecification()) {
        throw new Error(
          `Wrong buildId "${build}", required: platform-arch-channel-version`
        );
      }

      await this.remove(build);
    }
  }

  async afterAction() {
    await this.metaModifier.updateMetaFile();
    await this.transport.afterRemove();
  }

  /**
   * @param {Build} build
   * @return {Promise<void>}
   */
  async remove(build) {
    await this.transport.removeResource(build.idWithVersion);
    this.metaModifier.addBuild(build);
  }
}

module.exports = RemoveCommand;
