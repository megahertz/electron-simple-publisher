'use strict';

const http = require('httpreq');

/**
 * @abstract
 */
class AbstractTransport {
  /**
   * @param {object} options
   * @param {object} options.transport
   * @param {string} options.transport.module
   * @param {string} options.updatesJsonUrl the content of the main package.json
   */
  constructor(options) {
    /**
     * @type {{transport: Object, updatesJsonUrl: String}}
     */
    this.commandOptions = options;
    this.options = options.transport;
  }

  /**
   * Initialize a transport
   * @return {Promise}
   */
  init() {
    return Promise.resolve();
  }

  /**
   * Upload file to a hosting and return its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    throw new Error('Not implemented');
  }

  /**
   * Save updates.json to a hosting
   * @abstract
   * @param {object} data updates.json content
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    throw new Error('Not implemented');
  }

  /**
   * Remove the build from a hosting
   * @abstract
   * @param {object} build
   * @return {Promise}
   */
  removeBuild(build) {
    throw new Error('Not implemented');
  }

  /**
   * Return an array with all builds stored on a hosting
   * @abstract
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    throw new Error('Not implemented');
  }

  //noinspection JSMethodCanBeStatic
  /**
   * Do a custom work before uploading
   * @param {object} build
   * @return {Promise}
   */
  beforeUpload(build) {
    return Promise.resolve(build);
  }

  /**
   * Do a custom work after uploading
   * @param {object} build
   * @return {Promise}
   */
  afterUpload(build) {
    return Promise.resolve();
  }

  //noinspection JSMethodCanBeStatic,JSUnusedLocalSymbols
  /**
   * Do a custom work before removing
   * @param {object} build
   * @return {Promise}
   */
  beforeRemove(build) {
    return Promise.resolve();
  }

  /**
   * Do a custom work after removing
   * @param {object} build
   * @return {Promise}
   */
  afterRemove(build) {
    return Promise.resolve();
  }

  /**
   * Do a custom work for freeing resources here
   * @return {Promise}
   */
  close() {
    return Promise.resolve();
  }

  /**
   * Get updates.json content from hosting
   * By default, this method just fetch this file through http
   * @return {Promise<object>} data of updates.json
   */
  fetchUpdatesJson() {
    return new Promise((resolve, reject) => {
      http.get(this.getUpdatesJsonUrl(), (err, res) => {
        if (err) {
          console.log(err);
          return reject(err);
        }

        if (res.statusCode !== 200) {
          reject(
            'Could not get updates.json. A hosting response is ' +
            `${res.statusCode} ${res.body}`
          );
        }

        try {
          resolve(JSON.parse(res.body));
        } catch (e) {
          throw new Error('Error while parsing updates.json: ' + e);
        }
      });
    });
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
        const buildId = this.getBuildId(build, false);
        if (typeof data === 'object') {
          json[buildId] = data;
        } else {
          if (json[buildId] && build.version === json[buildId].version) {
            delete json[buildId];
          }
        }
        return json;
      })
      .then((json) => {
        return this.pushUpdatesJson(json);
      });
  }

  /**
   * Return an url to updates.json
   * @return {string}
   */
  getUpdatesJsonUrl() {
    let url = this.commandOptions.updatesJsonUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }

  /**
   * Convert a build object to buildId string
   * @param {object} build
   * @param {boolean} includeVersion
   * @return {string}
   */
  getBuildId(build = null, includeVersion = true) {
    const { platform, arch, channel, version } = (build || this.commandOptions);
    if (includeVersion) {
      return `${platform}-${arch}-${channel}-v${version}`;
    } else {
      return `${platform}-${arch}-${channel}`;
    }
  }
}

module.exports = AbstractTransport;