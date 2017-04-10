'use strict';

const fs   = require('fs');
const path = require('path');
const Ftp  = require('./client');

const AbstractTransport = require('./../abstract');

class FtpTransport extends AbstractTransport {
  /**
   * @param {object} options
   * @param {object} options.transport
   * @param {string} options.transport.remoteUrl
   * @param {string} options.transport.remotePath
   * @param {string} options.transport.host
   * @param {string} options.transport.user
   * @param {string} options.transport.password
   */
  constructor(options) {
    super(options);
    this.normalizeOptions();
  }

  normalizeOptions() {
    const options = this.options;

    const REQUIRED = ['remoteUrl', 'remotePath', 'host', 'user', 'password'];
    for (const field of REQUIRED) {
      if (!options[field]) {
        throw new Error(`The transport.${field} option is not set`);
      }
    }

    if (options.remoteUrl.endsWith('/')) {
      options.remoteUrl = options.remoteUrl.slice(0, -1);
    }

    if (!this.commandOptions.updatesJsonUrl) {
      this.commandOptions.updatesJsonUrl = `${options.remoteUrl}/updates.json`;
    }
  }

  init() {
    this.ftp = new Ftp(this.options);
    this.q   = this.ftp.connect();
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    const buildId = this.getBuildId(build);
    const fileStream = this.makeProgressStream(filePath);

    return this.q
      .then(() => this.ftp.cwdUpdatesRoot())
      .then(() => this.ftp.mkDirNoError(buildId))
      .then(() => this.ftp.cwd(buildId))
      .then(() => this.ftp.putFile(fileStream, path.basename(filePath)))
      .then(() => this.getFileUrl(filePath, build));
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    const buffer = Buffer.from(JSON.stringify(data, null, '  '), 'utf8');
    return this.q
      .then(() => this.ftp.cwdUpdatesRoot())
      .then(() => this.ftp.putFile(buffer, 'updates.json'))
      .then(() => this.getUpdatesJsonUrl());
  }

  /**
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    return this.q
      .then(() => this.ftp.cwdUpdatesRoot())
      .then(() => this.ftp.list())
      .then((list) => {
        return list
          .map(item => item.name)
          .filter(name => name.match(/^\w+-\w+-\w+-[\w.]+$/));
      });
  }

  /**
   * @return {Promise}
   */
  removeBuild(build) {
    const buildId = this.getBuildId(build);
    return this.ftp.cwdUpdatesRoot()
      .then(() => this.ftp.rmDir(buildId));
  }

  close() {
    this.ftp.close();
    return super.close();
  }
}

module.exports = FtpTransport;