/**
 * Created by diego on 11/08/16.
 */

module.exports = (log) => {
    'use strict';

    var express = require('express');
    var router = express.Router();

    let addPasavante = (req, res) => {
        var pasavante = req.body;

        res.status(200).send(pasavante);
    };

    router.post('/pasavante', addPasavante);

    return router;
}