/**
 * Created by diego on 25/08/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();
    var Payment = require('../lib/payment.js');
    var payment = new Payment(oracle);

    let getPayment =  (req, res) => {
        var ID = req.params.ID;
        payment.getById(ID)
        .then(data => {
                res.status(200).send(data);
            })
        .catch(err => {
                res.status(500).send(err);
            });
    };

    let putPaymentConfirm_validate = (req, res, next) => {

        req.checkBody({
            ID: {
                notEmpty: {errorMessage: 'ID is required'},
                isInt: {errorMessage: 'ID must be integer'}
            }
        });

        var errors = req.validationErrors();
        if (errors) {
            res.status(400).send({
                status: "ERROR",
                message: "Error en validación de datos de entrada",
                data: errors});
        } else {
            next();
        }
    };

    let putPaymentConfirmOrCancel = (req, res) => {
        var body = req.body;
        var prom;

        if (req.route.path.includes('paymentConfirm')) {
            prom = payment.configm(body.ID);
        } else {
            prom = payment.cancel(body.ID);
        }
        prom.then(data => {
                res.status(200).send(data);
            })
        .catch(err => {
                res.status(500).send(err);
            });

    };

    router.get('/payment/:ID', getPayment);
    router.put('/paymentConfirm', putPaymentConfirm_validate, putPaymentConfirmOrCancel);
    router.put('/paymentCancel', putPaymentConfirm_validate, putPaymentConfirmOrCancel);

    return router;
};