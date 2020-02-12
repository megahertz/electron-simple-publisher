'use strict';

const { describe, expect, it } = require('humile');

const SshTransport = require('../SshTransport');

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

    expect(options.usePrivateKey).toBe(false);
    expect(options.privateKeyPath).not.toBeDefined();
  });

  it('should use a private key if password is not specified', () => {
    const options = getTransportOptions();

    expect(options.usePrivateKey).toBe(true);
    expect(options.privateKeyPath).toBeDefined();
  });
});

function getTransportOptions(config) {
  const options = {
    remoteUrl: 'http://example.com',
    remotePath: '/',
    ...config,
  };

  const ssh = new NoExceptionSshTransport({
    transport: options,
    metaFileUrl: 'http://example.com',
  });

  ssh.normalizeOptions(ssh.options);

  return ssh.options;
}
