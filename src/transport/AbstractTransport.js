'use strict';

const { EventEmitter } = require('events');
const http = require('httpreq');
const path = require('path');

const IGNORE_WARNING = 'You can ignore this warning if you run this command '
  + 'for the first time.';

/**
 * @abstract
 * @property {string} options.metaFileName
 * @property {string} options.remoteUrl
 * @property {string} options.metaFileUrl
 */
class AbstractTransport extends EventEmitter {
  /**
   * @param {Config} config
   */
  constructor(config) {
    super();

    /**
     * @type {Config}
     */
    this.config = config;
    this.options = config.transport;
  }

  normalizeOptions(options) {
    if (options.remoteUrl && options.remoteUrl.endsWith('/')) {
      options.remoteUrl = options.remoteUrl.slice(0, -1);
    }

    if (!options.metaFileName) {
      options.metaFileName = '{platform}-{arch}-{channel}.json';
    }

    if (!options.metaFileUrl && options.remoteUrl) {
      options.metaFileUrl = `${options.remoteUrl}/${options.metaFileName}`;
    }

    if (!options.metaFileUrl && this.config.metaFileUrl) {
      options.metaFileUrl = this.config.metaFileUrl;
    }

    if (!options.metaFileUrl) {
      throw new Error(
        'You should set either a package.json:updater.url option or '
        + 'metaFileUrl option'
      );
    }
  }

  /**
   * Initialize a transport
   * @return {Promise}
   */
  async init() {
    this.normalizeOptions(this.options);
  }

  /**
   * Upload file to a hosting and return its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    throw new Error('Not implemented');
  }

  /**
   * Save MetaFile to a hosting
   * @abstract
   * @param {object} data meta content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    throw new Error('Not implemented');
  }

  /**
   * Remove the resource (build id) from a hosting
   * @abstract
   * @param {string} resource
   * @return {Promise}
   */
  async removeResource(resource) {
    throw new Error('Not implemented');
  }

  /**
   * Return an array with all builds stored on a hosting
   * @abstract
   * @return {Promise<string[]>}
   */
  async fetchBuildsList() {
    throw new Error('Not implemented');
  }

  /**
   * Do a custom work before uploading
   * @return {Promise}
   */
  async beforeUpload() {
    // nothing by default
  }

  /**
   * Do a custom work after uploading
   * @return {Promise}
   */
  async afterUpload() {
    // nothing by default
  }

  /**
   * Do a custom work before removing
   * @return {Promise}
   */
  async beforeRemove() {
    // nothing by default
  }

  /**
   * Do a custom work after removing
   * @return {Promise}
   */
  async afterRemove() {
    // nothing by default
  }

  /**
   * Do a custom work for freeing resources here
   * @return {Promise}
   */
  async close() {
    // nothing by default
  }

  /**
   * Get MetaFile content from hosting
   * By default, this method just fetch this file through http
   * @param {Build} build
   * @return {Promise<object>} data of MetaFile
   */
  async fetchMetaFile(build) {
    const empty = {};

    Object.defineProperty(empty, 'isEmpty', {
      configurable: false,
      enumerable: false,
      value: true,
      writable: false,
    });

    return new Promise((resolve) => {
      http.get(this.getMetaFileUrl(build), (err, res) => {
        if (err) {
          if (this.config.debugMode) {
            console.warn(
              `Could not get MetaFile. ${IGNORE_WARNING} `
              + `An error occurred ${err.message}`
            );
          }

          resolve(empty);
          return;
        }

        if (res.statusCode !== 200) {
          if (this.config.debugMode) {
            console.warn(
              `Could not get MetaFile. ${IGNORE_WARNING} A hosting `
              + `response is:\n${res.statusCode} ${res.body}`
            );
          }

          resolve(empty);
          return;
        }

        try {
          resolve(JSON.parse(res.body));
        } catch (e) {
          console.warn('Unable to parse MetaFile', IGNORE_WARNING, e);
          resolve(empty);
        }
      });
    });
  }

  /**
   * Return an url to MetaFile
   * @param {Build} build
   * @return {string}
   */
  getMetaFileUrl(build) {
    let url = this.options.metaFileUrl;

    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    if (!build) {
      return url;
    }

    return this.replaceBuildTemplates(url, build);
  }

  /**
   * Replace templates in a string by build fields
   * @param {string} pathWithTemplates
   * @param {Build} build
   * @return {string}
   */
  replaceBuildTemplates(pathWithTemplates, build) {
    return pathWithTemplates
      .replace(/{platform}/g, build.platform)
      .replace(/{arch}/g, build.arch)
      .replace(/{channel}/g, build.channel);
  }

  normalizeFileName(fileName) {
    fileName = path.basename(fileName);
    return fileName.replace(/\s/g, '-');
  }

  /**
   * @param {string} localFilePath
   * @param {Build} build
   * @return {string}
   */
  getFileUrl(localFilePath, build) {
    let url = this.options.remoteUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    return [
      url,
      build.idWithVersion,
      this.normalizeFileName(localFilePath),
    ].join('/');
  }

  setProgress(fileName, transferred, total) {
    this.emit('progress', {
      transferred,
      total,
      name: path.basename(fileName),
    });
  }
}

module.exports = AbstractTransport;
