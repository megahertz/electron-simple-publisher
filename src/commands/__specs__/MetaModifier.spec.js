'use strict';

const { describe, expect, it } = require('humile');
const MetaModifier = require('../MetaModifier');
const Build = require('../../utils/Build');
const { createTransport } = require('../../transport');
const { getTestConfig } = require('../../utils/config');

describe('MetaModifier', () => {
  it('should provide function which modifies json', async () => {
    const config = getTestConfig({
      transport: {
        module: 'test',
        metaFileUrl: 'http://example.com/updates.json',
      },
    });
    const transport = createTransport(config);
    const modifier = new MetaModifier(transport, (meta, build) => {
      return { [build.id]: build };
    });

    const linuxBuild = Build.normalize('linux-x64-prod');

    modifier.addBuild(linuxBuild);

    await modifier.updateMetaFile();

    expect(transport.updatePushes).toEqual([{
      'linux-x64-prod': linuxBuild,
    }]);
  });

  it('should split push calls by url', async () => {
    const config = getTestConfig({
      transport: {
        module: 'test',
        metaFileUrl: 'http://example.com/{platform}.json',
      },
    });
    const transport = createTransport(config);
    const modifier = new MetaModifier(transport, (meta, build) => {
      meta[build.id] = build;
      return meta;
    });

    const linuxBuild = Build.normalize('linux-x64-prod');
    const windows32Build = Build.normalize('windows-ia32-prod');
    const windows64Build = Build.normalize('windows-x64-prod');
    const prevBuild = await transport.fetchMetaFile(linuxBuild);

    modifier.addBuild(linuxBuild);
    modifier.addBuild(windows32Build);
    modifier.addBuild(windows64Build);

    await modifier.updateMetaFile();

    expect(transport.updatePushes).toEqual([
      {
        'linux-x64-prod': linuxBuild,
        ...prevBuild,
      },
      {
        'windows-ia32-prod': windows32Build,
        'windows-x64-prod': windows64Build,
        ...prevBuild,
      },
    ]);
  });
});
