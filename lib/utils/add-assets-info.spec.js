'use strict';

const { expect }    = require('chai');
const addAssetsInfo = require('./add-assets-info');

describe('Assets module', () => {
  it('should replace fileName template by version', () => {
    const asset = {
      updater: '{version}-full.nupkg',
      installer: '{version}-ia32.exe',
      metaFile: 'RELEASES'
    };

    expect(addAssetsInfo.replaceAssetTemplate(asset, '3.3.1')).to.deep.equal({
      updater: '3.3.1-full.nupkg',
      installer: '3.3.1-ia32.exe',
      metaFile: 'RELEASES'
    });
  });

  it('should replace asset mask by real file name', () => {
    const asset = {
      updater: '3.3.1-full.nupkg',
      installer: '3.3.1-ia32.exe',
      metaFile: 'RELEASES'
    };
    const files = [
      'about.txt',
      'Test Setup 3.3.1-ia32.exe',
      'test-3.3.1-full.nupkg',
      'RELEASES',
      'win-setup.txt'
    ];
    const dirPath = '/tmp/dist/win32-ia32';

    expect(addAssetsInfo.replaceMaskByPath(asset, files, dirPath)).to.deep.equal({
      updater: '/tmp/dist/win32-ia32/test-3.3.1-full.nupkg',
      installer: '/tmp/dist/win32-ia32/Test Setup 3.3.1-ia32.exe',
      metaFile: '/tmp/dist/win32-ia32/RELEASES'
    });
  });
});