'use strict';

const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const AbstractTransport = require('../AbstractTransport');
const FtpClient = require('./FtpClient');

/**
 * @property {string} options.metaFileName
 * @property {string} options.remoteUrl
 * @property {string} options.remotePath
 * @property {string} options.host
 * @property {string} options.user
 * @property {string} options.password
 */
class FtpTransport extends AbstractTransport {
  normalizeOptions(options) {
    super.normalizeOptions(options);

    const REQUIRED = ['remoteUrl', 'remotePath', 'host', 'user', 'password'];
    for (const field of REQUIRED) {
      if (!options[field]) {
        throw new Error(`The transport.${field} option is empty`);
      }
    }
  }

  async init() {
    super.init();

    this.ftp = new FtpClient(this.options);
    return this.ftp.connect();
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const buildId = build.idWithVersion;
    const fileStream = this.makeProgressStream(filePath);

    await this.ftp.cwdUpdatesRoot();
    await this.ftp.mkDirNoError(buildId);
    await this.ftp.cwd(buildId);
    await this.ftp.putFile(fileStream, path.basename(filePath));
    return this.getFileUrl(filePath, build);
  }

  /**
   * Save MetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const buffer = Buffer.from(JSON.stringify(data, null, '  '), 'utf8');

    const fileName = this.replaceBuildTemplates(
      this.options.metaFileName,
      build
    );

    await this.ftp.cwdUpdatesRoot();
    await this.ftp.putFile(buffer, fileName);
    return this.getMetaFileUrl(build);
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    await this.ftp.cwdUpdatesRoot();
    const list = await this.ftp.list();
    return list
      .map(item => item.name)
      .filter(name => name.match(/^\w+-\w+-\w+-[\w.]+$/));
  }

  /**
   * @param {string} resource
   * @return {Promise}
   */
  async removeResource(resource) {
    await this.ftp.cwdUpdatesRoot();
    return this.ftp.rmDir(resource);
  }

  async close() {
    this.ftp.close();
    return super.close();
  }

  /**
   * @param {string} filePath
   * @return {module:stream.internal.Transform|ReadStream}
   */
  makeProgressStream(filePath) {
    const readSteam = fs.createReadStream(filePath);
    if (!this.config.progress) {
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

module.exports = FtpTransport;
