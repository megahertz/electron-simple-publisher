'use strict';

const { expect } = require('chai');

const SshTransport = require('./ssh');

class NoExceptionSshTransport extends SshTransport {
  normalizeOptions(options) {
    try {
      super.normalizeOptions(options);
    } catch (e) {
      this.error = e;
      console.error(e);
    }
  }
}

describe('SshTransport', () => {
  it('should not use a private key if password is specified', () => {
    const options = getTransportOptions({ password: 'pass' });

    expect(options.usePrivateKey).to.be.false;
    expect(options.privateKeyPath).to.be.undefined;
  });

  it('should use a private key if password is not specified', () => {
    const options = getTransportOptions();

    expect(options.usePrivateKey).to.be.true;
    expect(options.privateKeyPath).not.to.be.undefined;
  });
});

function getTransportOptions(config) {
  const options = Object.assign({
    remoteUrl: 'http://example.com',
    remotePath: '/'
  }, config);

  const ssh = new NoExceptionSshTransport({
    transport: options,
    updatesJsonUrl: 'http://example.com'
  });

  return ssh.options;
}