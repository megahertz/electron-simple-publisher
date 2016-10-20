'use strict';

const { expect } = require('chai');

const publish       = require('./publish');
const TestTransport = require('../../spec/test-transport');

describe('Publish command', () => {
  it('should publish all assets', () => {
    const options = {
      platform: 'win32',
      arch: 'ia32',
      channel: 'test',
      version: '1.0.0',
      assets: {
        updater: '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
        installer: '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
        metaFile: '/tmp/dist/win32-ia32/RELEASES'
      }
    };
    const transport = new TestTransport(options);
    return publish.publishAssets(options, transport)
      .then((assetUrls) => {
        expect(transport.uploadFiles).to.deep.equal([
          '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
          '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
          '/tmp/dist/win32-ia32/RELEASES'
        ]);

        expect(assetUrls).to.deep.equal({
          installer: 'http://example.com/win32-ia32-test-v1.0.0/Test Setup 3.3.1-ia32.exe',
          metaFile:  'http://example.com/win32-ia32-test-v1.0.0/RELEASES',
          updater:   'http://example.com/win32-ia32-test-v1.0.0/test-3.3.1-full.nupkg'
        });
      });
  });
});