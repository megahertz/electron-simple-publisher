'use strict';

const path = require('path');
const Ftp  = require('./client');

const AbstractTransport = require('./../abstract');

class FtpTransport extends AbstractTransport {
  /**
   * @param {Object} options
   * @param {string} options.remoteUrl
   * @param {string} options.remotePath
   * @param {string} options.host
   * @param {string} options.user
   * @param {string} options.password
   */
  normalizeOptions(options) {
    super.normalizeOptions(options);

    const REQUIRED = ['remoteUrl', 'remotePath', 'host', 'user', 'password'];
    for (const field of REQUIRED) {
      if (!options[field]) {
        throw new Error(`The transport.${field} option is not set`);
      }
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
  removeBuild(build, resolveName = true) {
    const buildId = resolveName ? this.getBuildId(build) : build;
    return this.ftp.cwdUpdatesRoot()
      .then(() => this.ftp.rmDir(buildId));
  }

  close() {
    this.ftp.close();
    return super.close();
  }
}

module.exports = FtpTransport;
