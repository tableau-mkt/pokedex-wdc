var wdcw = window.wdcw || {},
    qlimit = window.qlimit || {};

(function($, Q, tableau) {
  var retriesAttempted = 0,
      defaultLimit = 60,
      defaultOffset = 0,
      maxRetries = 2,
      pokedex = {},
      wdc;

  pokedex.name = 'Pokedex WDC';

  /**
   * Run during initialization of the web data connector.
   *
   * @param {string} phase
   *   The initialization phase. This can be one of:
   *   - tableau.phaseEnum.interactivePhase: Indicates when the connector is
   *     being initialized with a user interface suitable for an end-user to
   *     enter connection configuration details.
   *   - tableau.phaseEnum.gatherDataPhase: Indicates when the connector is
   *     being initialized in the background for the sole purpose of collecting
   *     data.
   *   - tableau.phaseEnum.authPhase: Indicates when the connector is being
   *     accessed in a stripped down context for the sole purpose of refreshing
   *     an OAuth authentication token.
   * @param {function} setUpComplete
   *   A callback function that you must call when all setup tasks have been
   *   performed.
   */
  pokedex.setup = function setup(phase) {
    switch (phase) {
      case tableau.phaseEnum.interactivePhase:
        // Perform actual interactive phase stuff.
        break;

      case tableau.phaseEnum.gatherDataPhase:
        // Perform set up tasks that should happen when Tableau is attempting to
        // retrieve data from your connector (the user is not prompted for any
        // information in this phase.
        break;

      case tableau.phaseEnum.authPhase:
        // Perform set up tasks that should happen when Tableau is attempting to
        // refresh OAuth authentication tokens.
        break;
    }

    // Always register when initialization tasks are complete by calling this.
    // This can be especially useful when initialization tasks are asynchronous
    // in nature.
    return Promise.resolve();
  };


  /**
   * Run when the web data connector is being unloaded. Useful if you need
   * custom logic to clean up resources or perform other shutdown tasks.
   *
   * @param {function} tearDownComplete
   *   A callback function that you must call when all shutdown tasks have been
   *   performed.
   */
  pokedex.teardown = function teardown() {
    // Once shutdown tasks are complete, call this. Particularly useful if your
    // clean-up tasks are asynchronous in nature.
    return Promise.resolve();
  };

  /**
   * Primary method called when Tableau is asking for the column headers that
   * this web data connector provides. Takes a single callable argument that you
   * should call with the headers you've retrieved.
   *
   * @param {function(Array<{name, type, incrementalRefresh}>)} registerHeaders
   *   A callback function that takes an array of objects as its sole argument.
   *   For example, you might call the callback in the following way:
   *   registerHeaders([
   *     {name: 'Boolean Column', type: 'bool'},
   *     {name: 'Date Column', type: 'date'},
   *     {name: 'DateTime Column', type: 'datetime'},
   *     {name: 'Float Column', type: 'float'},
   *     {name: 'Integer Column', type: 'int'},
   *     {name: 'String Column', type: 'string'}
   *   ]);
   *
   *   Note: to enable support for incremental extract refreshing, add a third
   *   key (incrementalRefresh) to the header object. Candidate columns for
   *   incremental refreshes must be of type datetime or integer. During an
   *   incremental refresh attempt, the most recent value for the given column
   *   will be passed as "lastRecord" to the tableData method. For example:
   *   registerHeaders([
   *     {name: 'DateTime Column', type: 'datetime', incrementalRefresh: true}
   *   ]);
   */
  pokedex.schema = function defineSchema() {
    return Promise.all([
      Q($.getJSON('/src/schema/pokemon.json')),
      Q($.getJSON('/src/schema/pokemon_species.json'))
    ]);
  };

  /**
   * Primary method called when Tableau is asking for your web data connector's
   * data. Takes a callable argument that you should call with all of the
   * data you've retrieved. You may optionally pass a token as a second argument
   * to support paged/chunked data retrieval.
   *
   *
   * @param {string} lastRecord
   *   Optional. If you indicate in the call to registerData that more data is
   *   available (by passing a token representing the last record retrieved),
   *   then the lastRecord argument will be populated with the token that you
   *   provided. Use this to update/modify the API call you make to handle
   *   pagination or filtering.
   *
   *   If you indicated a column in wdcw.columnHeaders suitable for use during
   *   an incremental extract refresh, the last value of the given column will
   *   be passed as the value of lastRecord when an incremental refresh is
   *   triggered.
   */
  pokedex.tables = {
    pokemon: {
      getData: function getPokemonData(lastRecord) {
        var settings = {
          "url": "http://pokeapi.co/api/v2/pokemon/",
          "limit": defaultLimit,
          "offset": defaultOffset
        };

        if (lastRecord) {
          settings.offset = Number(lastRecord) + 1;
        }

        return Promise.resolve(getAllData(settings));
      },
      /**
       * Transform pokemon data into the format expected for the pokemon table.
       *
       * @param {Object} rawData
       *   Raw data returned from the pokemon.getData method.
       *
       * @returns {Promise.<Array<any>>}
       */
      postProcess: function postProcessPokemonData(rawData) {
        tableau.log('Processing pokemon data');
        
        return new Promise(function (resolve, reject) {
          var processedData = [],
              excludeList = [];

          // Flattening the JSON data is expensive. Remove the properties we don't care about here.
          $.getJSON('/src/schema/pokemon.json', function (data) {
            if (data.hasOwnProperty('exclude')) {
              excludeList = data.exclude;
            }
          });

          rawData.forEach(function (data) {
            if (excludeList) {
              excludeList.forEach(function (exclude) {
                delete data[exclude];
              });
            }
            
            processedData.push(util.flattenData(data));
          });
          
          resolve(processedData);
        });
      }
    },
    pokemon_species: {
      getData: function getPokemonSpeciesData(lastRecord) {
        var settings = {
          "url": "http://pokeapi.co/api/v2/pokemon-species/",
          "limit": defaultLimit,
          "offset": defaultOffset
        };

        if (lastRecord) {
          settings.offset = Number(lastRecord) + 1;
        }

        return Promise.resolve(getAllData(settings));
      },
      /**
       * Transform pokemon species data into the format expected for the pokemon species table.
       *
       * @param {Object} rawData
       *   Raw data returned from the pokemon_species.getData method.
       *
       * @returns {Promise.<Array<any>>}
       */
      postProcess: function postProcessPokemonSpeciesData(rawData) {
        tableau.log('Processing pokemon species data');
        
        return new Promise(function (resolve, reject) {
          var processedData = [],
            excludeList = [];

          // Flattening the JSON data is expensive. Remove the properties we don't care about here.
          $.getJSON('/src/schema/pokemon_species.json', function (data) {
            if (data.hasOwnProperty('exclude')) {
              excludeList = data.exclude;
            }
          });

          rawData.forEach(function (data) {
            if (excludeList) {
              excludeList.forEach(function (exclude) {
                delete data[exclude];
              });
            }
            console.log(data);

            processedData.push(util.flattenData(data));
          });

          resolve(processedData);
        });
      }
    }
  };

  // You can write private methods for use above like this:
  /**
   * Helper function to grab all the data for a specific set.
   *
   * @param {Object} settings
   *   The settings used for our API payload.
   */
  function getAllData(settings) {
    return new Promise(function (resolve, reject) {
      var rawData = [];

      reject = function reject(reason) {
        tableau.log(reason);

        // Try and resolve.
        resolve(rawData);
      };

      getData(settings, function getNextData (data) {
        var hasMoreData = data.next || false;

        Promise.all(prefetchApiUrls(data.results)).then(function (items) {
          rawData = rawData.concat(items);

          if (hasMoreData) {
            settings = { "url": data.next };
            getData(settings, getNextData, reject);
          }
          else {
            resolve(rawData);
          }
        }, reject);
      }, reject);
    });
  }

  /**
   * AJAX call to our API.
   *
   * @param {Object} settings
   *   The url used for our API payload.
   * @param {function(data)} successCallback
   *   A callback function which takes one argument:
   *     data: result set from the API call.
   * @param {function(reason)} failCallback
   *   A callback which takes one argument:
   *     reason: A string describing why data collection failed.
   */
  function getData(settings, successCallback, failCallback) {
    var url = settings.url;

    if (settings.hasOwnProperty('limit')) {
      url = util.appendQueryParam(url, 'limit', settings.limit);
    }

    if (settings.hasOwnProperty('offset')) {
      url = util.appendQueryParam(url, 'offset', settings.offset);
    }

    retryLater = function () {
      if (retriesAttempted < maxRetries) {
        retriesAttempted++;

        // Wait up to 2 minutes before making another API call.
        setTimeout(function(){
          getData(settings, successCallback, failCallback);
        }, 120000);
      }
      else {
        failCallback('Too many requests, try an incremental refresh later.');
      }
    };
    
    $.ajax({
      url: url,
      method: "GET",
      success: function (response) {
        successCallback(response);
      },
      error: function (xhr, status, error) {
        if (xhr.status === 429) {
          tableau.log('Too many requests, wait a few minutes before the next one.');
          retryLater();
        }
        else {
          failCallback('JSON fetch failed for ' + settings.url + '.');
        }
      }
    });
  }
  // getData = Q.limitConcurrency(getData, 1);

  /**
   * Helper function to return an array of promises
   *
   * @param {object} results
   *   List of API urls.
   *
   * @returns {[]}
   *   An array of promise objects, set to resolve or reject after attempting to
   *   retrieve API data.
   */
  function prefetchApiUrls(results) {
    var promises = [],
      result = {},
      settings = {};

    for (var i = 0; i < results.length; i++) {
      result = results[i];

      if (result.hasOwnProperty('url')) {
        promises.push(new Promise(function (resolve, reject) {
          settings = {
            'url': result.url
          };

          getData(settings, function (data) {
            resolve(data);
          }, function (reason) {
            reject(reason);
          });
        }));
      }
    }

    return promises;
  }

  // Polyfill for btoa() in older browsers.
  // @see https://raw.githubusercontent.com/davidchambers/Base64.js/master/base64.js
  /* jshint ignore:start */
  if (typeof btoa === 'undefined') {
    btoa = function btoa(input) {
      var object = typeof exports != 'undefined' ? exports : this, // #8: web workers
        chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        str = String(input);

      function InvalidCharacterError(message) {
        this.message = message;
      }
      InvalidCharacterError.prototype = new Error;
      InvalidCharacterError.prototype.name = 'InvalidCharacterError';

      for (
        // initialize result and counter
        var block, charCode, idx = 0, map = chars, output = '';
        // if the next str index does not exist:
        //   change the mapping table to "="
        //   check if d has no fractional digits
        str.charAt(idx | 0) || (map = '=', idx % 1);
        // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
        output += map.charAt(63 & block >> 8 - idx % 1 * 8)
      ) {
        charCode = str.charCodeAt(idx += 3 / 4);
        if (charCode > 0xFF) {
          throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
      }
      return output;
    };
  }
  /* jshint ignore:end */

  // Instantiate our web data connector.
  wdc = wdcw(pokedex);

  return pokedex;
})(jQuery, Q, tableau);
