'use strict';

const fs   = require('fs');
const path = require('path');

module.exports = addAssetsInfo;
module.exports.replaceAssetTemplate = replaceAssetTemplate;
module.exports.replaceMaskByPath    = replaceMaskByPath;

const ASSETS_DATA = {
  'linux-ia32': {
    dir: '',
    assets: {
      update: '{version}-ia32.AppImage',
      install: '{version}-ia32.AppImage',
      metaFile: null
    }
  },
  'linux-x64': {
    dir: '',
    assets: {
      update: '{version}-x86_64.AppImage',
      install: '{version}-x86_64.AppImage',
      metaFile: null
    }
  },
  'darwin-x64': {
    dir: '',
    assets: {
      update: 'mac/{version}-mac.zip',
      install: '{version}.dmg',
      metaFile: null
    }
  },
  'win32-ia32': {
    dir: 'win-ia32',
    assets: {
      update: '{version}-full.nupkg',
      install: '{version}-ia32.exe',
      metaFile: 'RELEASES'
    }
  },
  'win32-x64': {
    dir: 'win',
    assets: {
      update: '{version}-full.nupkg',
      install: '{version}.exe',
      metaFile: 'RELEASES'
    }
  }
};

function addAssetsInfo(build, options) {
  const name = `${build.platform}-${build.arch}`;
  const meta = ASSETS_DATA[name];
  if (!meta) {
    throw new Error(`Unknown build type ${name}`);
  }

  const assetsPath = path.resolve(options.path || 'dist', meta.dir);
  const files = fs.readdirSync(assetsPath);

  let assets = meta.assets;
  assets = replaceAssetTemplate(assets, build.version);
  assets = replaceMaskByPath(assets, files, assetsPath);

  return Object.assign({ assets, assetsPath }, build);
}

function replaceAssetTemplate(assets, version) {
  const result = {};
  for (let name in assets) {
    if (!assets.hasOwnProperty(name)) continue;
    if (!assets[name]) continue;

    result[name] = assets[name].replace('{version}', version);
  }
  return result;
}

function replaceMaskByPath(assets, files, dirPath) {
  const keys = Object.keys(assets);

  return keys.reduce((result, name) => {
    const mask = assets[name];
    const fileName = files.filter(f => f.endsWith(mask))[0];
    if (fileName) {
      result[name] = path.join(dirPath, fileName);
    } else {
      console.warn(`File with mask ${mask} is not found at ${dirPath}`);
    }
    return result;
  }, {});
}