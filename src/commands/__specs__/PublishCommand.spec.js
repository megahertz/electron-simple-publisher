'use strict';

const { describe, expect, it } = require('humile');
const PublishCommand = require('../PublishCommand');
const { createTransport } = require('../../transport');
const { getTestConfig } = require('../../utils/config');
const Build = require('../../utils/Build');

describe('Publish command', () => {
  it('should publish all assets', async () => {
    const build = new Build({
      platform: 'win32',
      arch: 'ia32',
      channel: 'test',
      version: '1.0.0',
      assets: {
        updater: '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
        installer: '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
        metaFile: '/tmp/dist/win32-ia32/RELEASES',
      },
    });

    const options = {
      ...build,
      transport: { module: 'test' },
      metaFileUrl: 'http://example.com',
    };

    const config = getTestConfig(options);

    const transport = createTransport(config);
    const cmd = new PublishCommand(config, transport);

    const assetUrls = await cmd.publishAssets(build);
    expect(transport.uploadFiles).toEqual([
      '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
      '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
      '/tmp/dist/win32-ia32/RELEASES',
    ]);

    const url = 'http://example.com/win32-ia32-test-1.0.0';
    expect(assetUrls).toEqual({
      installer: `${url}/Test Setup 3.3.1-ia32.exe`,
      metaFile:  `${url}/RELEASES`,
      updater:   `${url}/test-3.3.1-full.nupkg`,
    });
  });
});
