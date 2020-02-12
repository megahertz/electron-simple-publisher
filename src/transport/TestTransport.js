'use strict';

const path = require('path');
const AbstractTransport = require('./AbstractTransport');

class TestTransport extends AbstractTransport {
  constructor(config) {
    super(config);
    this.uploadFiles = [];
    this.updateFetches = 0;
    this.updatePushes = [];
    this.removes = [];
    this.listFetches = 0;
  }

  /**
   * Upload file to a hosting and get its url
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    this.uploadFiles.push(filePath);
    return `http://example.com/${build.idWithVersion}/`
      + path.basename(filePath);
  }

  /**
   * Get MetaFile content from hosting
   * @param {Build} build
   * @return {Promise<object>} data of MetaFile
   */
  async fetchMetaFile(build) {
    this.updateFetches++;

    const url = 'http://example.com/win32-x64-prod-v0.0.1';

    return {
      'win32-x64-prod': {
        'installUrl': `${url}/Example-0.0.1.exe`,
        'updateUrl': `${url}/Example-0.0.1.nullpkg`,
        'platform': 'win32',
        'version': '0.0.1',
        'readme': 'Version 0.0.1',
      },
    };
  }

  /**
   * Save MetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    this.updatePushes.push(data);
    return 'http://example.com/updates.json';
  }

  /**
   * @abstract
   * @param {string} resource
   * @return {Promise}
   */
  async removeResource(resource) {
    this.removes.push(resource);
  }

  /**
   * @abstract
   * @return {Promise<string[]>}
   */
  async fetchBuildsList() {
    this.listFetches++;
    return [
      'win32-x64-prod-v0.0.2',
      'linux-x64-prod-v0.0.2',
    ];
  }
}

module.exports = TestTransport;
