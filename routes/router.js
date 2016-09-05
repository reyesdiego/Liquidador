/**
 * Created by diego on 28/04/16.
 */

module.exports = function (app, log, oracle) {
    "use strict";

    let verifyToken = (req, res, next) => {
        var incomingToken = req.headers.token,
            token = require("../include/token.js");

        token.verifyToken(incomingToken, (err, payload) => {
            if (err) {
                res.status(401).send({status: 'ERROR', message: "Token Invalido", data: err});
            } else {
                req.user = payload;
                next();
            }
        });
    };

    var dollar = require("./dollar.js")(log, oracle);
    app.use('/currencies', dollar);

    var pasavante = require("./pasavante.js")(log, oracle);
    app.use('/pasavantes', pasavante);

    var patente = require("./patente.js")(log, oracle);
    app.use('/patentes', patente);

    var payment = require("./payment.js")(log, oracle);
    app.use('/payments', payment);

    app.get('/', (req, res) => {
        res.status(200).send("Liquidador 1.0 - Administración General de Puertos de Buenos Aires - Diego Reyes\n");
    });

};