'use strict';

const { expect } = require('chai');
const {
  extractKeysFromUpdatesJson,
  filterExceptions,
} = require('./clean');

describe('Clean command', () => {
  it('filterExceptions should return values not existed in preserved', () => {
    const values = ['win32-v0.0.1', 'win32-x64-stage-0.1.0', 'test0.0.1'];

    expect(filterExceptions(values, ['win32'])).to.deep.equal([
      'test0.0.1',
    ]);

    expect(filterExceptions(values, ['0.0.1'])).to.deep.equal([
      'win32-x64-stage-0.1.0',
    ]);
  });

  it('extractKeysFromUpdatesJson should extract strings like buildId', () => {
    const json = {
      win32: {
        install: 'https://example.com/win32-v0.0.1',
        altName: 'old-windows-xp-vista-7-prod-v0.0.1',
      },
      'linux-x64-stage': {
        prevVersion: 'v1.0.2-beta',
        comment: '1.0.2',
        install: 'https://example.com/linux-x64-stage-v1.0.2',
      },
      'linux-x64-dev': {
        update: 'https://d.com/linux-x64-dev-v0.5.0/app.0.5.0.AppImage',
        install: 'https://d.com/linux-x64-dev-v0.5.0/app.0.5.0.AppImage',
        version: '0.5.0',
      },
    };

    expect(extractKeysFromUpdatesJson(json)).to.deep.equal([
      'win32-v0.0.1',
      'vista-7-prod-v0.0.1',
      'linux-x64-stage-v1.0.2',
      'linux-x64-dev-v0.5.0',
    ]);
  });
});
