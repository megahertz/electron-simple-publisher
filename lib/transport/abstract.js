'use strict';

/**
 * @abstract
 */
class AbstractTransport {
  constructor(options) {
    this.commandOptions = options;
    this.options = options.transport;
  }

  init() {
    return Promise.resolve();
  }

  /**
   * Prepare before uploading
   * @param {object} build
   * @return {Promise}
   */
  beforeUpload(build) {
    return Promise.resolve(build);
  }

  /**
   * Prepare before uploading
   * @param {object} build
   * @return {Promise}
   */
  afterUpload(build) {
    return Promise.resolve();
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    throw new Error('Not implemented');
  }

  /**
   * Get updates.json content from hosting
   * @abstract
   * @return {Promise<object>} data of updates.json
   */
  fetchUpdatesJson() {
    throw new Error('Not implemented');
  }

  /**
   * Save updates.json to a hosting
   * @abstract
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    throw new Error('Not implemented');
  }

  /**
   * @abstract
   * @return {Promise}
   */
  removeBuild(build) {
    throw new Error('Not implemented');
  }

  /**
   * @abstract
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    throw new Error('Not implemented');
  }

  /**
   *
   * @return {Promise}
   */
  close() {
    return Promise.resolve();
  }

  /**
   * Update one section of updates.json
   * @param {object} build
   * @param {object} data
   * @return {Promise.<string>} Updates json url
   */
  updateUpdatesJson(build, data) {
    return this.fetchUpdatesJson()
      .then((json) => {
        json = json || {};
        if (typeof data === 'object') {
          json[this.getBuildId(build)] = data;
        } else {
          delete json[this.getBuildId(build)];
        }
        return json;
      })
      .then((json) => {
        return this.pushUpdatesJson(json);
      });
  }

  getBuildId(build = null) {
    if (typeof build === 'string') {
      return build;
    }
    const { platform, arch, channel, version } = (build || this.commandOptions);
    return `${platform}-${arch}-${channel}-v${version}`;
  }
}

module.exports = AbstractTransport;