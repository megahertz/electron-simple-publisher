'use strict';

const fs   = require('fs');
const path = require('path');

module.exports = publish;
module.exports.NAME = 'publish';
module.exports.publishAssets = publishAssets;


function publish(build, options) {
  const transport = options.transport.instance;

  return transport.beforeUpload(build)
    .then(() => {
      return publishAssets(build, transport);
    })
    .then((assets) => {
      if (build.platform === 'darwin') {
        return publishOsxReleaseFile(build, options, assets, transport);
      } else {
        return Promise.resolve(assets);
      }
    })
    .then((assets) => {
      const data = Object.assign({}, options.fields, {
        update:  assets.update,
        install: assets.install,
        version: build.version
      });
      if (build.platform === 'win32') {
        data.update = assets.metaFile.replace('/RELEASES', '');
      }
      return transport.updateUpdatesJson(build, data);
    })
    .then((updatesJsonUrl) => {
      return transport.afterUpload(updatesJsonUrl);
    });
}

/**
 *
 * @param {object} build
 * @param {AbstractTransport} transport
 * @return {Promise.<object>} Assets urls
 */
function publishAssets(build, transport) {
  const assets = build.assets;
  let promise = Promise.resolve();
  const result = {};
  const uploaded = {};

  for (let name in assets) {
    if (!assets.hasOwnProperty(name)) continue;

    const filePath = assets[name];
    promise = promise
      .then(() => {
        if (uploaded[filePath] === undefined) {
          return transport.uploadFile(filePath, build);
        } else {
          return Promise.resolve(uploaded[filePath]);
        }
      })
      .then((fileUrl) => {
        if (fileUrl) {
          result[name] = fileUrl;
        }
        uploaded[filePath] = fileUrl || '';
      });
  }

  return promise.then(() => result);
}

function publishOsxReleaseFile(build, options, assets, transport) {
  const data = {
    url: assets.update,
    name: options.fields.name || '',
    notes: options.fields.notes || '',
    pub_date: new Date().toISOString()
  };

  const releaseFilePath = path.join(build.assetsPath, 'release.json');
  fs.writeFileSync(releaseFilePath, JSON.stringify(data, null, '  '));

  return transport.uploadFile(releaseFilePath, build)
    .then((releaseUrl) => {
      assets.update = releaseUrl;
      return assets;
    });
}