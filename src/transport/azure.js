"use strict";

const fs = require("fs");
const path = require("path");
const {
  BlobServiceClient,
  StorageSharedKeyCredential
} = require("@azure/storage-blob");

const AbstractTransport = require("./abstract");

class AzureTransport extends AbstractTransport {
  /**
   * @param {Object} options
   * @param {string} options.account REQUIRED
   * @param {string} options.accountKey REQUIRED
   * @param {string} options.containerName REQUIRED
   * @param {string} options.blobUrl defaults to `https://${options.account}.blob.core.windows.net`
   * @param {string} options.remoteUrl http accessible url (computed automatically if not defined)
   * @param {string} options.remotePath "prefix" inside the azure container
   */
  normalizeOptions(options) {
    if (!options.containerName) {
      throw new Error("Container name is required.");
    } else if (!options.account || !options.accountKey) {
      throw new Error("Please provide your azure storage account and key.");
    }

    if (options.remotePath && !options.remotePath.endsWith("/")) {
      options.remotePath += "/";
    } else if (!options.remotePath) {
      options.remotePath = "";
    }

    if (!options.blobUrl) {
      options.blobUrl = `https://${options.account}.blob.core.windows.net`;
    }

    if (!options.remoteUrl) {
      options.remoteUrl = `${options.blobUrl}/${options.containerName}/${options.remotePath}`;
    }

    super.normalizeOptions(options);
  }

  init() {
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

    super.init();
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const outPath = this.getOutFilePath(filePath, build);
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
      await blockBlobClient.uploadFile(filePath);
      return path.posix.join(
        this.options.blobUrl,
        this.options.containerName,
        outPath
      );
    } catch (e) {
      console.warn(`Couldn't upload ${filePath}: ${e.message}`);
      throw e;
    }
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  async pushUpdatesJson(data) {
    const outPath = path.join(this.options.remotePath, "updates.json");
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(outPath);
      const updatesJson = JSON.stringify(data, null, "  ");
      await blockBlobClient.upload(updatesJson, Buffer.byteLength(updatesJson));
      return;
    } catch (e) {
      console.warn(`Couldn't upload updates.json: ${e.message}`);
      throw e;
    }
  }

  /**
   * @return {Promise<Array<string>>}
   */
  async fetchBuildsList() {
    try {
      let builds = [];
      for await (const blob of this.containerClient.listBlobsByHierarchy("/", {
        prefix: this.options.remotePath
      })) {
        if (blob.kind !== "prefix") continue;
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
   * @return {Promise}
   */
  async removeBuild(build, resolveName = true) {
    try {
      const buildId = resolveName ? this.getBuildId(build) : build;
      const outPath = path.posix.join(this.options.remotePath, buildId);

      for await (const blob of this.containerClient.listBlobsFlat({
        prefix: outPath
      })) {
        try {
          const blockBlobClient = this.containerClient.getBlockBlobClient(
            blob.name
          );
          await blockBlobClient.delete({
            deleteSnapshots: "include"
          });
        } catch (e) {
          console.warn(`Couldn't remove file ${blob.name}: ${e.message}`);
          throw e;
        }
      }

      return Promise.resolve();
    } catch (e) {
      console.warn(`Couldn't list builds: ${e.message}`);
      throw e;
    }
  }

  getOutFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    return path.posix.join(
      this.options.remotePath,
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    );
  }
}

module.exports = AzureTransport;
