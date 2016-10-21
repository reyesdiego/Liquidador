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

    let validateMinRate = (req, res, next) => {
        var patenteBody = req.body;

        patente.minRateControl(patenteBody)
            .then( () => {
                next();
            })
            .catch(err => {
                res.status(400).send({
                    status: "ERROR",
                    message: err.message});
            })
    };

    let addPayment = (req, res) => {
        var paymentBody = req.body;
        var Patente = require('../lib/patente.js');
        var patente = new Patente(oracle);
        var Enumerable = require('linq');

        patente.getTarifas(paymentBody.id_tipo_embarcacion, paymentBody.fecha_desde)
        .then(data => {

                var Payment = require('../lib/payment.js');
                var payment = new Payment(oracle);

                var rates = data.data;

                if (rates.length === 0) {
                    log.logger.error("INS Liqui Patente, No se encontraron Tarifas para los datos requeridos: %j ", JSON.stringify(paymentBody));
                    res.status(500).send({
                        status: "ERROR",
                        message: "No se encuentra el Tarifario para la Patente requerida."
                    });
                } else {

                    let liq_header = {
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

                    var total = Enumerable.from(rates)
                            .where(x=>(x.MINIMO===0))
                            .select(x=> (paymentBody.buque_trn * x.VALOR_TARIFA))
                            .sum('x=>x');

                    var minimo = Enumerable.from(rates)
                        .where(x=>(x.MINIMO===1))
                        .toArray();
                    if (minimo.length>0) {
                        minimo = minimo[0];

                        if (minimo.VALOR_TARIFA > total) {
                            minimo.VALOR_TARIFA = minimo.VALOR_TARIFA - total;
                            total += minimo.VALOR_TARIFA;
                        }
                    }

                    let liq_detail = rates.map(rate => {

                        var result = {
                            id_tarifa: rate.ID_TARIFA,
                            unitario: rate.VALOR_TARIFA,
                            cantidad1: paymentBody.buque_trn,
                            cantidad2: null,
                            cotizacion_fecha: rate.FECHA_TARIFA,
                            cotizacion_tarifa: rate.VALOR_TARIFA
                        };
                        return result;
                    });

                    liq_header.detail = liq_detail;

                    payment.add(liq_header)
                        .then(dataPayment => {
                            log.logger.info("INS Liqui Patente %j", dataPayment);
                            dataPayment.data.TOTAL = total;
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
                }
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

    let putPatente = (req, res) => {
        var patenteId = req.params.id;
        var put = req.params.put;
        var params = req.body;
        params.id = patenteId;
        var prom;
        var moment = require('moment');

        if (params.fecha_inicio) {
            params.fecha_inicio = moment(params.fecha_inicio, "YYYY-MM-DD").format("YYYY-MM-DD");
        }
        if (params.fecha_fin) {
            params.fecha_fin = moment(params.fecha_fin, "YYYY-MM-DD").format("YYYY-MM-DD");
        }

        if (put==='disable') {
            prom = patente.disable(patenteId);
        } else if (put==='update') {
            prom = patente.update(params);
        }

        prom.then(data => {
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
    router.post('/patente', validatePatente, validateMinRate, addPatente);
    router.put('/patente/:put/:id', validateMinRate, putPatente);
    router.get('/', getAll);

    return router;
};
