var express = require('express'),
    Cache = require('./modules/cache.js'),
    bodyParser = require("body-parser");

var uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pokedex',
    port = process.env.PORT || 3000,
    app = express(),
    pokemonCache = new Cache(uri);

// Serve files as if this were a static file server.
app.use(express.static('./src/public'));

// JSON parsing.
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Proxy the index.html file.
app.get('/', function (req, res) {
  res.sendFile('index.html');
});

// API endpoint to retrieve our settings.
app.get('/cache/settings', function (req, res) {
  pokemonCache.getSettings(
    function (settings) {
      res.send(settings);
    },
    function (err) {
      handleError(res, err.message, "Failed to get settings");
    }
  );
});

// API endpoint to update our settings.
app.put('/cache/settings/:id', function (req, res) {
  var id = req.params.id,
      settings = req.body;
  
  pokemonCache.updateSettings(id, settings,
    function (result) {
      res.send(result);
    },
    function (err) {
      handleError(res, err.message, "Failed to update value for settings");
    }
  );
});

// API endpoint to get data from the cache tables.
app.get('/cache/data/:collection', function (req, res) {
  var collection = req.params.collection;

  pokemonCache.getData(collection,
    function (data) {
      

      res.send(data);
    },
    function (err) {
      handleError(res, err.message, "Failed to get data from " + collection);
    }
  );
});

// API endpoint to update our cache tables.
app.put('/cache/data/:collection', function (req, res) {
  var collection = req.params.collection,
      data = req.body;
  
  if (data.hasOwnProperty('id')) {
    pokemonCache.updateData(collection, data.id, data,
      function (result) {
        res.send(result);
      },
      function (err) {
        handleError(res, err.message, "Failed to get data from " + collection);
      }
    );
  }
});

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
  res.status(code || 500).json({"error": message});
}

app.listen(port, function () {
  console.log("Pokedex Web Data Connector is running on port " + port);
});
