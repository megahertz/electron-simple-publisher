# Azure Blob storage transport

## Configuration example:
*package.json*
```js
{
  ...
  "updater": {
    "url": "https://example-updates.blob.core.windows.net/update-container/updates.json"
  },
  ...
}
```

*publisher.json*
```js
{
  "transport": {
    "module": "azure",
    "account": "Your Azure account",
    "accountKey": "Your Account Key",
    "containerName": "Container for updates"
  }
}
```

## Options
Name          | Default                                   | Description
--------------|-------------------------------------------|------------
account       |                                           | Azure account
accountKey    |                                           | Account API Key
containerName |                                           | Directory where updates are stored
blobUrl       | https://${account}.blob.core.windows.net  | Service root url
remoteUrl     | ${blobUrl}/${containerName}/${remotePath} | Service root url + resurce path
remotePath    | ''
