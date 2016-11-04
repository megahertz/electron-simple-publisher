'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const NodeSsh  = require('node-ssh');

const AbstractTransport = require('./abstract');

class SshTransport extends AbstractTransport {
  /**
   * @param {object}  options
   * @param {object}  options.transport
   * @param {string}  options.transport.remotePath
   * @param {string}  options.transport.remoteUrl
   * @param {string}  options.transport.username
   * @param {string}  options.transport.password
   * @param {boolean} options.transport.usePrivateKey
   * @param {string} options.transport.privateKeyPath
   * @param {string} options.transport.privateKey
   * @param {string} options.transport.afterUploadCommand
   * @param {string} options.transport.afterRemoveCommand
   */
  constructor(options) {
    super(options);
    this.normalizeOptions();
  }

  normalizeOptions() {
    const options = this.options;

    if (!this.commandOptions.updatesJsonUrl) {
      this.commandOptions.updatesJsonUrl = `${options.remoteUrl}/updates.json`;
    }

    if (!options.remoteUrl) {
      throw new Error('The transport.remoteUrl option is not set');
    }
    if (options.remoteUrl.endsWith('/')) {
      options.remoteUrl = options.remoteUrl.slice(0, -1);
    }
    if (!this.options.remotePath) {
      throw new Error('The transport.remotePath option is not set');
    }

    if (!options.username) {
      options.username = os.userInfo().username;
    }
    if (!options.password) {
      options.usePrivateKey = true;
    }
    if (options.usePrivateKey || !options.privateKeyPath || !options.privateKey) {
      options.privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
    }
    if (options.privateKeyPath) {
      options.privateKey = fs.readFileSync(options.privateKeyPath, 'utf-8');
    }
  }

  init() {
    /**
     * @type {{}}
     */
    this.ssh = new NodeSsh();
    this.q = this.ssh.connect(this.options);
    return this.q;
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    const remotePath = this.getRemoteFilePath(filePath, build);
    return this.q
      .then(() => {
        return this.ssh.putFile(filePath, remotePath);
      })
      .then(() => {
        return this.getFileUrl(filePath, build);
      });
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    const remotePath = path.posix.join(
      this.options.remotePath,
      'updates.json'
    );
    let tmpPath;
    return this.q
      .then(() => {
        //noinspection ES6ModulesDependencies,NodeModulesDependencies
        return this.saveTemporaryFile(JSON.stringify(data, null, '  '));
      })
      .then((filePath) => {
        tmpPath = filePath;
        // Whe should remove updates.json, otherwise only part of the file
        // will be rewritten
        return this.ssh.execCommand('rm -rf updates.json', {
          cwd: this.options.remotePath
        });
      })
      .then(() => {
        return this.ssh.putFile(tmpPath, remotePath);
      })
      .then(() => {
        return this.getUpdatesJsonUrl();
      });
  }

  /**
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    return this.executeCommand('ls -F ', false)
      .then((result) => {
        const dirs = (result.stdout || '').split('\n');
        return dirs
          .filter(f => f.match(/\w+-\w+-\w+-[\w.]+\//))
          .map(f => f.slice(0, -1));
      });
  }

  /**
   * @return {Promise}
   */
  removeBuild(build) {
    const buildId = this.getBuildId(build);

    // We need to make an additional check before exec rm -rf
    if (!buildId.match(/\w+-\w+-\w+-v\d+\.\d+\.\d+/)) {
      return Promise.reject(`Could not remove build ${buildId}`);
    }
    if (this.options.remotePath.length < 2) {
      return Promise.reject('Wrong remote path ' + this.options.remotePath);
    }

    return this.executeCommand('rm -rf ' + buildId, false)
      .then((result) => {
        if (result.code === 0) return;

        return Promise.reject(
          `Error while deleting a release ${buildId}\n` +
          `${result.stdout}\n${result.stderr}`
        );
      });
  }

  afterUpload(build) {
    return this.executeCommand(this.options.afterUploadCommand);
  }

  afterRemove(build) {
    return this.executeCommand(this.options.afterRemoveCommand);
  }

  close() {
    this.ssh.dispose();
    return Promise.resolve();
  }

  getRemoteFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.remotePath,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    );
  }

  getFileUrl(localFilePath, build) {
    let url = this.options.remoteUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }

    return [
      url,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    ].join('/');
  }

  //noinspection JSMethodCanBeStatic
  normalizeFileName(fileName) {
    fileName = path.basename(fileName);
    return fileName.replace(/\s/g, '-');
  }

  saveTemporaryFile(content) {
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

  executeCommand(command, log = true) {
    if (!command) {
      return Promise.resolve();
    }

    return this.q
      .then(() => {
        return this.ssh.execCommand(command, { cwd: this.options.remotePath });
      })
      .then((result) => {
        if (log) {
          console.log('Execute command: ' + command);
          console.log(result.stdout);
          console.log(result.stderr);
        }
        return result;
      });
  }
}

module.exports = SshTransport;