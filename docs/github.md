# Github transport

Upload updates to github releases. You can use this transport even if
you don't want to share your source code. For this purposes you just
need to create a public repository which will store your releases.

You only need to
[create a Github API token](https://github.com/settings/tokens/new)
to use this transport

## Configuration example:
*package.json*
```js
{
  ...
  "updater": {
    "url": "https://raw.githubusercontent.com/user/example/master/updates/{platform}-{arch}-{channel}.json"
  },
  ...
}
```

*publisher.json*
```js
{
  "transport": {
    "module": "github",
    "token": "1111111111111111111111111111111111111111"
  }
}
```

## Options
Name             | Default                                    | Description
-----------------|--------------------------------------------|------------
token*           |                                            | Github API token,
repository       | package.json:repository.url                | {username}/{reponame}
metaFilePath     | 'updates/{platform}-{arch}-{channel}.json' | Path to MetaFile from the repository root

Other SSH options you can find in
[ssh2 docs](https://github.com/mscdex/ssh2#client-methods)
