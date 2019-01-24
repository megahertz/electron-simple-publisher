'use strict';

/* eslint-disable padded-blocks */

const minimist = require('minimist');
const commands = require('./../commands');

module.exports = getOptionsFromCli;

function getOptionsFromCli(argv) {
  const cli = minimist(argv, {
    alias: {
      help: 'h',
      transport: 't',
      path: 'p',
      debug: 'd',
      noprogress: 'n',
      except: 'e',
    },
  });

  if (cli.help || cli._[0] === 'help') {
    displayHelp();
  }

  const options = transformCliToOptions(cli);

  if (!commands[options.command]) {
    displayHelp('You should specify a valid command.');
  }

  return options;
}

function transformCliToOptions(cli) {
  const options = {
    command: cli._[0],
    builds: [],
    fields: {},
    transport: {},
  };

  let args = cli._.slice(1);
  if (!commands[options.command]) {
    options.command = 'publish';
    args = cli._;
  }

  if (args[0] && args[0].endsWith('.json')) {
    options.config = args[0];
    args = args.slice(1);
  }

  options.builds = args.filter(a => Boolean(a));

  for (const field in cli) {
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

    } else if (field === 'except') {
      const ex = cli[field];
      options.except = ex && ex.split ? ex.split(',') : [];

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
  console.log(`
Usage: publish [command] [options] [arguments]

Commands (default is publish):
  publish [configFile] [buildId1 Id2 …|all] Publish a new build(s).
  replace [configFile] [buildId]            Replace the current build.
  remove  [configFile] [buildId1 Id2 …]     Remove one or more builds.
  clean   [configFile]                      Remove builds missed in updates.json
    -e or --except NAME1,NAME2              NAME1,NAME2 will be preserved
  list    [configFile]                      Show builds on a hosting.

BuildId has a following format: [platform]-[arch]-[channel]-v[version]
  You can specify only a part of buildId, like linux-x64, defaults:
    platform: process.platform
    arch:     process.arch
    channel:  package.json:updater.channel or prod
    version:  package.json:version

Options:
  configFile          File with json ext, defaults to ./publisher.js
  -t or --transport   Name of node module which implements Transport interface.
  --transport-{name}  Specify the {name} transport option
  -p or --path        Path to distributive files (default dist).
  -d or --debug       Show debug information
  -n or --noprogress  Don't show upload progress
  --field-{name}      Set updates.json:{buildId}.{name} field 
  -h or --help        Show this message
`);
  process.exit();
}
