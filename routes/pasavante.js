/**
 * Created by diego on 11/08/16.
 */

module.exports = (log, oracle) => {
    'use strict';

    var express = require('express');
    var router = express.Router();

    var Pasavante = require('../lib/pasavante.js');
    var pasavante = new Pasavante(oracle);

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
                buque_trn: {
                    notEmpty: {errorMessage: "buque_trn is required"},
                    isInt: {errorMessage: "buque_trn must be Integer"}
                },
                movimientos: {
                    notEmpty: {errorMessage: "movimientos is required"},
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

    let validateMinRate = (req, res, next) => {
        var pasavanteBody = req.body;

        pasavante.minRateControl(pasavanteBody)
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
        var async = require('async');
        var moment = require('moment');
        var Enumerable = require('linq');
        var task,
            tasks = [];

        var paymentBody = req.body;

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

            if (err) {
                var errMsg = {
                    status: "ERROR",
                    data: err
                };
                log.logger.error(errMsg);
                res.status(500).send(errMsg);
            } else {
                try {

                    data.forEach(item => {
                        item.forEach(rate => {
                            rates.push(rate);
                        });
                    });
                    if (rates.length === 0) {
                        log.logger.error("INS Liqui Pasavante, No se encontraron Tarifas para los datos requeridos: %j ", JSON.stringify(paymentBody));
                        res.status(500).send({
                            status: "ERROR",
                            message: "No se encuentra el Tarifario para el Pasavante requerido."
                        });
                    } else {
                        firstSitio = rates[0].ID_TERMINAL;

                        var liq_header = {
                            cliente: paymentBody.cliente,
                            seccion: firstSitio,
                            operacion: 8,
                            documento: 11,
                            buque_id: paymentBody.buque_id,
                            fecha_desde: paymentBody.fecha_desde,
                            fecha_hasta: paymentBody.fecha_hasta,
                            documento_anio: moment(paymentBody.fecha_desde).year(),
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

                        var liq_detail = rates.map(rate => ({
                            id_tarifa: rate.ID_TARIFA,
                            unitario: rate.VALOR_TARIFA,
                            cantidad1: paymentBody.buque_trn,
                            cantidad2: null
                        }));

                        liq_header.detail = liq_detail;

                        payment.add(liq_header)
                            .then(dataPayment =>{
                                log.logger.info("INS Liqui Pasavante %j", dataPayment);
                                dataPayment.data.TOTAL = total;
                                res.status(200).send(dataPayment);
                            })
                            .catch(err => {
                                log.logger.error("INS Liqui Pasavante %s", err.message);
                                res.status(500).send(err);
                            });
                    }
                }
                catch (e) {
                    var errMsg = {
                        status: "ERROR",
                        message: e.message
                    };
                    log.logger.error(errMsg);
                    res.status(500).send(errMsg);
                }
            }
        });
    };

    let addPasavante = (req, res) => {
        var pasavanteBody = req.body;

        pasavante.add(pasavanteBody)
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    let getAll = (req, res) => {

        pasavante.getAll()
            .then(data => {
                res.status(200).send(data);
            })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    }

    let putPasavante = (req, res) => {
        var pasavanteId = req.params.id;
        var put = req.params.put;
        var params = req.body;
        params.id = pasavanteId;
        var prom;
        var moment = require('moment');

        if (params.fecha_inicio) {
            params.fecha_inicio = moment(params.fecha_inicio, "YYYY-MM-DD").format("YYYY-MM-DD");
        }
        if (params.fecha_fin) {
            params.fecha_fin = moment(params.fecha_fin, "YYYY-MM-DD").format("YYYY-MM-DD");
        }

        if (put==='disable') {
            prom = pasavante.disable(pasavanteId);
        } else if (put==='update') {
            prom = pasavante.update(params);
        }

        prom.then(data => {
            res.status(200).send(data);
        })
            .catch(err => {
                log.logger.error(err);
                res.status(500).send(err);
            });
    };

    router.post('/liquidacion', validatePayment, addPayment);
    router.post('/pasavante', validatePasavante, validateMinRate, addPasavante);
    router.put('/pasavante/:put/:id', validateMinRate, putPasavante);
    router.get('/', getAll);

    return router;
};