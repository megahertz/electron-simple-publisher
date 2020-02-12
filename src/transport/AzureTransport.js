'use strict';

const path = require('path');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
} = require('@azure/storage-blob');

const AbstractTransport = require('./AbstractTransport');

/**
 * @property {string} options.account REQUIRED
 * @property {string} options.accountKey REQUIRED
 * @property {string} options.containerName REQUIRED
 * @property {string} options.blobUrl the base url
 * @property {string} options.metaFileName
 * @property {string} options.remoteUrl http accessible url
 * @property {string} options.remotePath "prefix" inside the azure container
 */
class AzureTransport extends AbstractTransport {
  normalizeOptions(options) {
    if (!options.containerName) {
      throw new Error('Container name is required.');
    } else if (!options.account || !options.accountKey) {
      throw new Error('Please provide your azure storage account and key.');
    }

    if (options.remotePath && !options.remotePath.endsWith('/')) {
      options.remotePath += '/';
    } else if (!options.remotePath) {
      options.remotePath = '';
    }

    if (!options.blobUrl) {
      options.blobUrl = `https://${options.account}.blob.core.windows.net`;
    }

    if (!options.remoteUrl) {
      options.remoteUrl = options.blobUrl
        + `/${options.containerName}/${options.remotePath}`;
    }

    super.normalizeOptions(options);
  }

  async init() {
    super.init();

    this.sharedKeyCredential = new StorageSharedKeyCredential(
      this.options.account,
      this.options.accountKey
    );

    this.blobServiceClient = new BlobServiceClient(
      this.options.blobUrl,
      this.sharedKeyCredential
    );

    this.containerClient = this.blobServiceClient.getContainerClient(
      this.options.containerName
    );
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const outPath = this.getOutFilePath(filePath, build);

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
      await blockBlobClient.uploadFile(filePath);
      return `${this.options.blobUrl}/` + path.posix.join(
        this.options.containerName,
        outPath
      );
    } catch (e) {
      console.warn(`Couldn't upload ${filePath}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Save MetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const outPath = this.replaceBuildTemplates(
      path.posix.join(this.options.remotePath, this.options.metaFileName),
      build
    );

    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
      const meta = JSON.stringify(data, null, '  ');
      await blockBlobClient.upload(meta, Buffer.byteLength(meta));
      return this.getMetaFileUrl(build);
    } catch (e) {
      console.warn(`Couldn't upload MetaFile: ${e.message}`);
      throw e;
    }
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    try {
      const builds = [];
      for await (const blob of this.containerClient.listBlobsByHierarchy('/', {
        prefix: this.options.remotePath,
      })) {
        if (blob.kind !== 'prefix') continue;
        // Remove prefix and ending / from name
        const name = blob.name.slice(
          this.options.remotePath.length,
          blob.name.length - 1
        );
        if (name.match(/^\w+-\w+-\w+-[\w.]+$/)) {
          builds.push(name);
        }
      }
      return Promise.resolve(builds);
    } catch (e) {
      console.warn(`Couldn't list builds: ${e.message}`);
      throw e;
    }
  }

  /**
   * Remove the resource (build id) from a hosting
   * @abstract
   * @param {string} resource
   * @return {Promise}
   */
  async removeResource(resource) {
    try {
      const outPath = path.posix.join(this.options.remotePath, resource);

      for await (const blob of this.containerClient.listBlobsFlat({
        prefix: outPath,
      })) {
        const blockBlobClient = this.containerClient.getBlockBlobClient(
          blob.name
        );

        await blockBlobClient.delete({ deleteSnapshots: 'include' });
      }
    } catch (e) {
      console.warn(`Couldn't remove build: ${e.message}`);
      throw e;
    }
  }

  getOutFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.remotePath,
      build.idWithVersion,
      this.normalizeFileName(localFilePath)
    );
  }
}

module.exports = AzureTransport;
