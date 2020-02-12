'use strict';

const TRANSPORTS = {
  azure: './AzureTransport',
  ftp: './ftp',
  github: './github',
  local: './LocalTransport',
  s3: './S3Transport',
  ssh: './SshTransport',
  test: './TestTransport',
};

module.exports = {
  createTransport,
};

/**
 * @param {Config} config
 * @return {Promise<AbstractTransport>}
 */
function createTransport(config) {
  let transportModule = config.transport.module;

  if (TRANSPORTS[transportModule]) {
    transportModule = TRANSPORTS[transportModule];
  } else if (transportModule.startsWith('{cwd}')) {
    transportModule = transportModule.replace('{cwd}', process.cwd());
  }

  if (!transportModule) {
    throw new Error(
      'Could not initialize the transport. Check transport.module option'
    );
  }

  let Transport;
  try {
    // eslint-disable-next-line import/no-dynamic-require,global-require
    Transport = require(transportModule);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      if (config.debugMode) {
        console.error(err);
      }

      throw new Error('Could not load transport ' + transportModule);
    } else {
      throw err;
    }
  }

  /**
   * @type {AbstractTransport}
   */
  return new Transport(config);
}
