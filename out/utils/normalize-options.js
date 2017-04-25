'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var path = require('path');
var fs = require('fs');
var addAssetsInfo = require('./add-assets-info');

module.exports = normalize;
module.exports.applyPlatformDefaults = applyPlatformDefaults;
module.exports.applyDefaults = applyDefaults;
module.exports.applyPackageJson = applyPackageJson;
module.exports.applyConfigJson = applyConfigJson;
module.exports.transformBuilds = transformBuilds;
module.exports.normalizeBuild = normalizeBuild;
module.exports.validateIfRemoveCommand = validateIfRemoveCommand;

var TRANSPORTS = {
  ftp: '../transport/ftp',
  github: '../transport/github',
  local: '../transport/local',
  s3: '../transport/s3',
  ssh: '../transport/ssh'
};

/**
 *
 * @param options
 * @return {Object}
 */
function normalize(options) {
  options = options || {};

  var configJson = loadConfigFile(options.config);
  var packageJson = loadPackageJson();

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
  options.transport = Object.assign({}, configJson.transport, options.transport);
  options.fields = Object.assign({}, configJson.fields, options.fields);
  return Object.assign({}, configJson, options);
}

function applyPackageJson(options, packageJson) {
  var values = {};
  var updater = packageJson.updater || {};

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
    var _updater$build$split = updater.build.split('-'),
        _updater$build$split2 = _slicedToArray(_updater$build$split, 2),
        platform = _updater$build$split2[0],
        arch = _updater$build$split2[1];

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
  var info = {
    platform: process.platform,
    arch: process.arch
  };
  return Object.assign(info, options);
}

function applyDefaults(options) {
  var defaults = {
    channel: 'prod'
  };
  return Object.assign(defaults, options);
}

function transformBuilds(options) {
  options.builds = options.builds || [];
  options.builds = options.builds.map(function (b) {
    return normalizeBuild(b, options);
  });

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

    if (!options.builds[0].version) {
      throw new Error('Could not determine a version for build. It seems that you\'ve not ' + 'set a version in your package.json');
    }
  }

  return options;
}

function normalizeBuild(build, options) {
  if (typeof build === 'string') {
    var _build$split = build.split('-'),
        _build$split2 = _slicedToArray(_build$split, 4),
        platform = _build$split2[0],
        arch = _build$split2[1],
        channel = _build$split2[2],
        version = _build$split2[3];

    build = { platform: platform, arch: arch, channel: channel, version: version };
  }

  if (options.command !== 'remove') {
    ['platform', 'arch', 'channel', 'version'].forEach(function (field) {
      if (!build[field] && options[field]) {
        build[field] = options[field];
      }
    });
  }

  if (build.version && build.version.indexOf('v') === 0) {
    build.version = build.version.substring(1);
  }

  if (!build.version && options.command !== 'remove') {
    throw new Error('Could not determine a version for build. It seems that you\'ve not ' + 'set a version in your package.json');
  }

  return build;
}

function addAssetsInfoToBuilds(options) {
  if (options.command === 'remove') {
    return options;
  }

  options.builds.forEach(function (build, index) {
    if ((typeof build === 'undefined' ? 'undefined' : _typeof(build)) === 'object') {
      options.builds[index] = addAssetsInfo(build, options);
    }
  });

  return options;
}

function validateIfRemoveCommand(options) {
  if (options.command !== 'remove') {
    return;
  }

  var invalidBuilds = options.builds.filter(function (build) {
    if (!build.platform || !build.arch || !build.channel || !build.version) {
      return true;
    }
    var isValid = build.platform.match(/\w+/) && build.arch.match(/\w+/) && build.channel.match(/\w+/) && build.version.match(/\d+\.\d+\.\d+/);
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
  if (typeof options.transport === 'string') {
    options.transport = { name: options.transport };
  }

  var transport = options.transport;

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

    var Transport = void 0;
    try {
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

  throw new Error('Could not initialize a transport. Check transport.module option.');
}

function loadConfigFile(configPath) {
  if (configPath) {
    var json = loadJson(configPath);
    if (!json) {
      throw new Error('Could not read the file ' + configPath);
    }
    return json;
  }

  return loadJson(path.join(process.cwd(), 'publisher.js')) || loadJson(path.join(process.cwd(), 'publisher.json')) || {};
}

function loadPackageJson() {
  return loadJson(path.join(process.cwd(), 'app', 'package.json')) || loadJson(path.join(process.cwd(), 'package.json')) || {};
}

function loadJson(filePath) {
  var showError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  try {
    if (path.extname(filePath) === '.js') {
      return require(filePath);
    }

    var content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    if (showError) {
      console.log('Error reading file ' + filePath + ': ' + e);
    }
    return false;
  }
}
