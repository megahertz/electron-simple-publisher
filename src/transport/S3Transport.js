'use strict';

const fs   = require('fs');
const path = require('path');
const AWS  = require('aws-sdk');

const AbstractTransport = require('./AbstractTransport');

/**
 * @property {string} options.accessKeyId
 * @property {string} options.secretAccessKey
 * @property {string} options.metaFileName
 * @property {string} options.pathPrefix
 * @property {Object} options.aws
 * @property {string|Object} [options.bucket]
 */
class S3Transport extends AbstractTransport {
  normalizeOptions(options) {
    super.normalizeOptions(options);

    options.aws = {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      signatureVersion: 'v4',
      ...options.aws,
    };

    if (!options.bucket) {
      options.bucket = this.config.appName + '-updates';
    }

    if (typeof options.bucket === 'string') {
      options.bucket = {
        Bucket: options.bucket,
        ACL: 'public-read',
      };
    }

    if (!options.bucket.Bucket) {
      throw new Error('The transport.bucket option is not set');
    }

    options.pathPrefix = options.pathPrefix || '';
  }

  async init() {
    super.init();

    AWS.config.update(this.options.aws);
    //noinspection JSCheckFunctionSignatures
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    return this.createBucket(this.options.bucket);
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const remotePath = this.getRemoteFilePath(filePath, build);
    const bucket = this.options.bucket.Bucket;

    const options = {
      ACL: 'public-read',
      Body: fs.createReadStream(filePath),
      Bucket: bucket,
      Key: remotePath,
    };

    try {
      const request = this.s3.putObject(options);

      if (this.config.showProgress) {
        request.on('httpUploadProgress', (progress) => {
          this.setProgress(filePath, progress.loaded, progress.total);
        });
      }

      await request.promise();
    } catch (e) {
      console.warn(`Couldn't upload ${remotePath}: ${e.message}`);
      throw e;
    }

    if (this.options.aws.s3ForcePathStyle === true) {
      return `https://${this.s3.endpoint.host}/${bucket}/${remotePath}`;
    }

    return `https://${bucket}.${this.s3.endpoint.host}/${remotePath}`;
  }

  /**
   * Save MetaFile to a hosting
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const bucket = this.options.bucket.Bucket;

    const metaPath = this.replaceBuildTemplates(
      this.options.pathPrefix + this.options.metaFileName,
      build
    );

    const options = {
      ACL: 'public-read',
      Body: JSON.stringify(data, null, '  '),
      Bucket: bucket,
      Key: metaPath,
    };

    try {
      await this.s3.putObject(options).promise();
    } catch (e) {
      console.warn(`Couldn't upload meta file: ${e.message}`);
      throw e;
    }

    return this.getMetaFileUrl(build);
  }

  /**
   * @return {Promise<string[]>}
   */
  async fetchBuildsList() {
    const prefix = this.options.pathPrefix;

    const response = await this.getFileList(prefix);

    return response.Contents
      .map(item => item.Key)
      .map((key) => {
        if (!prefix) return key;

        if (key.startsWith(prefix)) {
          key = key.substring(prefix.length);
        }

        return key;
      })
      .map(key => key.split('/')[0])
      .filter(key => key.match(/^\w+-\w+-\w+-[\w.]+$/))
      .filter((item, pos, self) => self.indexOf(item) === pos);
  }

  /**
   * @param {string} resource
   * @return {Promise}
   */
  async removeResource(resource) {
    const bucket = this.options.bucket.Bucket;
    const prefix = this.options.pathPrefix;

    const listResp = await this.getFileList(prefix + resource);

    const keys = listResp.Contents.map(item => item.Key);
    if (keys.length < 1) {
      throw new Error(`Build ${resource} not found on s3`);
    }

    const options = {
      Bucket: bucket,
      Delete: {
        Objects: keys.map(key => ({ Key: key })),
      },
    };

    try {
      await this.s3.deleteObjects(options).promise();
    } catch (e) {
      console.warn(
        `Couldn't remove objects:\n ${keys.join('\n')}\n ${e.message}`
      );
      throw e;
    }
  }

  async createBucket(bucketOptions) {
    try {
      await this.s3.headBucket({ Bucket: bucketOptions.Bucket }).promise();
    } catch (e) {
      console.warn(
        `Couldn't create the bucket ${bucketOptions.Bucket}: ${e.message}`
      );
      throw e;
    }

    return this.s3.createBucket(bucketOptions).promise();
  }

  getRemoteFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    const prefix = this.options.pathPrefix;
    return prefix + path.posix.join(
      build.idWithVersion,
      this.normalizeFileName(localFilePath)
    );
  }

  async getFileList(prefix) {
    const bucket = this.options.bucket.Bucket;

    const options = {
      Bucket: bucket,
      ...(prefix ? { Prefix: prefix } : {}),
    };

    try {
      return this.s3.listObjectsV2(options).promise();
    } catch (e) {
      console.warn(`Couldn't get builds list: ${e.message}`);
      throw e;
    }
  }
}

module.exports = S3Transport;
