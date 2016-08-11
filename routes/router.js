/**
 * Created by diego on 28/04/16.
 */

module.exports = function (app, log) {
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

    var pasavante = require("./pasavante.js")(log);
    app.use('/pasavantes', pasavante);

    app.get('/', (req, res) => {
        res.status(200).send("Liquidador 1.0\n");
    });

};