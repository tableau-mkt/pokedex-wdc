var express = require('express'),
    port = process.env.PORT || 3000,
    app = express();

app.use(express.static(__dirname + '/index.html'));

app.listen(port, function () {
  console.log("Pokedex Web Data Connector is running on port " + port);
});
