/**
 * Created by diego on 10/08/16.
 */

'use strict';

var config = require("./config/config.js");

var oracle = require('./include/oracledbWrap.js');
var configDB = {
    user          : "GIGA_IIT",
    password      : "GIGA_IIT_",
    connectString : "(DESCRIPTION = " +
    "(ADDRESS = (PROTOCOL = TCP)(HOST = 10.10.0.188)(PORT = 1521)) " +
    "(CONNECT_DATA = " +
    "        (SID = PRODUC11) " +
    ") " +
    ")",
    poolMax: 500,
    poolMin: 2,
    poolIncrement: 5,
    poolTimeout: 4
};

var http = require("http");
var express = require("express");
var expressValidator = require("express-validator");
//var compress = require('compression');
var methodOverride = require('method-override'),
    bodyParser = require('body-parser'),
    responseTime = require("response-time");

var log4n = require('./include/log4node.js'),
    log = new log4n.log(config.log);

var app = express();
var server;
var port = 8099;

//app.use(compress({
//    level : 1
//}));

app.use(bodyParser.json());
app.use(expressValidator({
    customValidators: {
        isArray: function(value) {
            return Array.isArray(value);
        },
        gte: function(param, num) {
            return param >= num;
        }
    }
}));
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
app.disable('x-powered-by');
app.use(responseTime());

server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        log.logger.error('El puerto %s está siendo utilizado por otro proceso. El proceso que intenta iniciar se abortará', port);
        process.exit();
    }
});

oracle.createPool(configDB)
    .then(pool => {
        log.logger.info("Oracle Connected to Database. Versión %s", oracle.oracledb.oracleClientVersion);
        require("./routes/router.js")(app, log, oracle);
        server.listen(port, () => {
            log.logger.info("#%s Nodejs %s Running on %s://localhost:%s", process.pid, process.version, 'http', port);
        });
    })
    .catch(err => {
        log.logger.error(err);
        process.exit(1);
    });

process.on('exit', () => {
    log.logger.error('exiting');
});

process.on('uncaughtException', (err) => {
    log.logger.info("Caught exception: " + err.stack);
});