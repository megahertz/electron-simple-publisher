'use strict';

const fs       = require('fs');
const os       = require('os');
const path     = require('path');
const http     = require('httpreq');
const NodeSsh  = require('node-ssh');

const AbstractTransport = require('./abstract');

class SshTransport extends AbstractTransport {
  constructor(options) {
    super(options);
    options = this.options;

    if (!this.options.remotePath) {
      throw new Error('Publisher, ssh: remotePath option is not set');
    }

    if (options.remoteUrl && options.remoteUrl.endsWith('/')) {
      options.remoteUrl = options.remoteUrl.slice(0, -1);
    }

    if (!options.username) {
      options.username = os.userInfo().username;
    }
    if (!options.password) {
      options.usePrivateKey = true;
    }
    if (options.usePrivateKey || !options.privateKeyPath) {
      options.privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
    }
    if (options.privateKeyPath) {
      options.privateKey = fs.readFileSync(options.privateKeyPath, 'utf-8');
    }
  }

  init() {
    this.ssh = new NodeSsh();
    this.q = this.ssh.connect(this.options);
    return this.q;
  }

  beforeUpload(build) {
    return this.q;
  }

  afterUpload(build) {
    if (this.options.afterCommand) {
      return this.q
        .then(() => {
          return this.ssh.execCommand(this.options.afterCommand);
        })
        .then((result) => {
          console.log('Execute command: ' + this.options.afterCommand);
          console.log(result.stdout);
          console.log(result.stderr);
        });
    }
    return Promise.resolve();
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
   * Get updates.json content from hosting
   * @return {Promise<object>} data of updates.json
   */
  fetchUpdatesJson() {
    return new Promise((resolve, reject) => {
      http.get(this.getUpdatesJsonUrl(), (err, res) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          if (res.statusCode === 200) {
            resolve(JSON.parse(res.body));
          } else {
            resolve({});
          }
        }
      });
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
    return this.q
      .then(() => {
        return this.ssh.execCommand('ls -F', {
          cwd: this.options.remotePath
        });
      })
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
    return this.q
      .then(() => {
        if (this.options.remotePath.length < 2) {
          throw new Error('Wrong remote path ' + this.options.remotePath);
        }
        if (!buildId.match(/\w+-\w+-\w+-v\d+\.\d+\.\d+/)) {
          throw new Error(`Could not remove build ${buildId}`);
        }
        return this.ssh.execCommand('rm -rf ' + buildId, {
          cwd: this.options.remotePath
        });
      })
      .then((result) => {
        if (result.code === 0) {
          return Promise.resolve();
        } else {
          return Promise.reject(
            `Error while deleting a release ${buildId}\n` +
            `${result.stdout}\n` +
            `${result.stderr}`
          );
        }
      });
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
    if (!this.options.remoteUrl) {
      throw new Error('Publisher, ssh: remoteUrl option is not set');
    }

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

  getUpdatesJsonUrl() {
    let url = this.commandOptions.updatesJsonUrl;
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    if (!url) {
      url = `${this.options.remoteUrl}/updates.json`;
    }
    return url;
  }
}

module.exports = SshTransport;