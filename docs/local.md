# Local transport

This transport allows to create file structure which can be uploaded
to a server manually.

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
    "remoteUrl": "http://example.com/updates"
  }
}
```

## Options
Name                | Default      | Description
--------------------|--------------|------------
remoteUrl*          |              | The release will be published at this url later
outPath             | dist/publish | Save build at this location