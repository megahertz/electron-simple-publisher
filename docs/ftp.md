# FTP transport

Upload releases using FTP protocol. This transport uses
[node-ftp](https://github.com/mscdex/node-ftp) internally so you can
check its documentation for all transport options.

## Configuration example:
*package.json*
```js
{
  ...
  "updater": {
    "url": "http://example.com/updates/{platform}-{arch}-{channel}.json"
  },
  ...
}
```

*publisher.json*
```js
{
  "transport": {
    "module": "ftp",
    "host": "example.com",
    "port": 20021,
    "user": "user",
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
host*               |                           | FTP server host
user*               |                           | FTP username
password*           |                           | FTP password
port                | 21                        | FTP port


Other FTP options you can find in
[node-ftp docs](https://github.com/mscdex/node-ftp#methods)
