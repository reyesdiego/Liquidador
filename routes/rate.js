/**
 * Created by diego on 06/09/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();

    var Rate = require('../lib/rate.js');
    var rate = new Rate(oracle);

    let getAll = (req, res) => {

        rate.getRates()
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                res.status(500).send(err);
            });
    };

    let getByDocument = (req, res) => {
        var documentId = req.params.id;

        rate.getRateByDocument(documentId)
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                res.status(500).send(err);
            });
    };

    let getById = (req, res) => {
        var id = req.params.id;
        rate.getRate(id)
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                res.status(500).send(err);
            });
    };

    router.get('/:id', getById);
    router.get('/', getAll);
    router.get('/document/:id', getByDocument);

    return router;
}
