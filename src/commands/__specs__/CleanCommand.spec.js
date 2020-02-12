'use strict';

const { describe, expect, it } = require('humile');
const CleanCommand = require('../CleanCommand');

describe('CleanCommand', () => {
  const cmd = new CleanCommand({});

  it('filterExceptions should return values not existed in preserved', () => {
    const values = ['win32-v0.0.1', 'win32-x64-stage-0.1.0', 'test0.0.1'];

    expect(cmd.filterExceptions(values, ['win32'])).toEqual([
      'test0.0.1',
    ]);

    expect(cmd.filterExceptions(values, ['0.0.1'])).toEqual([
      'win32-x64-stage-0.1.0',
    ]);
  });
});
