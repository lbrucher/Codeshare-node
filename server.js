var App = require('./app.js');

var port = Number(process.env.PORT || process.env.VCAP_APP_PORT || 3000);
var app = App.createServer();

app.listen(port);
console.log("Server listening on port %d in %s mode", app.address().port, app.settings.env);

module.exports = app;
