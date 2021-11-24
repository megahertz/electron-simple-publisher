'use strict';

const fs = require('fs');
const path = require('path');
const options = require('package-options');
const { commandsList } = require('../commands');

function getConfig() {
  return new Config(getOptions());
}

function getOptions(cmdArgs = undefined, packageOptions = options) {
  return packageOptions
    .reset()
    .param('transport.module', { alias: 't' })
    .boolean(['debug', 'progress'])
    .loadFile('package.json', 'publisher')
    .loadFile('publisher.json')
    .loadFile('publisher.js')
    .loadEnv('publisher')
    .loadCmd()
    .help(`
Usage: publish [command] [options] [arguments]

Commands (default is publish):
  publish [configFile] [buildId1 Id2 …|all] Publish a new build(s).
  replace [configFile] [buildId]            Replace the current build.
  remove  [configFile] [buildId1 Id2 …]     Remove one or more builds.
  clean   [configFile]                      Remove builds missed in updates.json
    -e, --except NAME1,NAME2                NAME1,NAME2 will be preserved
  list    [configFile]                      Show builds on a hosting.
  config                                    Just show the final config

BuildId has a following format: [platform]-[arch]-[channel]-[version]
  You can specify only a part of buildId, like linux-x64, defaults:
    platform: process.platform
    arch:     process.arch
    channel:  package.json:updater.channel or prod
    version:  package.json:version

Options:
  configFile             File with json ext, defaults to ./publisher.js
  -t, --transport        Selected transport
      --transport.{name} Specify a transport option
  -p, --path             Path to distributive files (default dist).
  -d, --debug            Show debug information
  -n, --noprogress       Don't show upload progress
      --fields.{name}    Specify a field in the target updates.json file 
      --help             Show this message
      --version          Show publisher version
`)
    .loadCmd(cmdArgs);
}

class Config {
  /**
   * @param {PackageOptions.PackageOptions || *} opts
   */
  constructor(opts) {
    /**
     * @type {'publish' | 'replace' | 'remove' | 'clean' | 'list'}
     */
    this.command = 'publish';
    if (commandsList[opts._[0]]) {
      this.command = opts._[0];
      opts._.shift();
    }

    const firstArg = opts._[0] || '';
    if (firstArg.endsWith('.js') || firstArg.endsWith('.json')) {
      opts.loadFile(firstArg);
      opts._.shift();
    }

    /**
     * @type {string[]}
     */
    this.builds = opts._.filter(Boolean);

    /**
     * @type boolean
     */
    this.debugMode = Boolean(opts.debug);

    /**
     * @type {string}
     */
    this.distPath = opts.path || 'dist';

    /**
     * @type {string[]}
     */
    this.except = (opts.except || '');
    if (typeof this.except === 'string') {
      this.except = this.except.split(',');
    }

    /**
     * @type boolean
     */
    this.showProgress = !onUndefined(opts.noprogress, !process.stdout.isTTY);

    /**
     * @type {object}
     * @property {string} module
     */
    this.transport = opts.transport;
    if (typeof this.transport === 'string') {
      this.transport = { module: this.transport };
    }

    if (!this.transport.module) {
      this.transport.module = '';
    }

    /**
     * @type {Object<string, string>}
     */
    this.fields = typeof opts.fields === 'object' ? opts.fields : {};

    /**
     * @type {string}
     */
    this.platform = opts.platform || process.platform;

    /**
     * @type {string}
     */
    this.arch = opts.arch || process.arch;

    /**
     * @type {string}
     */
    this.channel = opts.channel || 'prod';

    /**
     * @type {string}
     */
    this.version = opts.version || '';

    /**
     * @type {string}
     */
    this.metaFileUrl = opts.metaFileUrl || '';

    /**
     * @type {string}
     */
    this.appName = opts.appName || '';

    /**
     * @type {string}
     */
    this.productName = opts.productName || '';

    this.loadPackageJson();
  }

  loadPackageJson(dirPath = process.cwd()) {
    const packageJson = loadJson(path.join(dirPath, 'app', 'package.json'))
      || loadJson(path.join(dirPath, 'package.json'));

    if (!packageJson) {
      return;
    }

    if (packageJson.version) {
      this.version = packageJson.version;
    }

    if (packageJson.name) {
      this.appName = packageJson.name;
    }

    if (packageJson.productName) {
      this.productName = packageJson.productName;
    }

    const updater = packageJson.updater || {};

    if (updater.channel) {
      this.channel = updater.channel;
    }

    if (updater.url && !this.metaFileUrl) {
      this.metaFileUrl = updater.url;
    }

    if (updater.build) {
      const [platform, arch] = updater.build.split('-');
      if (platform) {
        this.platform = platform;
      }

      if (arch) {
        this.arch = arch;
      }
    }
  }

  getErrors() {
    const errors = [];

    if (!this.version) {
      errors.push(
        'Could not determine a version for build. It seems that you\'ve not '
        + 'set a version in your package.json'
      );
    }

    return errors;
  }
}

/**
 * @param {string | Partial<Config>} args
 * @return {Config}
 */
function getTestConfig(args) {
  let opts;
  if (typeof args === 'string') {
    opts = getOptions(args, options.clone());
  } else {
    opts = getOptions(undefined, options.clone());
  }

  const config = new Config(opts);
  Object.assign(config, args);
  return config;
}

module.exports = {
  Config,
  getConfig,
  getTestConfig,
  getOptions,
};

function onUndefined(value, alternative) {
  if (value !== undefined) {
    return value;
  }

  return alternative;
}

function loadJson(filePath, showError = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    if (showError) {
      console.warn(`Error reading file ${filePath}: ${e}`);
    }
    return false;
  }
}
