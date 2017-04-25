'use strict';

var minimist = require('minimist');
var commands = require('./../commands/index');

module.exports = getOptionsFromCli;

var VALID_COMMANDS = commands.NAMES;

function getOptionsFromCli(argv) {
  var cli = minimist(argv, {
    alias: {
      help: 'h',
      transport: 't',
      path: 'p',
      debug: 'd'
    }
  });

  if (cli.help || cli._[0] === 'help') {
    displayHelp();
  }

  var options = transformCliToOptions(cli);

  if (VALID_COMMANDS.indexOf(options.command) === -1) {
    displayHelp('You should specify a valid command.');
  }

  return options;
}

function transformCliToOptions(cli) {
  var options = {
    command: cli._[0],
    builds: [],
    fields: {},
    transport: {}
  };

  var args = cli._.slice(1);
  if (VALID_COMMANDS.indexOf(options.command) === -1) {
    options.command = 'publish';
    args = cli._;
  }

  if (args[0] && args[0].endsWith('.json')) {
    options.config = args[0];
    args = args.slice(1);
  }

  options.builds = args.filter(function (a) {
    return Boolean(a);
  });

  for (var field in cli) {
    if (!cli.hasOwnProperty(field)) continue;

    if (field === '_') continue;
    if (field.length === 1) continue;

    if (field.startsWith('field-')) {
      // Set field-* to options.fields
      options.fields[field.substring(6)] = cli[field];
    } else if (field.startsWith('transport-')) {
      // Set transport-* to options.transport
      options.transport[field.substring(10)] = cli[field];
    } else if (field === 'transport') {
      // Set transport to options.transport.module
      options.transport.module = cli[field];
    } else {
      options[field] = cli[field];
    }
  }

  return options;
}

function displayHelp(message) {
  if (message) {
    console.log(message);
  }
  console.log('\nUsage: publish [command] [options] [arguments]\n\nCommands (default is publish):\n  publish [configFile] [buildId buildId2 ...] Publish a new build(s).\n  replace [configFile] [buildId]              Replace the current build.\n  remove  [configFile] [buildId buildId2 ...] Remove one or more builds.\n  list    [configFile]                        Show builds on a hosting.\n\nBuildId has a following format: [platform]-[arch]-[channel]-v[version]\n  You can specify only a part of buildId, like linux-x64, defaults:\n    platform: process.platform\n    arch:     process.arch\n    channel:  package.json:updater.channel or prod\n    version:  package.json:version\n\nOptions:\n  configFile         File with json ext, defaults to ./publisher.js\n  -t or --transport  Name of node module which implements Transport interface.\n  --transport-{name} Specify the {name} transport option\n  -p or --path       Path to distributive files (default dist).\n  -d or --debug      Show debug information\n  --field-{name}     Set updates.json:{buildId}.{name} field \n  -h or --help       Show this message\n');
  process.exit();
}