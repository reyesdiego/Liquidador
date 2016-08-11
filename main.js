/**
 * Created by diego on 10/08/16.
 */

'use strict';

var config = require("./config/config.js");

var http = require("http");
var express = require("express");
var compress = require('compression');
var methodOverride = require('method-override'),
    bodyParser = require('body-parser');

var log4n = require('./include/log4node.js'),
    log = new log4n.log(config.log);

var app = express();
var server;
var port = 8099;

app.use(compress({
    level : 8
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(multer());
app.use(methodOverride());
app.all('/*', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", 'X-Requested-With, Content-Type, token');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Request-Headers', 'Content-Type, token');
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');

    if ('OPTIONS' === req.method) {
        res.status(200).send();
    } else {
        next();
    }
});

server = http.createServer(app);

app.disable('x-powered-by');

require("./routes/router.js")(app, log);

server.listen(port, () => {
    log.logger.info("#%s Nodejs %s Running on %s://localhost:%s", process.pid, process.version, 'http', port);
    //console.log("#%s Nodejs %s Running on %s://localhost:%s", process.pid, process.version, 'http', port)
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
    log.logger.error('El puerto %s está siendo utilizado por otro proceso. El proceso que intenta iniciar se abortará', port);
    process.exit();
}
});

process.on('exit', () => {
    log.logger.error('exiting');
});

process.on('uncaughtException', (err) => {
    log.logger.info("Caught exception: " + err);
});