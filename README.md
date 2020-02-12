![logo](https://raw.githubusercontent.com/megahertz/electron-simple-updater/master/logo.png)
# electron-simple-publisher
[![Build Status](https://travis-ci.org/megahertz/electron-simple-publisher.svg?branch=master)](https://travis-ci.org/megahertz/electron-simple-publisher)
[![npm version](https://badge.fury.io/js/electron-simple-publisher.svg)](https://badge.fury.io/js/electron-simple-publisher)


## Description

This module makes easy to publish updates created by
[electron-builder](https://github.com/electron-userland/electron-builder).
Now SSH, github, ftp, Amazon S3 and local release transports are supported.
You can enable update feature in your application using
[electron-simple-updater](https://github.com/megahertz/electron-simple-updater)

## Installation

Install with [npm](https://npmjs.org/package/electron-simple-publisher):

    npm install --save-dev electron-simple-publisher

## Usage
1. For windows build set the target value to squirrel in package.json:
  ```
  ...
  "build": {
    ...
    "win": {
      "target": "squirrel"
    }
  },
  ...
  ```

2. Make a distributive package using electron-builder

3. Set options:
  You can specify all option through command line arguments, but it's
  easier to store the config in publisher.js or publisher.json in the
  project root. Here is an example for publishing through SSH:
  ```js
  {
    "transport": {
      "module": "ssh",
      "host": "example.com",
      "username": "user",
      "password": "user's password",
      "remotePath": "/www/example.com/updates",
      "remoteUrl": "http://example.com/updates",
    },
    "fields": { // Additional fields which will be added to updates.json
      "readme": "The first version"
    },
    // If you've already set package.json:updater.url you can skip this option:
    "metaFileUrl": "http://example.com/updates/update.json",
    // Builds contained these substrings will be ignored when run clean command
    "except": [
      "prod-v0.5.0"
    ]
  }
  ```

4. Run a publish command:

  `$ node_modules/.bin/publish` - will publish the latest build for
  the current platform

### Command line arguments

```sh
Usage: publish [command] [options] [arguments]

Commands (default is publish):
  publish [configFile] [buildId1 Id2 …|all] Publish a new build(s).
  replace [configFile] [buildId]            Replace the current build.
  remove  [configFile] [buildId1 Id2 …]     Remove one or more builds.
  clean   [configFile]                      Remove builds missed in updates.json
    -e, --except NAME1,NAME2                NAME1,NAME2 will be preserved
  list    [configFile]                      Show builds on a hosting.

BuildId has a following format: [platform]-[arch]-[channel]-[version]
  You can specify only a part of buildId, like linux-x64, defaults:
    platform: process.platform
    arch:     process.arch
    channel:  package.json:updater.channel or prod
    version:  package.json:version

Options:
  configFile             File with json ext, defaults to ./publisher.js
  -t, --transport        Selected transport
      --transport.{name} Specify a transport option
  -p, --path             Path to distributive files (default dist).
  -d, --debug            Show debug information
  -n, --noprogress       Don't show upload progress
      --fields.{name}    Specify a field in the target updates.json file 
      --help             Show this message
      --version          Show publisher version
```

### Transports

#### [SSH](docs/ssh.md)

Upload releases using SSH protocol. This transport uses
[ssh2](https://github.com/mscdex/ssh2) internally so you can check its
documentation for all transport options.

#### [Github](docs/github.md)

Upload updates to github releases. You can use this transport even if
you don't want to share your source code. For this purposes you just
need to create a public repository which will store your releases.

#### [FTP](docs/ftp.md)

Upload releases using FTP protocol. This transport uses
[node-ftp](https://github.com/mscdex/node-ftp) internally so you can
check its documentation for all transport options.

#### [Amazon S3](docs/s3.md)

Upload releases to S3 storage.

#### [Azure Blob storage](docs/azure.md)

#### [Local](docs/local.md)

This transport allows to create file structure which can be uploaded
to a server manually.

## Related
 - [electron-builder](https://github.com/electron-userland/electron-builder) -
 A complete solution to package and build an Electron app
 - [electron-simple-updater](https://github.com/megahertz/electron-simple-updater) -
 Simple way to enable update for the electron application

## License

Licensed under MIT.
