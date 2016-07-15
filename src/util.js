(function() {
  util = {};

  /**
   * Checks if a given variable is an array.
   */
  util.isArray = ('isArray' in Array) ?
    Array.isArray :
    function (value) {
      return Object.prototype.toString.call(value) === '[object Array]';
    };

  /**
   * Create an array with a defined length of default values.
   *
   * @param {Object|string|number} value
   * @param {number} length
   * @returns {Array}
   */
  Array.prototype.repeat = function (value, length) {
    while (length) this[--length] = value;
    return this;
  };

  /**
   * Flattens our data into an object with unique property names.
   *
   * @param {object} obj
   *  The object that contains all the data.
   * @return {object} result
   */
  util.flattenData = function (obj) {
    var result = {};

    // Flatten our (nested) object.
    flatten(obj, '', function (key, item) {
      result[key] = item;
    });

    return result;
  };


  // Private helper methods.
  function flatten(obj, ancestor, callback) {
    var item, key, parent;

    for (key in obj) {
      if (!obj.hasOwnProperty(key)) continue;

      item = obj[key];

      if (util.isArray(item)) {
        for (var i = 0; i < item.length; i++) {
          parent = ancestor + key + '_' + i + '_';
          flatten(item, parent, callback);
        }
      }
      else if (typeof item === 'object') {
        parent = ancestor + key + '_';
        flatten(item, parent, callback);

        continue;
      }

      key = ancestor + key;
      callback(key, item);
    }
  }
})();
