'use strict';

const Ftp = require('ftp');

class Client {
  constructor(options) {
    this.options = options;
  }

  connect() {
    this.ftp = new Ftp();
    return new Promise((resolve, reject) => {
      let ready = false;
      this.ftp.on('ready', () => {
        ready = true;
        resolve();
      });
      this.ftp.on('error', (error) => {
        if (!ready) reject(error);
      });
      this.ftp.connect(this.options);
    });
  }

  cwd(path) {
    return new Promise((resolve, reject) => {
      this.ftp.cwd(path, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }

  cwdUpdatesRoot() {
    return this.cwd(this.options.remotePath);
  }

  mkDirNoError(name) {
    return new Promise((resolve) => {
      this.ftp.mkdir(name, resolve);
    });
  }

  putFile(source, remotePath) {
    return new Promise((resolve, reject) => {
      this.ftp.put(source, remotePath, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }

  list() {
    return new Promise((resolve, reject) => {
      this.ftp.list(this.options.remotePath, (error, list) => {
        error ? reject(error) : resolve(list);
      });
    });
  }

  rmDir(remotePath) {
    return new Promise((resolve, reject) => {
      this.ftp.rmdir(remotePath, true, (error) => {
        error ? reject(error) : resolve();
      });
    });
  }

  close() {
    this.ftp.end();
  }
}

module.exports = Client;
