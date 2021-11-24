'use strict';

const fs = require('fs');
const path = require('path');
const { stderr: lineLog } = require('single-line-log');
const { AssetsInfo } = require('../utils/assets');
const { calcSha256Hash } = require('../utils/file');
const AbstractCommand = require('./AbstractCommand');
const MetaModifier = require('./MetaModifier');

class PublishCommand extends AbstractCommand {
  async beforeAction() {
    this.onProgress = this.onProgress.bind(this);

    this.metaModifier = new MetaModifier(
      this.transport,
      (metaJson, build, meta) => {
        this.results.push(build.idWithVersion);
        metaJson[build.id] = meta;
        return metaJson;
      }
    );

    return this.transport.beforeUpload();
  }

  async action() {
    const assetsInfo = new AssetsInfo(this.config);

    const builds = assetsInfo.getBuilds();
    if (builds.length < 1) {
      builds.push(assetsInfo.createBuild(''));
    }

    for (const build of builds) {
      await this.publish(build);
    }
  }

  async afterAction() {
    await this.metaModifier.updateMetaFile();
    await this.transport.afterUpload();
  }

  async publish(build) {
    this.transport.on('progress', this.onProgress);

    const assets = await this.publishAssets(build);

    if (build.platform === 'darwin') {
      await this.publishOsxReleaseFile(build, assets);
    }

    const meta = {
      ...this.config.fields,
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

    this.metaModifier.addBuild(build, meta);
  }

  /**
   * @param {Build} build
   * @return {Promise<object>} Assets urls
   */
  async publishAssets(build) {
    const assets = build.assets;
    const result = {};
    const uploaded = {};

    if (!Object.keys(assets).length) {
      const buildId = build.idWithVersion;
      throw new Error(
        `There are no assets for build ${buildId}. Check the dist folder.`
      );
    }

    for (const name in assets) {
      if (!assets.hasOwnProperty(name)) continue;

      const filePath = assets[name];
      if (!filePath) {
        continue;
      }

      if (uploaded[filePath] === undefined) {
        uploaded[filePath] = await this.transport.uploadFile(filePath, build);
        if (this.config.progress) {
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
      name: this.config.fields.name || '',
      notes: this.config.fields.notes || '',
      pub_date: new Date().toISOString(),
    };

    const releaseFilePath = path.join(this.config.distPath, 'release.json');
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
