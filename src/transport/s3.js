'use strict';

const fs   = require('fs');
const path = require('path');
const AWS  = require('aws-sdk');

const AbstractTransport = require('./abstract');

class S3Transport extends AbstractTransport {
  /**
   * @param {Object} options
   * @param {string} options.accessKeyId
   * @param {string} options.secretAccessKey
   * @param {string} [options.pathPrefix='']
   * @param {Object} [options.aws]
   * @param {string|Object} [options.bucket]
   */
  normalizeOptions(options) {
    super.normalizeOptions(options);

    const awsAuth = {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
      signatureVersion: 'v4',
    };
    options.aws = Object.assign(awsAuth, options.aws);

    if (!options.bucket) {
      options.bucket = this.commandOptions.packageJson.name + '-updates';
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

  init() {
    AWS.config.update(this.options.aws);
    //noinspection JSCheckFunctionSignatures
    this.s3 = new AWS.S3({ apiVersion: '2006-03-01' });
    this.q = this.createBucket(this.options.bucket);
  }

  /**
   * Upload file to a hosting and get its url
   * @abstract
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    const remotePath = this.getRemoteFilePath(filePath, build);
    const bucket = this.options.bucket.Bucket;

    return this.q
      .then(() => {
        const request = this.s3.putObject({
          ACL: 'public-read',
          Body: fs.createReadStream(filePath),
          Bucket: bucket,
          Key: remotePath,
        });

        if (!this.commandOptions.noprogress) {
          request.on('httpUploadProgress', (progress) => {
            this.setProgress(filePath, progress.loaded, progress.total);
          });
        }

        return request.promise();
      })
      .catch((e) => {
        console.warn(`Couldn't upload ${remotePath}: ${e.message}`);
        throw e;
      })
      .then(() => {
        if (this.options.aws.s3ForcePathStyle === true) {
          return `https://${this.s3.endpoint.host}/${bucket}/${remotePath}`;
        }

        return `https://${bucket}.${this.s3.endpoint.host}/${remotePath}`;
      });
  }

  /**
   * Save updates.json to a hosting
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    const bucket = this.options.bucket.Bucket;
    return this.q
      .then(() => {
        return this.s3.putObject({
          ACL: 'public-read',
          Body: JSON.stringify(data, null, '  '),
          Bucket: bucket,
          Key: this.options.pathPrefix + 'updates.json',
        }).promise();
      })
      .catch((e) => {
        console.warn(`Couldn't upload updates.json: ${e.message}`);
        throw e;
      })
      .then(() => this.getUpdatesJsonUrl());
  }

  /**
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    const prefix = this.options.pathPrefix;

    return this.getFileList(prefix)
      .then((response) => {
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
      });
  }

  /**
   * @return {Promise}
   */
  removeBuild(build, resolveName = true) {
    const bucket = this.options.bucket.Bucket;
    const buildId = resolveName ? this.getBuildId(build) : build;
    const prefix = this.options.pathPrefix;

    return this.getFileList(prefix + buildId)
      .then((response) => {
        return response.Contents.map(item => item.Key);
      })
      .then((keys) => {
        if (keys.length < 1) {
          throw new Error(`Build ${buildId} not found on s3`);
        }

        return this.s3.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: keys.map(key => ({ Key: key })),
          },
        })
          .promise()
          .catch((e) => {
            console.warn(
              `Couldn't remove objects:\n ${keys.join('\n')}\n ${e.message}`
            );
            throw e;
          });
      });
  }

  createBucket(bucketOptions) {
    return this.s3.headBucket({ Bucket: bucketOptions.Bucket })
      .promise()
      .catch((e) => {
        console.log(
          `The bucket ${bucketOptions.Bucket} isn't accessible: ${e.message}`
          + '. Trying to create a new bucket...'
        );
        return this.s3.createBucket(bucketOptions).promise();
      })
      .catch((e) => {
        console.warn(
          `Couldn't create the bucket ${bucketOptions.Bucket}: ${e.message}`
        );
        throw e;
      });
  }

  getRemoteFilePath(localFilePath, build) {
    localFilePath = path.basename(localFilePath);
    const prefix = this.options.pathPrefix;
    return prefix + path.posix.join(
      this.getBuildId(build),
      this.normalizeFileName(localFilePath)
    );
  }

  getFileList(prefix) {
    const bucket = this.options.bucket.Bucket;

    return this.q
      .then(() => {
        const options = { Bucket: bucket };
        if (prefix) {
          options.Prefix = prefix;
        }

        return this.s3.listObjectsV2(options).promise();
      })
      .catch((e) => {
        console.warn(`Couldn't get builds list: ${e.message}`);
        throw e;
      });
  }
}

module.exports = S3Transport;
