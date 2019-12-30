'use strict';

const fs = require('fs');
const path = require('path');
const { stderr: lineLog } = require('single-line-log');
const AbstractCommand = require('./AbstractCommand');
const { calcSha256Hash } = require('../utils/file');

class PublishCommand extends AbstractCommand {
  async beforeAction() {
    this.publishedBuilds = [];
    this.onProgress = this.onProgress.bind(this);
    return this.transport.beforeUpload();
  }

  async action() {
    for (const build of this.options.builds) {
      await this.publish(build);
    }
  }

  async afterAction() {
    const json = await this.transport.fetchUpdatesJson();

    for (const [name, meta] of this.publishedBuilds) {
      const buildId = this.transport.getBuildId(name, false);
      this.results.push(this.transport.getBuildId(name));
      json[buildId] = meta;
    }

    await this.transport.pushUpdatesJson(json);

    await this.transport.afterUpload();
  }

  async publish(build) {
    this.transport.on('progress', this.onProgress);

    const assets = await this.publishAssets(build);

    if (build.platform === 'darwin') {
      await this.publishOsxReleaseFile(build, assets);
    }

    const meta = {
      ...this.options.fields,
      update:  assets.update,
      install: assets.install,
      version: build.version,
    };

    if (build.platform === 'win32') {
      meta.update = assets.metaFile.replace('/RELEASES', '');
    }

    if (build.platform === 'linux') {
      meta.sha256 = await calcSha256Hash(build.assets.update);
    }

    this.publishedBuilds.push([build, meta]);
  }

  /**
   * @param {object} build
   * @return {Promise<object>} Assets urls
   */
  async publishAssets(build) {
    const assets = build.assets;
    const result = {};
    const uploaded = {};

    if (!Object.keys(assets).length) {
      const buildId = this.transport.getBuildId(build);
      throw new Error(
        `There are no assets for build ${buildId}. Check the dist folder.`
      );
    }

    for (const name in assets) {
      if (!assets.hasOwnProperty(name)) continue;

      const filePath = assets[name];
      if (uploaded[filePath] === undefined) {
        uploaded[filePath] = await this.transport.uploadFile(filePath, build);
        if (!this.options.noprogress) {
          lineLog('');
        }
      }

      result[name] = uploaded[filePath];
    }

    return result;
  }

  async publishOsxReleaseFile(build, meta) {
    const data = {
      url: meta.update,
      name: this.options.fields.name || '',
      notes: this.options.fields.notes || '',
      pub_date: new Date().toISOString(),
    };

    const releaseFilePath = path.join(build.assetsPath, 'release.json');
    fs.writeFileSync(releaseFilePath, JSON.stringify(data, null, '  '));

    meta.update = await this.transport.uploadFile(releaseFilePath, build);

    return meta;
  }

  /**
   * @param {Object} progress
   * @param {string} progress.name
   * @param {number} progress.transferred
   * @param {number} progress.total
   * @private
   */
  onProgress(progress) {
    const value = progress.transferred / progress.total;
    const percentage = Math.round(value * 100);

    let bar = new Array(Math.floor(50 * value)).join('█');
    while (bar.length < 49) {
      bar += '.';
    }

    const size = this.formatSize(progress.transferred)
      + ' / ' + this.formatSize(progress.total);

    lineLog([
      `\nUploading ${progress.name}\n`,
      `[${bar}] ${percentage}% (${size})\n`,
    ].join(''));
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const e = Math.floor(Math.log(bytes) / Math.log(1024));
    // eslint-disable-next-line no-restricted-properties
    return +(bytes / (Math.pow(1024, e))).toFixed(2) + ' '
      + 'BKMGTP'.charAt(e).replace('B', '') + 'B';
  }
}

module.exports = PublishCommand;
