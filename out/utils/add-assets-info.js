'use strict';

var fs = require('fs');
var path = require('path');

module.exports = addAssetsInfo;

var ASSETS_DATA = {
  'darwin-x64': {
    install: ['{productName}-{version}.dmg', path.join('mac', '{productName}-{version}.dmg')],
    metaFile: null,
    update: ['{productName}-{version}-mac.zip', path.join('mac', '{productName}-{version}-mac.zip')]
  },
  'linux-ia32': {
    install: '{name}-{version}-ia32.AppImage',
    metaFile: null,
    update: '{name}-{version}-ia32.AppImage'
  },
  'linux-x64': {
    install: '{name}-{version}-x86_64.AppImage',
    metaFile: null,
    update: '{name}-{version}-x86_64.AppImage'
  },
  'win32-ia32': {
    install: path.join('win-ia32', '{productName} Setup {version}-ia32.exe'),
    metaFile: path.join('win-ia32', 'RELEASES'),
    update: path.join('win-ia32', '{name}-{version}-full.nupkg')
  },
  'win32-x64': {
    install: path.join('win', '{productName} Setup {version}.exe'),
    metaFile: path.join('win', 'RELEASES'),
    update: path.join('win', '{name}-{version}-full.nupkg')
  }
};

function addAssetsInfo(build, options) {
  var name = build.platform + '-' + build.arch;
  var meta = ASSETS_DATA[name];
  if (!meta) {
    throw new Error('Unknown build type ' + name);
  }

  var assetsPath = path.resolve(options.path || 'dist');
  var assets = Object.keys(meta).reduce(function (result, name) {
    var filePath = resolveAssetPath(assetsPath, meta[name], options);
    if (filePath) {
      result[name] = filePath;
    }

    return result;
  }, {});

  return Object.assign({
    assets: assets,
    assetsPath: assetsPath
  }, build);
}

function resolveAssetPath(assetsPath, assetMask, options) {
  var exception = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

  if (!assetMask) return null;

  if (Array.isArray(assetMask)) {
    var _filePath = assetMask.map(function (mask) {
      return resolveAssetPath(assetsPath, mask, options, false);
    }).find(Boolean);

    return _filePath || resolveAssetPath(assetsPath, assetMask[0], options);
  }

  var json = options.packageJson;
  var fileName = assetMask.replace('{name}', json.name).replace('{productName}', json.productName || json.name).replace('{version}', options.version);
  var filePath = path.join(assetsPath, fileName);

  if (!fs.existsSync(filePath)) {
    if (exception) {
      throw new Error('File ' + filePath + ' doesn\'t exists. You can try to check if:\n' + ' - electron-builder successfully made a build\n' + ' - electron-builder and electron-simple-publisher are up to date\n' + ' - if nothing helps please create a new github issue. Don\'t forget ' + 'to include electron-builder version to the bug report.');
    }

    return false;
  }

  return filePath;
}