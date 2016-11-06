# electron-simple-publisher
[![Build Status](https://travis-ci.org/megahertz/electron-simple-publisher.svg?branch=master)](https://travis-ci.org/megahertz/electron-simple-publisher)
[![npm version](https://badge.fury.io/js/electron-simple-publisher.svg)](https://badge.fury.io/js/electron-simple-publisher)

# This module is in active development. The final version will be ready in a few days.

## Description

This module allows to easily publish updates created by
[electron-builder](https://github.com/electron-userland/electron-builder).
Now SSH and github releases transports are supported.
You can add updates support to your application using
[electron-simple-updater](https://github.com/megahertz/electron-simple-updater)

## Installation

Install with [npm](https://npmjs.org/package/electron-simple-publisher):

    npm install --save-dev electron-simple-publisher
    
## Usage
1. Make a distributive package using electron-builder

2. Set options:
You can specify all option through command line arguments, but it's
easier to store the config in publisher.json in the project root. Here is
an example for publishing through SSH:
```js
{
  "transport": {
    "module": "ssh",
    "host": "example.com",
    "username": "user",
    "password": "user's password",
    "remotePath": "/www/example.com/updates",
    "remoteUrl": "http://example.com/updates",
    // If you've already set package.json:updater.url you can skip this option:
    "updatesJsonUrl": "http://example.com/updates/update.json"
  },
  "fields": { // Additional fields which will be added to updates.json
    "readme": "The first version"
  }
}
```

3. Run a publish command:
`$ node_modules/.bin/publish` # will publish the latest build for the current platfrom

### Command line arguments

```sh
Usage: publish [command] [options] [arguments]

Commands (default is publish):
  publish [configFile] [buildId...] Publish a new build(s).
  replace [configFile] [buildId]    Remove and then publish again the build.
  remove  [configFile] [buildId...] Remove one or more builds.
  list    [configFile]              Show builds which are already on a hosting.

BuildId has a following format: [platform]-[arch]-[channel]-v[version]
  You can specify only a part of buildId, like linux-x64, defaults:
    platform: process.platform
    arch:     process.arch
    channel:  package.json:updater.channel
    version:  package.json:version

Options:
  configFile        File with json ext, defaults to ./publisher.json
  -t or --transport Name of node module which implements Transport interface.
  -p or --path      Path to the directory with distributive files.
  -d or --debug     Show debug information
  --field-{name}    Set {name} field of updates.json
  -h or --help      Show this message
```

### SSH Options
Name                | Default                   | Description
--------------------|---------------------------|------------
remotePath*         |                           | Path to a folder with updates.json on a hosting
remoteUrl*          |                           | Url for remotePath
username            | current user              | A username on a hosting
password            | null                      | If not then key authentication will be used
usePrivateKey       | true if no password       | Key authentication
privateKeyPath      | ~/.ssh/id_rsa             | Read a privateKey from this file
privateKey          |                           | You can specify it directly instead of read by default
afterUploadCommand  | false                     | If set, this SSH command will be run when upload process has been finished 
afterRemoveCommand  | false                     | If set, this SSH command will be run when remove process has been finished
Other SSH options you can find in [ssh2 docs](https://github.com/mscdex/ssh2#client-methods)

### Github options
Name                | Default                     | Description
--------------------|-----------------------------|------------
token*              |                             | Github API token, [you can create it here](https://github.com/settings/tokens/new)
repository          | package.json:repository.url | Path to a folder with updates.json on a hosting
updatesJsonPath     | '' (repository root)        | Path to updates.json from the repository root

## Related
 - [electron-builder](https://github.com/electron-userland/electron-builder) -
 A complete solution to package and build an Electron app
 - [electron-simple-updater](https://github.com/megahertz/electron-simple-updater) -
 Simple way to enable update for the electron application
    
## License

Licensed under MIT.
