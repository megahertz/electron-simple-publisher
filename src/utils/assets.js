'use strict';

const fs = require('fs');
const path = require('path');
const Build = require('./Build');

const ASSETS_DATA = {
  'darwin-arm64': {
    install: [
      '{productName}-{version}-arm64.dmg',
    ],
    metaFile: null,
    update: [
      '{productName}-{version}-arm64-mac.zip',
    ],
  },
  'darwin-x64': {
    install: [
      '{productName}-{version}.dmg',
      path.join('mac', '{productName}-{version}.dmg'),
    ],
    metaFile: null,
    update: [
      '{productName}-{version}-mac.zip',
      '{productName}-darwin-x64-{version}.zip',
      path.join('mac', '{productName}-{version}-mac.zip'),
    ],
  },
  'linux-ia32': {
    install: [
      '{productName}-{version}-ia32.AppImage',
      '{productName} {version} i386.AppImage',
      '{name}-{version}-ia32.AppImage',
    ],
    metaFile: null,
    update: [
      '{productName}-{version}-ia32.AppImage',
      '{productName} {version} i386.AppImage',
      '{name}-{version}-ia32.AppImage',
    ],
  },
  'linux-x64': {
    install: [
      '{productName}-{version}.AppImage',
      '{productName} {version}.AppImage',
      '{name}-{version}-x86_64.AppImage',
    ],
    metaFile: null,
    update: [
      '{productName}-{version}.AppImage',
      '{productName} {version}.AppImage',
      '{name}-{version}-x86_64.AppImage',
    ],
  },
  'linux-armv7l': {
    install: [
      '{productName}-{version}-armv7l.AppImage',
      '{productName} {version} armv7l.AppImage',
      '{name}-{version}-armv7l.AppImage',
    ],
    metaFile: null,
    update: [
      '{productName} {version}-armv7l.AppImage',
      '{name}-{version}-armv7l.AppImage',
    ],
  },
  'win32-ia32': {
    install: [
      path.join('squirrel-windows-ia32', '{productName} Setup {version}.exe'),
      path.join('win-ia32', '{productName} Setup {version}.exe'),
      path.join('win-ia32', '{productName} Setup {version}-ia32.exe'),
    ],
    metaFile: [
      path.join('squirrel-windows-ia32', 'RELEASES'),
      path.join('win-ia32', 'RELEASES'),
    ],
    update: [
      path.join('squirrel-windows-ia32', '{name}-{version}-full.nupkg'),
      path.join('win-ia32', '{name}-{version}-full.nupkg'),
    ],
  },
  'win32-x64': {
    install: [
      path.join('squirrel-windows', '{productName} Setup {version}.exe'),
      path.join('win', '{productName} Setup {version}.exe'),
    ],
    metaFile: [
      path.join('squirrel-windows', 'RELEASES'),
      path.join('win', 'RELEASES'),
    ],
    update: [
      path.join('squirrel-windows', '{name}-{version}-full.nupkg'),
      path.join('win', '{name}-{version}-full.nupkg'),
    ],
  },
};

class AssetsInfo {
  /**
   * @param {Config} config
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * @return {Build[]}
   */
  getBuilds() {
    if (this.config.builds[0] === 'all') {
      return this.findBuildsFromFs();
    }

    return this.config.builds.map(buildSpec => this.createBuild(buildSpec));
  }

  /**
   * Find all available releases in dist folder
   * @return {Build[]}
   * @package
   */
  findBuildsFromFs() {
    return getInstallersArrayMap()
      .map(([buildType, assetTemplate]) => {
        return [
          buildType,
          this.getAssetPath(assetTemplate, false),
        ];
      })
      .filter(([_, installerPath]) => Boolean(installerPath))
      .map(([buildType]) => buildType)
      .filter((buildType, index, builds) => {
        return builds.indexOf(buildType) === index;
      })
      .map(buildType => this.createBuild(buildType));
  }

  /**
   * @param {string} buildSpec
   * @return {Build}
   */
  createBuild(buildSpec) {
    const build = Build.normalize(buildSpec, {
      platform: this.config.platform,
      arch: this.config.arch,
      channel: this.config.channel,
      version: this.config.version,
    });

    build.assets = this.findAssetsForBuild(build);

    return build;
  }

  /**
   * @param {Build} build
   * @return {{ install: string, metaFile: string, update: string }}
   * @package
   */
  findAssetsForBuild(build) {
    const templates = ASSETS_DATA[build.type];
    if (!templates) {
      throw new Error(`Unknown build type ${build.type}`);
    }

    return {
      install: this.getAssetPath(templates.install),
      metaFile: this.getAssetPath(templates.metaFile),
      update: this.getAssetPath(templates.update),
    };
  }

  /**
   * @param {string | string[]} assetTemplate
   * @param {boolean} throwIfNotFound
   * @return {string}
   * @package
   */
  getAssetPath(assetTemplate, throwIfNotFound = true) {
    const distPath = path.resolve(this.config.distPath);

    if (Array.isArray(assetTemplate)) {
      const filePath = assetTemplate
        .map(tpl => this.getAssetPath(tpl, false))
        .find(Boolean);

      return filePath || this.getAssetPath(assetTemplate[0]);
    }

    if (!assetTemplate) {
      return '';
    }

    let version = this.config.version;
    if (assetTemplate.endsWith('.nupkg')) {
      version = convertWindowsVersion(version);
    }

    const fileName = assetTemplate
      .replace('{name}', this.config.appName)
      .replace('{productName}', this.config.productName || this.config.appName)
      .replace('{version}', version);

    const filePath = path.join(distPath, fileName);

    if (!fs.existsSync(filePath)) {
      if (throwIfNotFound) {
        throw new Error(
          `File ${filePath} doesn't exist. You can try to check if:\n`
          + ' - electron-builder successfully made a build\n'
          + ' - electron-builder and electron-simple-publisher are up to date\n'
          + ' - if nothing helps please create a new github issue. Don\'t '
          + 'forget to include electron-builder version to the bug report.'
        );
      }

      return '';
    }

    return filePath;
  }
}

module.exports = {
  AssetsInfo,
};

// https://github.com/electron-userland/electron-builder/issues/651
function convertWindowsVersion(version) {
  const parts = version.split('-');
  const mainVersion = parts.shift();

  if (parts.length > 0) {
    return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
  }

  return mainVersion;
}

/**
 * [
 *   ['linux-x64', '{productName}-{version}.AppImage'],
 * ]
 * @return {Array<string[]>}
 */
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
