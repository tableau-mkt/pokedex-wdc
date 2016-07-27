var wdcw = window.wdcw || {};

(function($, Q, tableau) {
  var excludes,
      baseUrl = "https://pokeapi.co/api/v2/",
      caching = true,
      retriesAttempted = 0,
      totalRecords = 0,
      settings = {
        'maxRetries': 2,
        'maxLimit': 180,
        'limit': 60,
        'offset': {
          'generation': 0,
          'pokemon': 0,
          'pokemon-species': 0
        }
      },
      pokedex = {},
      wdc;

  pokedex.name = 'Pokedex WDC';

  /**
   * Flattening a JSON object is expensive. This list contains data properties
   * which are not being used, and therefore should be excluded from the flattening process.
   * 
   * @type {{schema_name: string[property_name_1, property_name_2]}}
   */
  excludes = {
    "generation": ["pokemon_species", "types", "version_groups", "names"],
    "pokemon": ["forms", "abilities", "moves", "held_items", "game_indices"],
    "pokemon-species": ["form_descriptions", "flavor_text_entries", "names", "varieties", "evolution_chain", "genera", "pal_park_encounters"]
  };
  
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

        // If caching is enabled, grab the default settings.
        if (caching) {
          return new Promise(function(resolve, reject) {
            getData('/cache/settings', 
              function (result) {
                if (typeof(result[0]) === 'object' && result[0].hasOwnProperty('settings')) {
                  result = result[0].settings;
                }

                // Update the offset variables.
                for (var name in result) {
                  if (result.hasOwnProperty(name)) {
                    settings.offset[name] = result[name];
                  }
                }
                
                resolve(Promise.resolve());
              },
              function (err) {
                console.log(err);
              }
            );
          });
        }
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

    // If caching is enabled, save our settings.
    if (caching) {
      return new Promise(function(resolve, reject) {
        saveData('/cache/settings/1', settings.offset,
          function (result) {
            resolve(Promise.resolve());
          },
          function (err) {
            console.log(err);
          }
        );
      });
    }
    
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
      Q($.getJSON('/schema/generation.json')),
      Q($.getJSON('/schema/pokemon.json')),
      Q($.getJSON('/schema/pokemon_species.json'))
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
    generation: {
      getData: function getPokemonData(lastRecord) {
        var type = "generation";
        
        // Support incremental refreshing.
        if (lastRecord) {
          settings.offset[type] = Number(lastRecord) + 1;
        }

        return Promise.resolve(getAllData(type));
      },
      /**
       * Transform games generation data into the format expected for the generation table.
       *
       * @param {Object} rawData
       *   Raw data returned from the games_generation.getData method.
       *
       * @returns {Promise.<Array<any>>}
       */
      postProcess: function postProcessGamesGenerationData(rawData) {
        var type = "generation";
        
        console.log('Processing games generation data');

        return Promise.resolve(postProcessData(type, rawData));
      }
    },
    pokemon: {
      getData: function getPokemonData(lastRecord) {
        var type = "pokemon";
        
        if (lastRecord) {
          settings.offset[type] = Number(lastRecord) + 1;
        }

        return Promise.resolve(getAllData(type));
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
        var type = "pokemon";
        
        console.log('Processing pokemon data');

        return Promise.resolve(postProcessData(type, rawData));
      }
    },
    "species": {
      getData: function getPokemonSpeciesData(lastRecord) {
        var type = "pokemon-species";
        
        if (lastRecord) {
          settings.offset[type] = Number(lastRecord) + 1;
        }

        return Promise.resolve(getAllData(type));
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
        var type = "pokemon-species";
        
        console.log('Processing pokemon species data');

        return Promise.resolve(postProcessData(type, rawData));
      }
    }
  };

  // You can write private methods for use above like this:
  /**
   * Helper function to grab all the data for a specific set.
   *
   * @param string type
   *   The type used for our API payload.
   */
  function getAllData(type) {
    return new Promise(function (resolve, reject) {
      var rawData = [],
          url = baseUrl + type;

      reject = function reject(reason) {
        // Try and resolve.
        resolve(rawData);
      };

      // Append query params.
      url = util.appendQueryParam(url, 'limit', settings.limit);
      url = util.appendQueryParam(url, 'offset', settings.offset[type]);

      getData(url, function getNextData (data) {
        var hasMoreData = data.next || false,
            count = data.count,
            current,
            promises = prefetchApiUrls(data.results);
        
        Promise.all(promises).then(function (items) {
          current = items[items.length - 1];
          totalRecords = totalRecords + items.length;
          rawData = rawData.concat(items);

          if (hasMoreData && totalRecords < settings.maxLimit) {
            getData(data.next, getNextData, reject);
          }
          else {
            if (caching) {
              // Update the offset.
              if (current.id >= count) {
                settings.offset[type] = 0;
              }
              else {
                settings.offset[type] = current.id;
              }
              
              saveAllData('/cache/data/' + type, rawData).then(function () {
                resolve(rawData);
              });
            }
            else {
              resolve(rawData);
            }  
          }
        }, reject);
      }, reject);
    });
  }

  /**
   * AJAX call our API/cache.
   *
   * @param {string} url
   *   The url used for our API payload.
   * @param {function(data)} successCallback
   *   A callback function which takes one argument:
   *     data: result set from the API call.
   * @param {function(reason)} failCallback
   *   A callback which takes one argument:
   *     reason: A string describing why data collection failed.
   */
  function getData(url, successCallback, failCallback) {
    $.ajax({
      url: url,
      method: "GET",
      success: function (response) {
        console.log('Got data for: ' + url);
        successCallback(response);
      },
      error: function (xhr, status, error) {
        if (xhr.status === 429) {
          console.log('Too many requests, wait a few minutes before trying the next one.');
          
          if (retriesAttempted < maxRetries) {
            retriesAttempted++;

            // Wait 5 seconds before making another API call.
            setTimeout(function(){
              getData(url, successCallback, failCallback);
            }, 5000);
          }
          else {
            failCallback('Too many requests, try an incremental refresh later.');
          }
        }
        else {
          failCallback('JSON fetch failed for ' + url + '.');
        }
      }
    });
  }

  /**
   * Helper function to post process the data to make it ready for Tableau.
   * 
   * @param type
   * @param rawData
   * @returns {Promise}
   */
  function postProcessData(type, rawData) {
    var processData,
        processedData = [],
        getCachedData,
        promise;

    // Flatten data structure.
    processData = function (data) {
      promise = new Promise(function (resolve, reject) {
        data.forEach(function (data) {
          if (excludes.hasOwnProperty(type)) {
            excludes[type].forEach(function (name) {
              data[name] = undefined;
            });
          }

          processedData.push(util.flattenData(data));
        });

        resolve(processedData);
      });

      return promise;
    };

    // Get our cached data.
    getCachedData = function () {
      promise = new Promise(function (resolve, reject) {
        getData('/cache/data/' + type, function (result) {
          resolve(result);
        }, function (reason) {
          reject(reason);
        });
      });
      return promise;
    };
    
    if (caching) {
      return getCachedData().then(processData);
    }
    else {
      return Promise.resolve(processData);
    }
  }

  /**
   * Helper function to return an array of promises
   *
   * @param {string} url
   *   Url of the API to save to.
   * @param {array} records
   *   Array of data objects.
   *
   * @returns {[]}
   *   An array of promise objects, set to resolve or reject after attempting to
   *   save API data.
   */
  function saveAllData(url, records) {
    var data,
        promise,
        promises = [];

    for (var i = 0; i < records.length; i++) {
      data = records[i];
      
      promise = new Promise(function (resolve, reject) {
        saveData(url, data, function (result) {
          resolve(result);
        }, function (reason) {
          reject(reason);
        });
      });

      promises.push(promise);
    }
    
    return Promise.all(promises);
  }

  /**
   * AJAX call our API/cache.
   *
   * @param {string} url
   *   The url used for our API payload.
   * @param {object} data
   *   The data to save in our cache.
   * @param {function(data)} successCallback
   *   A callback function which takes one argument:
   *     data: result set from the API call.
   * @param {function(reason)} failCallback
   *   A callback which takes one argument:
   *     reason: A string describing why data collection failed.
   */
  function saveData(url, data, successCallback, failCallback) {
    $.ajax({
      url: url,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (response) {
        console.log('Saved data for: ' + url);
        successCallback(response);
      },
      error: function (xhr, status, error) {
        failCallback('Save failed for ' + url + '.');
      }
    });
  }

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
    var promise,
        promises = [],
        result = {};

    for (var i = 0; i < results.length; i++) {
      result = results[i];

      if (result.hasOwnProperty('url')) {
        promise = new Promise(function (resolve, reject) {
          getData(result.url, function (data) {
            resolve(data);
          }, function (reason) {
            reject(reason);
          });
        });
        
        promises.push(promise);
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
