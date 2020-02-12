'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const NodeSsh = require('node-ssh');

const AbstractTransport = require('./AbstractTransport');

/**
 * @property {string}  options.metaFileName
 * @property {string}  options.remotePath
 * @property {string}  options.remoteUrl
 * @property {string}  options.username
 * @property {string}  options.password
 * @property {boolean} options.usePrivateKey
 * @property {string}  options.privateKeyPath
 * @property {string}  options.privateKey
 * @property {string}  options.afterUploadCommand
 * @property {string}  options.afterRemoveCommand
 */
class SshTransport extends AbstractTransport {
  normalizeOptions(options) {
    super.normalizeOptions(options);

    const REQUIRED = ['remoteUrl', 'remotePath'];
    for (const field of REQUIRED) {
      if (!options[field]) {
        throw new Error(`The transport.${field} option is not set`);
      }
    }

    if (!options.username) {
      options.username = os.userInfo().username;
    }

    options.usePrivateKey = options.password === undefined;

    if (options.usePrivateKey) {
      if (!options.privateKeyPath && !options.privateKey) {
        options.privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
      }

      if (options.privateKeyPath) {
        options.privateKey = fs.readFileSync(options.privateKeyPath, 'utf-8');
      }
    }
  }

  async init() {
    super.init();

    /**
     * @type {*}
     * @method execCommand
     * @method dispose
     */
    this.ssh = new NodeSsh();
    return this.ssh.connect(this.options);
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const remotePath = this.getRemoteFilePath(filePath, build);

    try {
      const remoteDir = path.dirname(remotePath);
      await this.ssh.mkdir(remoteDir, 'sftp');
    } catch (e) {
      if (e.code !== 4) throw e;
    }

    await this.ssh.putFile(filePath, remotePath, null, {
      step: (transferred, _, total) => {
        this.setProgress(filePath, transferred, total);
      },
    });

    return this.getFileUrl(filePath, build);
  }

  /**
   * Save uMetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const remotePath = this.options.remotePath;
    const fileName = this.replaceBuildTemplates(
      this.options.metaFileName,
      build
    );
    const remoteFile = path.posix.join(remotePath, fileName);

    const tmpPath = await this.saveTemporaryFile(
      JSON.stringify(data, null, '  ')
    );

    await this.ssh.execCommand(`rm -f ${remoteFile}`, { cwd: remotePath });
    await this.ssh.putFile(tmpPath, remoteFile);

    return this.getMetaFileUrl(build);
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    const result = await this.executeCommand('ls -F ', false);

    const dirs = (result.stdout || '').split('\n');
    return dirs
      .filter(f => Boolean(f.match(/\w+-\w+-\w+-[\w-.]+\//)))
      .map(f => f.slice(0, -1));
  }

  /**
   * @return {Promise}
   */
  async removeResource(resource) {
    // We need to make an additional check before exec rm -rf
    if (!resource.match(/\w+-\w+-\w+-v?\d+\.\d+\.\d+/)) {
      throw new Error(`Could not remove build ${resource}`);
    }

    if (this.options.remotePath.length < 2) {
      throw new Error('Wrong remote path ' + this.options.remotePath);
    }

    const result = await this.executeCommand('rm -rf ' + resource, false);
    if (result.code !== 0) {
      throw new Error(
        `Error while deleting a release ${resource}\n`
        + `${result.stdout}\n${result.stderr}`
      );
    }
  }

  async afterUpload() {
    return this.executeCommand(this.options.afterUploadCommand);
  }

  async afterRemove() {
    return this.executeCommand(this.options.afterRemoveCommand);
  }

  async close() {
    this.ssh.dispose();
  }

  getRemoteFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.remotePath,
      build.idWithVersion,
      this.normalizeFileName(localFilePath)
    );
  }

  async saveTemporaryFile(content) {
    const filePath = path.join(
      os.tmpdir(),
      'publisher-update-' + Number(new Date()) + '.json'
    );
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(filePath);
        }
      });
    });
  }

  async executeCommand(command, log = true) {
    if (!command) {
      return;
    }

    const result = await this.ssh.execCommand(command, {
      cwd: this.options.remotePath,
    });

    if (log) {
      console.info('Execute command: ' + command);
      console.info(result.stdout);
      console.info(result.stderr);
    }

    return result;
  }
}

module.exports = SshTransport;
