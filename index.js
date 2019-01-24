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
          if (result.length > 0) {
            console.error('Releases on the hosting:');
            console.log(result.join(' '));
          } else {
            console.error('There are no releases on the hosting.');
          }

          break;
        }

        case 'remove': {
          console.log('All specified releases removed');
          break;
        }

        case 'clean': {
          if (result.length > 0) {
            console.error('Removed releases:');
            console.log(result.join(' '));
          } else {
            console.error('There are no releases to clean.');
          }

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
