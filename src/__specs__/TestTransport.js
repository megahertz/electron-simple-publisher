'use strict';

const path = require('path');
const AbstractTransport = require('../transport/abstract');

class TestTransport extends AbstractTransport {
  constructor(options) {
    super(options);
    this.uploadFiles = [];
    this.updateFetches = 0;
    this.updatePushes = [];
    this.removes = [];
    this.listFetches = 0;
  }

  /**
   * Upload file to a hosting and get its url
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    return new Promise((resolve) => {
      this.uploadFiles.push(filePath);
      const url = 'http://example.com/' + this.getBuildId(build) + '/'
        + path.basename(filePath);
      resolve(url);
    });
  }

  /**
   * Get updates.json content from hosting
   * @abstract
   * @return {Promise<object>} data of updates.json
   */
  fetchUpdatesJson() {
    return new Promise((resolve) => {
      this.updateFetches++;

      const url = 'http://example.com/win32-x64-prod-v0.0.1';

      resolve({
        'win32-x64-prod': {
          'installUrl': `${url}/Example-0.0.1.exe`,
          'updateUrl': `${url}/Example-0.0.1.nullpkg`,
          'platform': 'win32',
          'version': '0.0.1',
          'readme': 'Version 0.0.1',
        },
      });
    });
  }

  /**
   * Save updates.json to a hosting
   * @abstract
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    return new Promise((resolve) => {
      this.updatePushes.push(data);
      resolve(
        'http://example.com/updates.json'
      );
    });
  }

  /**
   * @abstract
   * @return {Promise}
   */
  removeBuild(build) {
    return new Promise((resolve) => {
      this.removes.push(build);
      resolve();
    });
  }

  /**
   * @abstract
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    return new Promise((resolve) => {
      this.listFetches++;
      resolve([
        'win32-x64-prod-v0.0.2',
        'linux-x64-prod-v0.0.2',
      ]);
    });
  }
}

module.exports = TestTransport;
