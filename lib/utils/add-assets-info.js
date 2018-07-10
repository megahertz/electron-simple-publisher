'use strict';

const fs   = require('fs');
const path = require('path');

module.exports.addAssetsInfo = addAssetsInfo;
module.exports.getAvailableBuilds = getAvailableBuilds;

const ASSETS_DATA = {
  'darwin-x64': {
    install: [
      '{productName}-{version}.dmg',
      path.join('mac', '{productName}-{version}.dmg')
    ],
    metaFile: null,
    update: [
      '{productName}-{version}-mac.zip',
      '{productName}-darwin-x64-{version}.zip',
      path.join('mac', '{productName}-{version}-mac.zip')
    ]
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
  'linux-armv7l': {
    install: '{name}-{version}-armv7l.AppImage',
    metaFile: null,
    update: '{name}-{version}-armv7l.AppImage'
  },
  'win32-ia32': {
    install: [
      path.join('squirrel-windows-ia32', '{productName} Setup {version}.exe'),
      path.join('win-ia32', '{productName} Setup {version}.exe'),
      path.join('win-ia32', '{productName} Setup {version}-ia32.exe')
    ],
    metaFile: [
      path.join('squirrel-windows-ia32', 'RELEASES'),
      path.join('win-ia32', 'RELEASES')
    ],
    update: [
      path.join('squirrel-windows-ia32', '{name}-{version}-full.nupkg'),
      path.join('win-ia32', '{name}-{version}-full.nupkg')
    ]
  },
  'win32-x64': {
    install: [
      path.join('squirrel-windows', '{productName} Setup {version}.exe'),
      path.join('win', '{productName} Setup {version}.exe')
    ],
    metaFile: [
      path.join('squirrel-windows', 'RELEASES'),
      path.join('win', 'RELEASES')
    ],
    update: [
      path.join('squirrel-windows', '{name}-{version}-full.nupkg'),
      path.join('win', '{name}-{version}-full.nupkg')
    ]
  }
};

function addAssetsInfo(build, options) {
  const name = `${build.platform}-${build.arch}`;
  const meta = ASSETS_DATA[name];
  if (!meta) {
    throw new Error(`Unknown build type ${name}`);
  }

  const assetsPath = path.resolve(options.path);
  const assets = Object.keys(meta).reduce((result, name) => {
    const filePath = resolveAssetPath(assetsPath, meta[name], options);
    if (filePath) {
      result[name] = filePath;
    }

    return result;
  }, {});

  return Object.assign({
    assets,
    assetsPath
  }, build);
}

// https://github.com/electron-userland/electron-builder/issues/651
function convertWindowsVersion(version) {
  const parts = version.split('-');
  const mainVersion = parts.shift();

  if (parts.length > 0) {
    return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
  }

  return mainVersion;
}

function resolveAssetPath(assetsPath, assetMask, options, exception = true) {
  if (!assetMask) return null;

  if (Array.isArray(assetMask)) {
    const filePath = assetMask
      .map((mask) => resolveAssetPath(assetsPath, mask, options, false))
      .find(Boolean);

    return filePath || resolveAssetPath(assetsPath, assetMask[0], options);
  }

  const version = /\.nupkg$/.test(assetMask)
    ? convertWindowsVersion(options.version)
    : options.version;

  const json = options.packageJson;
  const fileName = assetMask
    .replace('{name}', json.name)
    .replace('{productName}', json.productName || json.name)
    .replace('{version}', version);
  const filePath = path.join(assetsPath, fileName);

  if (!fs.existsSync(filePath)) {
    if (exception) {
      throw new Error(
        `File ${filePath} doesn't exists. You can try to check if:\n` +
        ' - electron-builder successfully made a build\n' +
        ' - electron-builder and electron-simple-publisher are up to date\n' +
        ' - if nothing helps please create a new github issue. Don\'t forget ' +
        'to include electron-builder version to the bug report.'
      );
    }

    return false;
  }

  return filePath;
}

function getAvailableBuilds(options) {
  const assetsPath = path.resolve(options.path);

  return getInstallersArrayMap()
    .map(([build, installerMask]) => {
      return [build, resolveAssetPath(assetsPath, installerMask, options, false)];
    })
    .filter(([build, installerPath]) => {
      return Boolean(installerPath);
    })
    .map(([build]) => {
      return build;
    })
    .filter((build, index, builds) => {
      return builds.indexOf(build) === index;
    });
}

function getInstallersArrayMap() {
  return Object.keys(ASSETS_DATA)
    .reduce((sum, key) => {
      let installers = ASSETS_DATA[key].install;
      if (typeof installers === 'string') {
        installers = [installers];
      }

      installers.forEach((installerPath) => {
        sum.push([key, installerPath]);
      });

      return sum;
    }, []);
}
