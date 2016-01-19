/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

require('ass')
var tap = require('tap')
var test = tap.test
var uuid = require('uuid')
var crypto = require('crypto')
var proxyquire = require('proxyquire')
var log = { trace: console.log, info: console.log }

var config = require('../../config').getProperties()
var TestServer = require('../test_server')
var Token = require('../../lib/tokens')(log)
var DB = require('../../lib/db')(
  config.db.backend,
  log,
  Token.error,
  Token.SessionToken,
  Token.KeyFetchToken,
  Token.AccountResetToken,
  Token.PasswordForgotToken,
  Token.PasswordChangeToken
)

var zeroBuffer16 = Buffer('00000000000000000000000000000000', 'hex')
var zeroBuffer32 = Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex')

var SESSION_TOKEN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.10; rv:41.0) Gecko/20100101 Firefox/41.0'
var ACCOUNT = {
  uid: uuid.v4('binary'),
  email: 'push' + Math.random() + '@bar.com',
  emailCode: zeroBuffer16,
  emailVerified: false,
  verifierVersion: 1,
  verifyHash: zeroBuffer32,
  authSalt: zeroBuffer32,
  kA: zeroBuffer32,
  wrapWrapKb: zeroBuffer32
}
var mockLog = {
  error: function () {
  },
  increment: function () {
  },
  trace: function () {
  }
}

var dbServer
var dbConn = TestServer.start(config)
    .then(
      function (server) {
        dbServer = server
        return DB.connect(config[config.db.backend])
      }
    )

test(
  'push db tests',
  function (t) {
    var sessionTokenId
    var deviceInfo = {
      id: crypto.randomBytes(16),
      name: 'my push device',
      type: 'mobile',
      pushCallback: 'https://foo/bar',
      pushPublicKey: crypto.randomBytes(32)
    }
    var mocks = {
      request: {
        post: function (url, cb) {
          return cb(new Error('Failed 400 level'), {
            statusCode: 410
          })
        }
      }
    }

    dbConn.then(function (db) {
      var push = proxyquire('../../lib/push', mocks)(mockLog, db)

      return db.createAccount(ACCOUNT)
        .then(function() {
          return db.emailRecord(ACCOUNT.email)
        })
        .then(function(emailRecord) {
          emailRecord.createdAt = Date.now()
          return db.createSessionToken(emailRecord, SESSION_TOKEN_UA)
        })
        .then(function (sessionToken) {
          sessionTokenId = sessionToken.tokenId
          return db.createDevice(ACCOUNT.uid, sessionTokenId, deviceInfo)
        })
        .then(function (device) {
          t.equal(device.name, deviceInfo.name)
          t.equal(device.pushCallback, deviceInfo.pushCallback)
          t.equal(device.pushPublicKey, deviceInfo.pushPublicKey)
        })
        .then(function () {
          return push.notifyUpdate(ACCOUNT.uid)
        })
        .then(function () {
          return db.devices(ACCOUNT.uid)
        })
        .then(function (devices) {
          var device = devices[0]
          var emptyBuffer = new Buffer(32)
          emptyBuffer.fill(0)
          t.equal(device.name, deviceInfo.name)
          t.equal(device.pushCallback, '')
          t.equal(device.pushPublicKey.toString('hex'), emptyBuffer.toString('hex'))
          t.end()
        })
    })
  }
)

test(
  'teardown',
  function (t) {
    return dbConn.then(function(db) {
      return db.close()
    }).then(function() {
      return dbServer.stop()
    }).then(function () {
      t.end()
    })
  }
)
