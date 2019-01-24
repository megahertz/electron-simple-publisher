#! /usr/bin/env node

'use strict';

/* eslint-disable no-multi-spaces,default-case */

const getOptionsFromCli = require('./lib/utils/get-options-from-cli');
const publisher         = require('./lib/publisher');

const cliOptions = getOptionsFromCli(process.argv.slice(2));

module.exports = publisher;

if (require.main === module) {
  publisher.run(cliOptions)
    .then((result) => {
      switch (cliOptions.command) {
        case 'publish': return showResult(result, 'published');
        case 'replace': return showResult(result, 'replaced');
        case 'remove':  return showResult(result, 'removed');
        case 'clean':   return showResult(result, 'cleaned');

        case 'list': {
          if (result.length > 0) {
            console.error('Releases on the hosting:');
            console.log(result.join('\n'));
          } else {
            console.error('There are no releases on the hosting.');
          }
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

function showResult(list, verb) {
  if (list && list.length > 0) {
    console.error(`Successfully ${verb}:`);
    console.log(list.join('\n'));
  } else {
    console.error(`Nothing was ${verb}.`);
  }
}
