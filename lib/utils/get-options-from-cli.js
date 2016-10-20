'use strict';

const minimist = require('minimist');
const commands = require('./../commands/index');

module.exports = getOptionsFromCli;


const VALID_COMMANDS = commands.NAMES;


function getOptionsFromCli(argv) {
  const cli = minimist(argv, {
    alias: {
      help: 'h',
      transport: 't',
      path: 'p'
    }
  });

  if (cli.help || cli._[0] === 'help') {
    displayHelp();
  }

  const options = transformCliToOptions(cli);

  if (VALID_COMMANDS.indexOf(options.command) === -1) {
    displayHelp('You should specify a valid command.');
  }

  return options;
}

function transformCliToOptions(cli) {
  const options = {
    command: cli._[0],
    builds: [],
    fields: {},
    transport: {}
  };

  let args = cli._.slice(1);
  if (VALID_COMMANDS.indexOf(options.command) === -1) {
    options.command = 'publish';
    args = cli._;
  }

  if (args[0] && args[0].endsWith('.json')) {
    options.config = args[0];
    args = args.slice(1);
  }

  options.builds = args.filter(a => Boolean(a));

  for (let field in cli) {
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
      // Set transport to options.transport.name
      options.transport.name = cli[field];
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
  publish [configFile] [buildId...] Publish a new build(s).
  update  [configFile] [buildId]    Update an existed build.
  remove  [configFile] [buildId...] Remove one or more builds.
  list    [configFile]              Get builds list on a hosting.

Options:
  configFile        File with json ext, defaults to ./publisher.json
  buildId           Build in format like win32-x64-prod-v1.0.0 or just win32-x64. Defaults to current environment
  -t or --transport Name of node module which implements Transport interface.
  -p or --path      Path to the directory with distributive files.
  --field-{name}    Set {name} field of updates.json
`);
  process.exit();
}