'use strict';

const path          = require('path');
const fs            = require('fs');
const addAssetsInfo = require('./add-assets-info');

module.exports = normalize;
module.exports.applyPlatformDefaults   = applyPlatformDefaults;
module.exports.applyDefaults           = applyDefaults;
module.exports.applyPackageJson        = applyPackageJson;
module.exports.applyConfigJson         = applyConfigJson;
module.exports.transformBuilds         = transformBuilds;
module.exports.normalizeBuild          = normalizeBuild;
module.exports.validateIfRemoveCommand = validateIfRemoveCommand;


/**
 *
 * @param options
 * @return {Object}
 */
function normalize(options) {
  options = options || {};

  const configJson  = loadConfigFile(options.config);
  const packageJson = loadPackageJson();

  options = applyConfigJson(options, configJson);
  options = applyPackageJson(options, packageJson);


  options = applyPlatformDefaults(options, process);
  options = applyDefaults(options);

  options = transformBuilds(options);
  options = transformTransport(options);

  validateIfRemoveCommand(options);

  options = addAssetsInfoToBuilds(options);
  options = initializeTransport(options);

  return options;
}

function applyConfigJson(options, configJson) {
  options.transport = Object.assign({}, configJson.transport, options.transport);
  options.fields = Object.assign({}, configJson.fields, options.fields);
  return Object.assign({}, configJson, options);
}

function applyPackageJson(options, packageJson) {
  let values = {};
  let updater = packageJson.updater || {};

  if (packageJson.version) {
    values.version = packageJson.version;
  }
  if (updater.channel) {
    values.channel = updater.channel;
  }
  if (updater.url) {
    values.updatesJsonUrl = updater.url;
  }
  if (updater.build) {
    const [ platform, arch ] = updater.build.split('-');
    if (platform) {
      values.platform = platform;
    }
    if (arch) {
      values.arch = arch;
    }
  }

  return Object.assign({}, values, options);
}

function applyPlatformDefaults(options, process) {
  const info = {
    platform: process.platform,
    arch: process.arch
  };
  return Object.assign(info, options);
}

function applyDefaults(options) {
  const defaults = {
    channel: 'prod'
  };
  return Object.assign(defaults, options);
}

function transformBuilds(options) {
  options.builds = options.builds || [];
  options.builds = options.builds.map(b => normalizeBuild(b, options));

  if (options.command === 'remove') {
    return options;
  }

  if (!options.builds.length) {
    options.builds = [{
      platform: options.platform,
      arch: options.arch,
      channel: options.channel,
      version: options.version
    }];
  }

  return options;
}

function transformTransport(options) {
  if (typeof options.transport === 'string') {
    options.transport = { name: options.transport };
  }

  if (!options.transport) {
    options.transport = {};
  }

  switch (options.transport.name) {
    case 'ssh': {
      options.transport.constructor = require('../transport/ssh');
      return options;
    }
    case 'github': {
      options.transport.constructor = require('../transport/github');
      return options;
    }
    default: {
      return options;
    }
  }
}

function normalizeBuild(build, options) {
  if (typeof build === 'string') {
    const [ platform, arch, channel, version ] = build.split('-');
    build = { platform, arch, channel, version };
  }

  if (options.command !== 'remove') {
    [ 'platform', 'arch', 'channel', 'version' ].forEach((field) => {
      if (!build[field] && options[field]) {
        build[field] = options[field];
      }
    });
  }

  if (build.version && build.version.indexOf('v') === 0) {
    build.version = build.version.substring(1);
  }

  return build;
}

function addAssetsInfoToBuilds(options) {
  if (options.command === 'remove') {
    return options;
  }

  options.builds.forEach((build, index) => {
    if (typeof build === 'object') {
      options.builds[index] = addAssetsInfo(build);
    }
  });

  return options;
}

function validateIfRemoveCommand(options) {
  if (options.command !== 'remove') {
    return;
  }

  const invalidBuilds = options.builds.filter((build) => {
    if (!build.platform || !build.arch || !build.channel || !build.version) {
      return true;
    }
    const isValid = build.platform.match(/\w+/) &&
      build.arch.match(/\w+/) &&
      build.channel.match(/\w+/) &&
      build.version.match(/\d+\.\d+\.\d+/);
    return !isValid;
  });

  if (!options.builds.length) {
    throw new Error('You should specify one ore more builds to remove.');
  }

  if (invalidBuilds.length) {
    throw new Error('For the remove command you need to specify a full buildId.');
  }
}

function initializeTransport(options) {
  const transport = options.transport;

  if (transport.instance) {
    return options;
  }

  if (transport.constructor !== Object) {
    transport.instance = new transport.constructor(options);
    return options;
  }

  if (transport.name === 'github') {
    transport.name = '../transport/github';
  } else if (transport.name === 'ssh') {
    transport.name = '../transport/ssh';
  }

  if (transport.name) {
    let Transport;
    try {
      Transport = require(transport.name);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        throw new Error('Could not load transport ' + transport.name);
      } else {
        throw err;
      }
    }
    transport.instance = new Transport(options);
    return options;
  }

  throw new Error('Could not initialize a transport. Check options.');
}

function loadConfigFile(configPath) {
  if (configPath) {
    const json = loadJson(configPath);
    if (!json) {
      throw new Error('Could not read the file ' + configPath);
    }
    return json;
  }
  const defaultConfigPath = path.join(process.cwd(), 'publisher.json');

  try {
    fs.accessSync(defaultConfigPath, fs.R_OK);
    return loadJson(defaultConfigPath, true) || {};
  } catch (e) {
    return {};
  }
}

function loadPackageJson() {
  return loadJson(path.join(process.cwd(), 'app', 'package.json')) ||
         loadJson(path.join(process.cwd(), 'package.json')) || {};
}

function loadJson(filePath, showError = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    if (showError) {
      console.log(`Error reading file ${filePath}: ${e}`);
    }
    return false;
  }
}