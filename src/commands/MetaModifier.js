'use strict';

class MetaModifier {
  /**
   * @param {AbstractTransport} transport
   * @param {function} modifyFunction
   */
  constructor(transport, modifyFunction) {
    this.transport = transport;
    this.modifyFunction = modifyFunction;

    /**
     * @type {Array<{ build: Build, additionalData: * }>}
     */
    this.builds = [];
  }

  addBuild(build, additionalData = undefined) {
    this.builds.push({ build, additionalData });
  }

  async updateMetaFile() {
    const buildsByUrl = this.groupBuildsByUrl();

    for (const url in buildsByUrl) {
      if (!buildsByUrl.hasOwnProperty(url)) continue;
      const buildPairs = buildsByUrl[url];
      const firstBuild = buildPairs[0].build;

      let meta = await this.transport.fetchMetaFile(firstBuild);

      for (const { build, additionalData } of buildPairs) {
        meta = this.modifyFunction(meta, build, additionalData);
      }

      await this.transport.pushMetaFile(meta, firstBuild);
    }
  }

  groupBuildsByUrl() {
    const urls = {};

    for (const buildPair of this.builds) {
      const url = this.transport.getMetaFileUrl(buildPair.build);
      if (!urls[url]) {
        urls[url] = [];
      }

      urls[url].push(buildPair);
    }

    return urls;
  }
}

module.exports = MetaModifier;
