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
      },
      'linux-x64-stage': {
        prevVersion: 'v1.0.2-beta',
        comment: '1.0.2',
        install: 'https://example.com/linux-x64-stage-v1.0.2',
      },
    };

    expect(extractKeysFromUpdatesJson(json)).to.deep.equal([
      'win32-v0.0.1',
      'stage-v1.0.2',
    ]);
  });
});
