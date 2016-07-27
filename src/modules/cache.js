var MongoClient = require('mongodb').MongoClient;

function Cache (url) {
  var self = this;
  
  MongoClient.connect(url, function (err, db) {
    console.log(err);
    console.log(db);
    self.db = db;
  });
}

/**
 * Get all global settings.
 *
 * @param successCallback
 * @param failCallback
 */
Cache.prototype.getSettings = function (successCallback, failCallback) {
  this.db.collection('settings').find({'id': '1'}, {'id': 0, '_id': 0}).toArray(function (err, result) {
    if (err) {
      failCallback(err);
    }
    else {
      successCallback(result);
    }
  });
};

/**
 * Update a single setting.
 * 
 * @param id
 * @param settings
 * @param successCallback
 * @param failCallback
 */
Cache.prototype.updateSettings = function (id, settings, successCallback, failCallback) {
  this.db.collection('settings').update(
    { 'id': id },
    { 
      'id': id,
      'settings': settings 
    },
    { upsert: true },
    function(err, result) {
      if (err) {
        failCallback(err);
      }
      else {
        successCallback(result);
      }
    }
  );
};

/**
 *
 * @param collection
 * @param successCallback
 * @param failCallback
 */
Cache.prototype.getData = function (collection, successCallback, failCallback) {
  this.db.collection(collection).find({}, { _id: 0 }).toArray(function (err, result) {
    if (err) {
      failCallback(err);
    }
    else {
      successCallback(result);
    }
  });
};

/**
 * Update a single setting.
 *
 * @param collection
 * @param id
 * @param data
 * @param successCallback
 * @param failCallback
 */
Cache.prototype.updateData = function (collection, id, data, successCallback, failCallback) {
  this.db.collection(collection).update(
    { 'id': id},
    data,
    { upsert: true },
    function(err, result) {
      if (err) {
        failCallback(err);
      }
      else {
        successCallback(result);
      }
    }
  );
};

module.exports = Cache;
