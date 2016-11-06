'use strict';

const normalizeOptions = require('./utils/normalize-options');
const commands = require('./commands');

module.exports.run = run;

function run(options) {
  let transport;

  try {
    options = normalizeOptions(options);
    transport = options.transport.instance;
    transport.init();
  } catch(e) {
    return Promise.reject(e);
  }

  let result;
  return executeCommand(options)
    .then((res) => {
      result = res;
      return transport.close();
    })
    .then(() => {
      return result;
    });
}

function executeCommand(options) {
  switch (options.command) {

    case commands.publish.NAME: {
      return options.builds.reduce((promise, build) => {
        return promise.then(() => commands.publish(build, options));
      }, Promise.resolve());
    }

    case commands.replace.NAME: {
      return options.builds.reduce((promise, build) => {
        return promise.then(() => commands.replace(build, options));
      }, Promise.resolve());
    }

    case commands.remove.NAME: {
      return options.builds.reduce((promise, build) => {
        return promise.then(() => commands.remove(build, options));
      }, Promise.resolve());
    }

    case commands.list.NAME: {
      return commands.list(options);
    }

    default: {
      return Promise.reject('Unknown command ' + options.command);
    }
  }
}