'use strict';

var fs = require('fs');
var path = require('path');
var line = require('single-line-log').stdout;

module.exports = publish;
module.exports.NAME = 'publish';
module.exports.publishAssets = publishAssets;

function publish(build, options) {
  var transport = options.transport.instance;

  transport.on('progress', onProgress);

  return transport.beforeUpload(build).then(function () {
    return publishAssets(build, transport);
  }).then(function (assets) {
    if (build.platform === 'darwin') {
      return publishOsxReleaseFile(build, options, assets, transport);
    } else {
      return Promise.resolve(assets);
    }
  }).then(function (assets) {
    var data = Object.assign({}, options.fields, {
      update: assets.update,
      install: assets.install,
      version: build.version
    });
    if (build.platform === 'win32') {
      data.update = assets.metaFile.replace('/RELEASES', '');
    }

    return transport.updateUpdatesJson(build, data);
  }).then(function () {
    return transport.afterUpload(build);
  });
}

/**
 *
 * @param {object} build
 * @param {AbstractTransport} transport
 * @return {Promise.<object>} Assets urls
 */
function publishAssets(build, transport) {
  var assets = build.assets;
  var promise = Promise.resolve();
  var result = {};
  var uploaded = {};

  if (!Object.keys(assets).length) {
    var buildId = transport.getBuildId(build);
    throw new Error('There are no assets for build ' + buildId + '. Check the dist folder.');
  }

  var _loop = function _loop(name) {
    if (!assets.hasOwnProperty(name)) return 'continue';

    var filePath = assets[name];
    promise = promise.then(function () {
      if (uploaded[filePath] === undefined) {
        return transport.uploadFile(filePath, build);
      } else {
        return Promise.resolve(uploaded[filePath]);
      }
    }).then(function (fileUrl) {
      if (fileUrl) {
        result[name] = fileUrl;
      }
      uploaded[filePath] = fileUrl || '';
      line('');
    });
  };

  for (var name in assets) {
    var _ret = _loop(name);

    if (_ret === 'continue') continue;
  }

  return promise.then(function () {
    return result;
  });
}

function publishOsxReleaseFile(build, options, assets, transport) {
  var data = {
    url: assets.update,
    name: options.fields.name || '',
    notes: options.fields.notes || '',
    pub_date: new Date().toISOString()
  };

  var releaseFilePath = path.join(build.assetsPath, 'release.json');
  fs.writeFileSync(releaseFilePath, JSON.stringify(data, null, '  '));

  return transport.uploadFile(releaseFilePath, build).then(function (releaseUrl) {
    assets.update = releaseUrl;
    return assets;
  });
}

/**
 * @param {Object} progress
 * @param {string} progress.name
 * @param {number} progress.transferred
 * @param {number} progress.total
 */
function onProgress(progress) {
  var value = progress.transferred / progress.total;
  var percentage = Math.round(value * 100);

  var bar = new Array(Math.floor(50 * value)).join('█');
  while (bar.length < 49) {
    bar += '.';
  }

  var size = formatSize(progress.transferred) + ' / ' + formatSize(progress.total);

  line(['\nUploading ' + progress.name + '\n', '[' + bar + '] ' + percentage + '% (' + size + ')\n'].join(''));
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  var e = Math.floor(Math.log(bytes) / Math.log(1024));
  return +(bytes / Math.pow(1024, e)).toFixed(2) + ' ' + 'BKMGTP'.charAt(e).replace('B', '') + 'B';
}