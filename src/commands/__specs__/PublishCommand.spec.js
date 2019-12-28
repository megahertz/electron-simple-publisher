'use strict';

const { describe, expect, it } = require('humile');
const PublishCommand = require('../PublishCommand');
const TestTransport  = require('../../__specs__/TestTransport');

describe('Publish command', () => {
  it('should publish all assets', async () => {
    const options = {
      platform: 'win32',
      arch: 'ia32',
      channel: 'test',
      version: '1.0.0',
      assets: {
        updater: '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
        installer: '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
        metaFile: '/tmp/dist/win32-ia32/RELEASES',
      },
      transport: {},
      updatesJsonUrl: 'http://example.com',
    };

    const transport = new TestTransport(options);
    options.transport.instance = transport;

    const cmd = new PublishCommand(options);

    const assetUrls = await cmd.publishAssets(options, transport);
    expect(transport.uploadFiles).toEqual([
      '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
      '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
      '/tmp/dist/win32-ia32/RELEASES',
    ]);

    const url = 'http://example.com/win32-ia32-test-v1.0.0';
    expect(assetUrls).toEqual({
      installer: `${url}/Test Setup 3.3.1-ia32.exe`,
      metaFile:  `${url}/RELEASES`,
      updater:   `${url}/test-3.3.1-full.nupkg`,
    });
  });
});
