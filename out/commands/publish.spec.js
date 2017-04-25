'use strict';

var _require = require('chai'),
    expect = _require.expect;

var publish = require('./publish');
var TestTransport = require('../../spec/test-transport');

describe('Publish command', function () {
  it('should publish all assets', function () {
    var options = {
      platform: 'win32',
      arch: 'ia32',
      channel: 'test',
      version: '1.0.0',
      assets: {
        updater: '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
        installer: '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
        metaFile: '/tmp/dist/win32-ia32/RELEASES'
      },
      transport: {},
      updatesJsonUrl: 'http://example.com'
    };
    var transport = new TestTransport(options);
    return publish.publishAssets(options, transport).then(function (assetUrls) {
      expect(transport.uploadFiles).to.deep.equal(['/tmp/dist/win32-ia32/test-3.3.1-full.nupkg', '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe', '/tmp/dist/win32-ia32/RELEASES']);

      expect(assetUrls).to.deep.equal({
        installer: 'http://example.com/win32-ia32-test-v1.0.0/Test Setup 3.3.1-ia32.exe',
        metaFile: 'http://example.com/win32-ia32-test-v1.0.0/RELEASES',
        updater: 'http://example.com/win32-ia32-test-v1.0.0/test-3.3.1-full.nupkg'
      });
    });
  });
});