'use strict';

/* eslint-disable no-unused-vars */

const EventEmitter = require('events').EventEmitter;
const fs           = require('fs');
const path         = require('path');
const Transform    = require('stream').Transform;
const http         = require('httpreq');

const IGNORE_WARNING = 'You can ignore this warning if you run this command '
  + 'for the first time.';

/**
 * @abstract
 */
class AbstractTransport extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} options.transport
   * @param {string} options.transport.module
   * @param {string} options.updatesJsonUrl the content of the main package.json
   */
  constructor(options) {
    super();

    /**
     * @type {{transport: Object, updatesJsonUrl: String}}
     */
    this.commandOptions = options;
    this.options = options.transport;

    this.normalizeOptions(this.options);
  }

  normalizeOptions(options) {
    if (options.remoteUrl && options.remoteUrl.endsWith('/')) {
      options.remoteUrl = options.remoteUrl.slice(0, -1);
    }

    if (!this.commandOptions.updatesJsonUrl && options.remoteUrl) {
      this.commandOptions.updatesJsonUrl = `${options.remoteUrl}/updates.json`;
    }

    if (!this.commandOptions.updatesJsonUrl) {
      throw new Error(
        'You should set either a package.json:updater.url option or '
        + 'updatesJsonUrl option'
      );
    }
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
   * @param {boolean} resolveName If ture, build is resolved to buildId
   * @return {Promise}
   */
  removeBuild(build, resolveName = true) {
    throw new Error('Not implemented');
  }

  /**
   * Return an array with all builds stored on a hosting
   * @abstract
   * @return {Promise<string[]>}
   */
  fetchBuildsList() {
    throw new Error('Not implemented');
  }

  //noinspection JSMethodCanBeStatic
  /**
   * Do a custom work before uploading
   * @return {Promise}
   */
  beforeUpload() {
    return Promise.resolve();
  }

  /**
   * Do a custom work after uploading
   * @return {Promise}
   */
  afterUpload() {
    return Promise.resolve();
  }

  /**
   * Do a custom work before removing
   * @return {Promise}
   */
  beforeRemove() {
    return Promise.resolve();
  }

  /**
   * Do a custom work after removing
   * @return {Promise}
   */
  afterRemove() {
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
    const empty = {};
    Object.defineProperty(empty, 'isEmpty', {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    });

    return new Promise((resolve) => {
      http.get(this.getUpdatesJsonUrl(), (err, res) => {
        if (err) {
          console.warn(
            `Could not get updates.json. ${IGNORE_WARNING} `
            + `An error occurred ${err.message}`
          );
          resolve(empty);
          return;
        }

        if (res.statusCode !== 200) {
          console.warn(
            `Could not get updates.json. ${IGNORE_WARNING} A hosting `
            + `response is:\n${res.statusCode} ${res.body}`
          );
          resolve(empty);
          return;
        }

        try {
          resolve(JSON.parse(res.body));
        } catch (e) {
          console.warn('Unable to parse updates.json', IGNORE_WARNING, e);
          resolve(empty);
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
          // eslint-disable-next-line no-lonely-if
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
    }

    return `${platform}-${arch}-${channel}`;
  }

  //noinspection JSMethodCanBeStatic
  normalizeFileName(fileName) {
    fileName = path.basename(fileName);
    return fileName.replace(/\s/g, '-');
  }

  getFileUrl(localFilePath, build) {
    let url = this.options.remoteUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    return [
      url,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath),
    ].join('/');
  }

  setProgress(fileName, transferred, total) {
    fileName = path.basename(fileName);
    this.emit('progress', {
      transferred,
      total,
      name: fileName,
    });
  }

  makeProgressStream(filePath) {
    const readSteam = fs.createReadStream(filePath);

    if (this.commandOptions.noprogress) {
      return readSteam;
    }

    const self = this;
    const totalSize = fs.statSync(filePath).size;
    let uploaded = 0;

    const transform = new Transform();
    // eslint-disable-next-line no-underscore-dangle
    transform._transform = function updateProgress(chunk, enc, cb) {
      this.push(chunk);
      uploaded += chunk.length;
      self.setProgress(filePath, uploaded, totalSize);
      cb();
    };

    return readSteam.pipe(transform);
  }
}

module.exports = AbstractTransport;
