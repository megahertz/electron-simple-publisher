'use strict';

const fs   = require('fs');
const path = require('path');

const AbstractTransport = require('./AbstractTransport');

/**
 * @property {string} options.metaFileName
 * @property {string} options.outPath
 */
class LocalTransport extends AbstractTransport {
  normalizeOptions(options) {
    super.normalizeOptions(options);

    if (!options.outPath) {
      options.outPath = 'dist/publish';
    }
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const outPath = this.getOutFilePath(filePath, build);
    await copyFile(filePath, outPath);
    return this.getFileUrl(filePath, build);
  }

  /**
   * Save MetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const opts = this.options;
    const outPath = this.replaceBuildTemplates(
      path.join(opts.outPath, opts.metaFileName),
      build
    );

    fs.mkdirSync(opts.outPath, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(data, null, '  '));

    return this.getMetaFileUrl(build);
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    let builds;
    try {
      builds = fs.readdirSync(this.options.outPath)
        .filter((file) => {
          const stat = fs.statSync(path.join(this.options.outPath, file));
          return stat.isDirectory();
        });
    } catch (e) {
      builds = [];
    }

    return builds;
  }

  /**
   * @return {Promise}
   */
  async removeResource(subDir) {
    return fs.promises.rmdir(
      path.join(this.options.outPath, subDir),
      { recursive: true }
    );
  }

  /**
   * @param {string} localFilePath
   * @param {Build} build
   * @return {string}
   * @private
   */
  getOutFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.outPath,
      build.idWithVersion,
      this.normalizeFileName(localFilePath)
    );
  }
}

module.exports = LocalTransport;

async function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return new Promise(((resolve, reject) => {
    const readStream = fs.createReadStream(source);
    readStream.on('error', rejectCleanup);

    const writeStream = fs.createWriteStream(target);
    writeStream.on('error', rejectCleanup);
    writeStream.on('finish', resolve);

    readStream.pipe(writeStream);

    function rejectCleanup(err) {
      readStream.destroy();
      writeStream.end();
      reject(err);
    }
  }));
}
