#! /usr/bin/env node

'use strict';

const getOptionsFromCli = require('./lib/utils/get-options-from-cli');
const publisher         = require('./lib/publisher');

const cliOptions = getOptionsFromCli(process.argv.slice(2));

module.exports = publisher;

if (require.main === module) {
  publisher.run(cliOptions)
    .then((result) => {
      // eslint-disable-next-line default-case
      switch (cliOptions.command) {
        case 'publish': {
          console.log('All releases have been successfully published.');
          break;
        }

        case 'replace': {
          console.log('The release replaced.');
          break;
        }

        case 'list': {
          console.error('Builds on the hosting:');
          console.log(result.join(' '));
          break;
        }

        case 'remove': {
          console.log('All specified releases removed');
          break;
        }

        case 'clean': {
          console.error('Removed releases:');
          console.log(result.join(' '));
          break;
        }
      }
    })
    .catch((e) => {
      if (cliOptions.debug) {
        console.error(e);
      } else {
        console.error(e.message);
      }

      process.exit(1);
    });
}
