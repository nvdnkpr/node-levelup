/* Copyright (c) 2012 Rod Vagg <@rvagg> */

var ba      = require('buster').assertions
  , async   = require('async')
  , rimraf  = require('rimraf')
  , fs      = require('fs')
  , path    = require('path')
  , levelup = require('../lib/levelup.js')
  , child_process = require('child_process')
  , dbidx   = 0

ba.add('isInstanceOf', {
    assert: function (actual, expected) {
        return actual instanceof expected
    }
  , refute: function (actual, expected) {
        return !(actual instanceof expected)
    }
  , assertMessage: '${0} expected to be instance of ${1}'
  , refuteMessage: '${0} expected not to be instance of ${1}'
})

ba.add('isUndefined', {
    assert: function (actual) {
        return actual === undefined
    }
  , refute: function (actual) {
        return actual !== undefined
    }
  , assertMessage: '${0} expected to be undefined'
  , refuteMessage: '${0} expected not to be undefined'
})

global.openTestDatabase = function (location, callback) {
  callback = typeof location == 'function' ? location : callback
  location = typeof location == 'string' ? location : path.join(__dirname, 'levelup_test_db_' + dbidx++)
  rimraf(location, function (err) {
    refute(err)
    this.cleanupDirs.push(location)
    var db = levelup.createDatabase(
            location
          , {
                createIfMissing: true
              , errorIfExists: true
            }
        )
    this.closeableDatabases.push(db)
    db.open(function (err) {
      refute(err)
      callback(db)
    })
  }.bind(this))
}

global.commonTearDown = function (done) {
  async.forEach(
      this.closeableDatabases
    , function (db, callback) {
        db.close(callback)
      }
    , function () {
        async.forEach(this.cleanupDirs, rimraf, done)
      }.bind(this)
  )
}

global.loadBinaryTestData = function (callback) {
  fs.readFile(path.join(__dirname, 'testdata.bin'), callback)
}

global.binaryTestDataMD5Sum = '920725ef1a3b32af40ccd0b78f4a62fd'

global.checkBinaryTestData = function (testData, callback) {
  var fname = '__tst.dat.' + Math.random()
  fs.writeFile(fname, testData, function (err) {
    refute(err)
    child_process.exec('which md5sum', function (err, stdout) {
      child_process.exec((stdout !== '' ? 'md5sum ' : 'md5 -r ') + fname, function (err, stdout, stderr) {
        refute(err)
        refute(stderr)
        var md5Sum = stdout.split(' ')[0]
        assert.equals(md5Sum, global.binaryTestDataMD5Sum)
        fs.unlink(fname, callback)
      })
    })
  })
}

global.commonSetUp = function () {
  this.cleanupDirs = []
  this.closeableDatabases = []
  this.openTestDatabase = openTestDatabase.bind(this)
  this.timeout = 500
}