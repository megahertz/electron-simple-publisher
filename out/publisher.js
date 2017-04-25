'use strict';

var normalizeOptions = require('./utils/normalize-options');
var commands = require('./commands');

module.exports.run = run;

function run(options) {
  var transport = void 0;

  try {
    options = normalizeOptions(options);
    transport = options.transport.instance;
    transport.init();
  } catch (e) {
    return Promise.reject(e);
  }

  var result = void 0;
  return executeCommand(options).then(function (res) {
    result = res;
    return transport.close();
  }).then(function () {
    return result;
  });
}

function executeCommand(options) {
  switch (options.command) {

    case commands.publish.NAME:
      {
        return options.builds.reduce(function (promise, build) {
          return promise.then(function () {
            return commands.publish(build, options);
          });
        }, Promise.resolve());
      }

    case commands.replace.NAME:
      {
        return options.builds.reduce(function (promise, build) {
          return promise.then(function () {
            return commands.replace(build, options);
          });
        }, Promise.resolve());
      }

    case commands.remove.NAME:
      {
        return options.builds.reduce(function (promise, build) {
          return promise.then(function () {
            return commands.remove(build, options);
          });
        }, Promise.resolve());
      }

    case commands.list.NAME:
      {
        return commands.list(options);
      }

    default:
      {
        return Promise.reject('Unknown command ' + options.command);
      }
  }
}