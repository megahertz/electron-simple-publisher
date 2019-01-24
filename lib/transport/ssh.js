'use strict';

/* eslint-disable no-unused-vars */

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const NodeSsh  = require('node-ssh');

const AbstractTransport = require('./abstract');

class SshTransport extends AbstractTransport {
  /**
   * @param {Object}  options
   * @param {string}  options.remotePath
   * @param {string}  options.remoteUrl
   * @param {string}  options.username
   * @param {string}  options.password
   * @param {boolean} options.usePrivateKey
   * @param {string}  options.privateKeyPath
   * @param {string}  options.privateKey
   * @param {string}  options.afterUploadCommand
   * @param {string}  options.afterRemoveCommand
   */
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
        const remoteDir = path.dirname(remotePath);
        return this.ssh.mkdir(remoteDir, 'sftp');
      })
      .catch((err) => {
        if (err.code !== 4) throw err;
      })
      .then(() => {
        return this.ssh.putFile(filePath, remotePath, null, {
          step: (transferred, _, total) => {
            this.setProgress(filePath, transferred, total);
          },
        });
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
        return this.ssh.execCommand('rm -f updates.json', {
          cwd: this.options.remotePath,
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
          .filter(f => Boolean(f.match(/\w+-\w+-\w+-[\w-.]+\//)))
          .map(f => f.slice(0, -1));
      });
  }

  /**
   * @return {Promise}
   */
  removeBuild(build, resolveName = true) {
    const buildId = resolveName ? this.getBuildId(build) : build;

    // We need to make an additional check before exec rm -rf
    if (resolveName && !buildId.match(/\w+-\w+-\w+-v\d+\.\d+\.\d+/)) {
      return Promise.reject(`Could not remove build ${buildId}`);
    }
    if (this.options.remotePath.length < 2) {
      return Promise.reject('Wrong remote path ' + this.options.remotePath);
    }

    return this.executeCommand('rm -rf ' + buildId, false)
      .then((result) => {
        if (result.code === 0) return;

        return Promise.reject(
          `Error while deleting a release ${buildId}\n`
          + `${result.stdout}\n${result.stderr}`
        );
      });
  }

  afterUpload() {
    return this.executeCommand(this.options.afterUploadCommand);
  }

  afterRemove() {
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
