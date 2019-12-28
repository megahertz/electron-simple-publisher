'use strict';

const path                                  = require('path');
const fs                                    = require('fs');
const { addAssetsInfo, getAvailableBuilds } = require('./add-assets-info');

module.exports = normalize;
module.exports.applyPlatformDefaults   = applyPlatformDefaults;
module.exports.applyDefaults           = applyDefaults;
module.exports.applyPackageJson        = applyPackageJson;
module.exports.applyConfigJson         = applyConfigJson;
module.exports.transformBuilds         = transformBuilds;
module.exports.normalizeBuild          = normalizeBuild;
module.exports.validateIfRemoveCommand = validateIfRemoveCommand;

const TRANSPORTS = {
  ftp:    '../transport/ftp',
  github: '../transport/github',
  local:  '../transport/local',
  s3:     '../transport/s3',
  ssh:    '../transport/ssh',
};

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

  validateIfRemoveCommand(options);

  if (options.command === 'publish' || options.command === 'replace') {
    options = addAssetsInfoToBuilds(options);
  }

  options = initializeTransport(options);

  return options;
}

function applyConfigJson(options, configJson) {
  if (typeof configJson.transport === 'string') {
    configJson.transport = { name: configJson.transport };
  }

  options.transport = {
    ...configJson.transport,
    ...options.transport,
  };
  options.fields = { ...configJson.fields, ...options.fields };
  return { ...configJson, ...options };
}

function applyPackageJson(options, packageJson) {
  const values = {};
  const updater = packageJson.updater || {};

  options.packageJson = packageJson;

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
    const [platform, arch] = updater.build.split('-');
    if (platform) {
      values.platform = platform;
    }

    if (arch) {
      values.arch = arch;
    }
  }

  return { ...values, ...options };
}

function applyPlatformDefaults(options, process) {
  const info = {
    platform: process.platform,
    arch: process.arch,
  };
  return Object.assign(info, options);
}

function applyDefaults(options) {
  const defaults = {
    channel: 'prod',
    path: 'dist',
  };
  return Object.assign(defaults, options);
}

function transformBuilds(options) {
  options.builds = options.builds || [];

  if (options.builds[0] === 'all') {
    options.builds = getAvailableBuilds(options);
  }

  options.builds = options.builds.map(b => normalizeBuild(b, options));

  if (options.command === 'remove') {
    return options;
  }

  if (!options.builds.length) {
    options.builds = [{
      platform: options.platform,
      arch: options.arch,
      channel: options.channel,
      version: options.version,
    }];

    if (!options.builds[0].version) {
      throw new Error(
        'Could not determine a version for build. It seems that you\'ve not '
        + 'set a version in your package.json'
      );
    }
  }

  return options;
}

function normalizeBuild(build, options) {
  if (typeof build === 'string') {
    const [platform, arch, channel, ...version] = build.split('-');
    build = { platform, arch, channel, version: version.join('-') };
  }

  if (options.command !== 'remove') {
    ['platform', 'arch', 'channel', 'version'].forEach((field) => {
      if (!build[field] && options[field]) {
        build[field] = options[field];
      }
    });
  }

  if (build.version && build.version.indexOf('v') === 0) {
    build.version = build.version.substring(1);
  }

  if (!build.version && options.command !== 'remove') {
    throw new Error(
      'Could not determine a version for build. It seems that you\'ve not '
      + 'set a version in your package.json'
    );
  }

  return build;
}

function addAssetsInfoToBuilds(options) {
  if (options.command === 'remove') {
    return options;
  }

  options.builds.forEach((build, index) => {
    if (typeof build === 'object') {
      options.builds[index] = addAssetsInfo(build, options);
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
    const isValid = build.platform.match(/\w+/)
      && build.arch.match(/\w+/)
      && build.channel.match(/\w+/)
      && build.version.match(/\d+\.\d+\.\d+/);
    return !isValid;
  });

  if (!options.builds.length) {
    throw new Error('You should specify one ore more builds to remove.');
  }

  if (invalidBuilds.length) {
    throw new Error(
      'For the remove command you need to specify a full buildId.'
    );
  }
}

function initializeTransport(options) {
  if (typeof options.transport === 'string') {
    options.transport = { name: options.transport };
  }

  const transport = options.transport;

  if (transport.instance) {
    return options;
  }

  if (transport.constructor !== Object) {
    transport.instance = new transport.constructor(options);
    return options;
  }

  if (transport.module) {
    if (TRANSPORTS[transport.module]) {
      transport.module = TRANSPORTS[transport.module];
    } else if (transport.module.startsWith('{cwd}')) {
      transport.module = transport.module.replace('{cwd}', process.cwd);
    }

    let Transport;
    try {
      // eslint-disable-next-line import/no-dynamic-require,global-require
      Transport = require(transport.module);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        if (options.debug) {
          console.warn(err);
        }
        throw new Error('Could not load transport ' + transport.module);
      } else {
        throw err;
      }
    }
    transport.instance = new Transport(options);
    return options;
  }

  throw new Error(
    'Could not initialize a transport. Check transport.module option.'
  );
}

function loadConfigFile(configPath) {
  if (configPath) {
    const json = loadJson(configPath);
    if (!json) {
      throw new Error('Could not read the file ' + configPath);
    }
    return json;
  }

  return loadJson(path.join(process.cwd(), 'publisher.js'))
    || loadJson(path.join(process.cwd(), 'publisher.json')) || {};
}

function loadPackageJson() {
  return loadJson(path.join(process.cwd(), 'app', 'package.json'))
    || loadJson(path.join(process.cwd(), 'package.json')) || {};
}

function loadJson(filePath, showError = false) {
  try {
    if (path.extname(filePath) === '.js') {
      // eslint-disable-next-line import/no-dynamic-require,global-require
      return require(filePath);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    if (showError) {
      console.log(`Error reading file ${filePath}: ${e}`);
    }
    return false;
  }
}
