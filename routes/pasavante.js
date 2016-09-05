/**
 * Created by diego on 11/08/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();

    let validatePayment = (req, res, next) => {
        req.checkBody(
            {
                id_tipo_navegacion: {
                    notEmpty: {errorMessage: "id_tipo_navegacion is required"},
                    isInt: {errorMessage: "id_tipo_navegacion must be Integer"}
                },
                cliente: {
                    notEmpty: {errorMessage: "cliente is required"},
                    isInt: {errorMessage: "cliente must be Integer"}
                },
                fecha_desde: {
                    notEmpty: {errorMessage: "fecha_desde is required"},
                    isDate: {
                        errorMessage: "fecha_desde must be a valid date"}},
                fecha_hasta: {
                    notEmpty: {errorMessage: "fecha_hasta is required"},
                    isDate: {
                        errorMessage: "fecha_hasta must be a valid date"}},
                year: {
                    notEmpty: {errorMessage: "year is required"},
                    isInt: {errorMessage: "year must be Integer"}
                },
                movimientos: {
                    isArray: {errorMessage: "movimientos must be an Array"}
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

    let validatePasavante = (req, res, next) => {
        req.checkBody(
            {
                id_tipo_navegacion: {
                    notEmpty: {errorMessage: "id_tipo_navegacion is required"},
                    isInt: {errorMessage: "id_tipo_navegacion must be Integer"}
                },
                id_tarifa: {
                    notEmpty: {errorMessage: "id_tarifa is required"},
                    isInt: {errorMessage: "id_tarifa must be Integer"}
                },
                id_terminal: {
                    notEmpty: {errorMessage: "id_terminal is required"},
                    isInt: {errorMessage: "id_terminal must be Integer"}
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

    let addPayment = (req, res) => {
        var async = require('async');
        var task,
            tasks = [];

        var paymentBody = req.body;
        log.logger.info('%j',paymentBody);
        var Pasavante = require('../lib/pasavante.js');
        var pasavante = new Pasavante(oracle);


        paymentBody.movimientos.forEach(item => {
            task = (callback) => {
                pasavante.getTarifas(paymentBody.id_tipo_navegacion, item.id_sitio, paymentBody.fecha_desde).
                    then(data => {
                        callback(undefined, data.data);
                    })
                    .catch(err => {
                        callback(err);
                    });
            };
            tasks.push(task);
        });

        async.parallel(tasks, (err, data) => {
            var Payment = require('../lib/payment.js');
            var payment = new Payment(oracle);
            var rates = [];
            var firstSitio;

            data.forEach(item => {
                item.forEach(rate => {
                    rates.push(rate);
                });
            });

            firstSitio = rates[0].ID_TERMINAL;

            var liq_header = {
                cliente: paymentBody.cliente,
                seccion: firstSitio,
                operacion: 8,
                documento: 11,
                buque_id: paymentBody.buque_imo,
                fecha_desde: paymentBody.fecha_desde,
                fecha_hasta: paymentBody.fecha_hasta,
                documento_anio: paymentBody.year,
                documento_nro: paymentBody.documento_nro,
                fecha_preliquidacion: paymentBody.fecha_fin,
                erp_nro_liquidacion: null,
                erp_nro_factura: null,
                estado: 9
            };

            var liq_detail = rates.map(rate => ({
                id_tarifa: rate.TARIFA,
                unitario: rate.VALOR_TARIFA,
                cantidad1: paymentBody.buque_trn,
                cantidad2: null
            }));

            liq_header.detail = liq_detail;

            payment.add(liq_header)
                .then(dataPayment =>{
                    res.status(200).send(dataPayment);
                })
                .catch(err => {
                    res.status(500).send(err);
                });
        });
    };

    let addPasavante = (req, res) => {
        var pasavanteBody = req.body;
        log.logger.info(pasavanteBody);
        var Pasavante = require('../lib/pasavante.js');
        var pasavante = new Pasavante(oracle);

        pasavante.add(pasavanteBody)
            .then(data => {
                res.status(500).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    router.post('/liquidacion', validatePayment, addPayment);
    router.post('/pasavante', validatePasavante, addPasavante);

    return router;
};