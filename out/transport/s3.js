'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var path = require('path');
var AWS = require('aws-sdk');

var AbstractTransport = require('./abstract');

var S3Transport = function (_AbstractTransport) {
  _inherits(S3Transport, _AbstractTransport);

  function S3Transport() {
    _classCallCheck(this, S3Transport);

    return _possibleConstructorReturn(this, (S3Transport.__proto__ || Object.getPrototypeOf(S3Transport)).apply(this, arguments));
  }

  _createClass(S3Transport, [{
    key: 'normalizeOptions',

    /**
     * @param {Object} options
     * @param {string} options.accessKeyId
     * @param {string} options.secretAccessKey
     * @param {string} [options.pathPrefix='']
     * @param {Object} [options.aws]
     * @param {string|Object} [options.bucket]
     */
    value: function normalizeOptions(options) {
      _get(S3Transport.prototype.__proto__ || Object.getPrototypeOf(S3Transport.prototype), 'normalizeOptions', this).call(this, options);

      var awsAuth = {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
        signatureVersion: 'v4'
      };
      options.aws = Object.assign(awsAuth, options.aws);
      var _arr = ['accessKeyId', 'secretAccessKey'];
      for (var _i = 0; _i < _arr.length; _i++) {
        var name = _arr[_i];
        if (!options.aws[name]) {
          throw new Error('The transport.' + name + ' option is not set');
        }
      }

      if (!options.bucket) {
        options.bucket = this.commandOptions.packageJson.name + '-updates';
      }

      if (typeof options.bucket === 'string') {
        options.bucket = {
          Bucket: options.bucket,
          ACL: 'public-read'
        };
      }

      if (!options.bucket.Bucket) {
        throw new Error('The transport.bucket option is not set');
      }

      options.pathPrefix = options.pathPrefix || '';
    }
  }, {
    key: 'init',
    value: function init() {
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

  }, {
    key: 'uploadFile',
    value: function uploadFile(filePath, build) {
      var _this2 = this;

      var remotePath = this.getRemoteFilePath(filePath, build);
      var bucket = this.options.bucket.Bucket;

      return this.q.then(function () {
        return _this2.s3.putObject({
          ACL: 'public-read',
          Body: fs.createReadStream(filePath),
          Bucket: bucket,
          Key: remotePath
        }).on('httpUploadProgress', function (progress) {
          _this2.setProgress(filePath, progress.loaded, progress.total);
        }).promise();
      }).catch(function (e) {
        console.warn('Couldn\'t upload ' + remotePath + ': ' + e.message);
        throw e;
      }).then(function () {
        return 'https://' + bucket + '.s3.amazonaws.com/' + remotePath;
      });
    }

    /**
     * Save updates.json to a hosting
     * @return {Promise<string>} Url to updates.json
     */

  }, {
    key: 'pushUpdatesJson',
    value: function pushUpdatesJson(data) {
      var _this3 = this;

      var bucket = this.options.bucket.Bucket;
      return this.q.then(function () {
        return _this3.s3.putObject({
          ACL: 'public-read',
          Body: JSON.stringify(data, null, '  '),
          Bucket: bucket,
          Key: _this3.options.pathPrefix + 'updates.json'
        }).promise();
      }).catch(function (e) {
        console.warn('Couldn\'t upload updates.json: ' + e.message);
        throw e;
      }).then(function () {
        return _this3.getUpdatesJsonUrl();
      });
    }

    /**
     * @return {Promise<Array<string>>}
     */

  }, {
    key: 'fetchBuildsList',
    value: function fetchBuildsList() {
      var prefix = this.options.pathPrefix;

      return this.getFileList(prefix).then(function (response) {
        return response.Contents.map(function (item) {
          return item.Key;
        }).map(function (key) {
          if (!prefix) return key;

          if (key.startsWith(prefix)) {
            key = key.substring(prefix.length);
          }

          return key;
        }).map(function (key) {
          return key.split('/')[0];
        }).filter(function (key) {
          return key.match(/^\w+-\w+-\w+-[\w.]+$/);
        }).filter(function (item, pos, self) {
          return self.indexOf(item) === pos;
        });
      });
    }

    /**
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      var _this4 = this;

      var bucket = this.options.bucket.Bucket;
      var buildId = this.getBuildId(build);
      var prefix = this.options.pathPrefix;

      return this.getFileList(prefix + buildId).then(function (response) {
        return response.Contents.map(function (item) {
          return item.Key;
        });
      }).then(function (keys) {
        if (keys.length < 1) {
          throw new Error('Build ' + buildId + ' not found on s3');
        }

        return _this4.s3.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: keys.map(function (key) {
              return { Key: key };
            })
          }
        }).promise().catch(function (e) {
          console.warn('Couldn\'t remove objects:\n ' + keys.join('\n') + '\n ' + e.message);
          throw e;
        });
      });
    }
  }, {
    key: 'createBucket',
    value: function createBucket(bucketOptions) {
      var _this5 = this;

      return this.s3.headBucket({ Bucket: bucketOptions.Bucket }).promise().catch(function (e) {
        console.log('The bucket ' + bucketOptions.Bucket + ' isn\'t accessible: ' + e.message + '. Trying to create a new bucket...');
        return _this5.s3.createBucket(bucketOptions).promise();
      }).catch(function (e) {
        console.warn('Couldn\'t create the bucket ' + bucketOptions.Bucket + ': ' + e.message);
        throw e;
      });
    }
  }, {
    key: 'getRemoteFilePath',
    value: function getRemoteFilePath(localFilePath, build) {
      localFilePath = path.basename(localFilePath);
      var prefix = this.options.pathPrefix;
      return prefix + path.posix.join(this.getBuildId(build), this.normalizeFileName(localFilePath));
    }
  }, {
    key: 'getFileList',
    value: function getFileList(prefix) {
      var _this6 = this;

      var bucket = this.options.bucket.Bucket;

      return this.q.then(function () {
        var options = { Bucket: bucket };
        if (prefix) {
          options.Prefix = prefix;
        }

        return _this6.s3.listObjectsV2(options).promise();
      }).catch(function (e) {
        console.warn('Couldn\'t get builds list: ' + e.message);
        throw e;
      });
    }
  }]);

  return S3Transport;
}(AbstractTransport);

module.exports = S3Transport;