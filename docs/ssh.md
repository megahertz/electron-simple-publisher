# SSH transport

Upload releases using SSH protocol. This transport uses
[ssh2](https://github.com/mscdex/ssh2) internally so you can check its
documentation for all transport options.

## Configuration example:
*package.json*
```js
{
  ...
  "updater": {
    "url": "http://example.com/updates/updates.json"
  },
  ...
}
```

*publisher.json*
```js
{
  "transport": {
    "module": "ssh",
    "host": "example.com",
    "port": 20022,
    "username": "user",
    "password": "password",
    "remotePath": "/www/example.com/updates",
    "remoteUrl": "http://example.com/updates"
  }
}
```

## Options
Name                | Default                   | Description
--------------------|---------------------------|------------
remotePath*         |                           | Absolute path to a parent dir of updates.json on a hosting
remoteUrl*          |                           | Url for remotePath
host*               |                           | SSH server host
username            | current user              | A username on a hosting
password            | null                      | If not then key authentication will be used
privateKeyPath      | ~/.ssh/id_rsa             | Read a privateKey from this file
privateKey          |                           | You can specify it directly instead of using privateKeyPath
afterUploadCommand  | false                     | If set, this SSH command will be run when upload process has been finished
afterRemoveCommand  | false                    | If set, this SSH command will be run when remove process has been finished

Other SSH options you can find in
[ssh2 docs](https://github.com/mscdex/ssh2#client-methods)
