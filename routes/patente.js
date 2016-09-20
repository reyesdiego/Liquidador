/**
 * Created by diego on 11/08/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();
    var Patente = require('../lib/patente.js');
    var patente = new Patente(oracle);

    let validatePayment = (req, res, next) => {
        req.checkBody(
            {
                id_tipo_embarcacion: {
                    notEmpty: {errorMessage: "id_tipo_embarcacion is required"},
                    isInt: {errorMessage: "id_tipo_embarcacion must be Integer"}
                },
                cliente: {
                    notEmpty: {errorMessage: "cliente is required"},
                    isInt: {errorMessage: "cliente must be Integer"}
                },
                buque_id: {
                    notEmpty: {errorMessage: "buque_id is required"},
                    isInt: {errorMessage: "buque_id must be Integer"}
                },
                seccion: {
                    notEmpty: {errorMessage: "seccion is required"},
                    isInt: {errorMessage: "seccion must be Integer"}
                },
                periodo_id: {
                    notEmpty: {errorMessage: "periodo_id is required"},
                    isInt: {errorMessage: "periodo_id must be Integer"}
                },
                fecha_desde: {
                    notEmpty: {errorMessage: "fecha_desde is required"},
                    isDate: {
                        errorMessage: "fecha_desde must be a valid date"}},
                fecha_hasta: {
                    notEmpty: {errorMessage: "fecha_hasta is required"},
                    isDate: {
                        errorMessage: "fecha_hasta must be a valid date"}}
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

    let validatePatente = (req, res, next) => {
        req.checkBody(
            {
                id_tipo_embarcacion: {
                    notEmpty: {errorMessage: "id_tipo_embarcacion is required"},
                    isInt: {errorMessage: "id_tipo_embarcacion must be Integer"}
                },
                id_tarifa: {
                    notEmpty: {errorMessage: "id_tarifa is required"},
                    isInt: {errorMessage: "id_tarifa must be Integer"}
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
        var paymentBody = req.body;
        var Patente = require('../lib/patente.js');
        var patente = new Patente(oracle);

        patente.getTarifas(paymentBody.id_tipo_embarcacion, paymentBody.fecha_desde)
        .then(data => {

                var Payment = require('../lib/payment.js');
                var payment = new Payment(oracle);

                var rates = data.data;

                var liq_header = {
                    cliente: paymentBody.cliente,
                    seccion: paymentBody.seccion,
                    operacion: 9,
                    documento: 12,
                    buque_id: paymentBody.buque_id,
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
                    id_tarifa: rate.ID_TARIFA,
                    unitario: rate.VALOR_TARIFA,
                    cantidad1: paymentBody.buque_trn,
                    cantidad2: null,
                    cotizacion_fecha: rate.FECHA_TARIFA,
                    cotizacion_tarifa: rate.VALOR_TARIFA
                }));

                liq_header.detail = liq_detail;

                payment.add(liq_header)
                    .then(dataPayment =>{
                        log.logger.info(dataPayment);
                        res.status(200).send(dataPayment);
                    })
                    .catch(err => {
                        var result = {
                            status: 'ERROR',
                            message: err.message,
                            data: err
                        };
                        log.logger.error("Patente INS - %s, %j", result.message, JSON.stringify(paymentBody));
                        res.status(500).send(result);
                    });
        })
        .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    let addPatente = (req, res) => {
        var patenteBody = req.body;
        log.logger.info(patenteBody);

        patente.add(patenteBody)
            .then(data => {
                 res.status(200).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    let disablePatente = (req, res) => {
        var patenteId = req.params.id;

        patente.disable(patenteId)
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    let getAll = (req, res) => {

        patente.getAll()
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    router.post('/liquidacion', validatePayment, addPayment);
    router.post('/patente', validatePatente, addPatente);
    router.put('/patente/disable/:id', disablePatente);
    router.get('/', getAll);

    return router;
};
