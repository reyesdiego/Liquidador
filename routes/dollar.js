/**
 * Created by diego on 22/08/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();

    let getCurrencyTypes = (req, res) => {
        var Dollar = require('../lib/currency.js');
        var dollar = new Dollar(oracle);

        dollar.getCurrencyTypes()
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                res.status(500).send(err);
            });
    };

    let getDollar = (req, res) => {

        var currency = req.params.currency;
        var fecha = req.query.fecha;

        var Dollar = require('../lib/currency.js');
        Dollar = new Dollar(oracle);

        var prom;
        if (req.route.path.includes('/all')) {
            prom = Dollar.getDollars(currency, fecha);
        } else {
            prom = Dollar.getDollar(currency, fecha);
        }

        prom.then(data => {
                res.status(200).send(data);
            })
        .catch(err => {
                res.status(500).send(err);
            });

    };

    router.get('/types', getCurrencyTypes);
    router.get('/all/:currency', getDollar);
    router.get('/:currency', getDollar);

    return router;
}
