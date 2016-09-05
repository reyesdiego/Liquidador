/**
 * Created by diego on 24/08/16.
 */

class Payment {
    //var Promise = require('es6-promise');
    constructor (oracle) {
        this.cn = oracle;
    }

    add (liquidacion) {
        var async = require('async');
        var moment = require('moment');

        var promise = new Promise((resolve, reject) => {

            var strSql = `INSERT INTO LIQUIDACIONES_CAB (
                            ID,
                            CLIENTE,
                            SECCION,
                            OPERACION,
                            DOCUMENTO,
                            BUQUE_ID,
                            FECHA_DESDE,
                            FECHA_HASTA,
                            DOCUMENTO_ANIO,
                            DOCUMENTO_NRO,
                            FECHA_PRELIQUIDACION,
                            ERP_NRO_LIQUIDACION,
                            ERP_NRO_FACTURA,
                            ESTADO)
                          VALUES (
                            seq_liquidacion.nextval,
                            :cliente,
                            :seccion,
                            :operacion,
                            :documento,
                            :buque_id,
                            to_date(:fecha_desde, 'YYYY-MM-DD HH24:MI:SS'),
                            to_date(:fecha_hasta, 'YYYY-MM-DD HH24:MI:SS'),
                            :documento_anio,
                            :documento_nro,
                            to_date(:fecha_preliquidacion, 'YYYY-MM-DD'),
                            :erp_nro_liquidacion,
                            :erp_nro_factura,
                            :estado ) RETURNING ID INTO :outputId`;

            var param = {
                outputId: {type: this.cn.oracledb.NUMBER, dir: this.cn.oracledb.BIND_OUT},
                cliente: liquidacion.cliente,
                seccion: liquidacion.seccion,
                operacion: liquidacion.operacion,
                documento: liquidacion.documento,
                buque_id: liquidacion.buque_id,
                fecha_desde: moment(liquidacion.fecha_desde).format("YYYY-MM-DD HH:mm:ss"),
                fecha_hasta: moment(liquidacion.fecha_hasta).format("YYYY-MM-DD HH:mm:ss"),
                documento_anio: liquidacion.documento_anio,
                documento_nro: 1,
                fecha_preliquidacion: moment(liquidacion.fecha_desde).format("YYYY-MM-DD"),
                erp_nro_liquidacion: null,
                erp_nro_factura: null,
                estado: 9
            };
            this.cn.getConnection()
            .then(connection => {
                    var task;
                    var details = liquidacion.detail;

                    this.cn.execute(strSql, param, {}, connection)
                        .then(data_cab => {
                            var newId = data_cab.outBinds.outputId[0];
                            task = (item, callback) => {
                                strSql = `INSERT INTO LIQUIDACIONES_DET (
                                            ID_CAB,
                                            ID,
                                            TARIFA,
                                            CANTIDAD1,
                                            CANTIDAD2,
                                            UNITARIO,
                                            COTIZACION_FECHA,
                                            COTIZACION_VALOR)
                                          VALUES (
                                            :id_cab,
                                            :id,
                                            :tarifa,
                                            :cantidad1,
                                            :cantidad2,
                                            :unitario,
                                            to_date(:cotizacion_fecha, 'YYYY-MM-DD'),
                                            :cotizacion_valor)`;

                                param = {
                                    id_cab: newId,
                                    id: 1,
                                    tarifa: item.tarifa,
                                    unitario: item.unitario,
                                    cantidad1: item.cantidad1,
                                    cantidad2: item.cantidad2,
                                    cotizacion_fecha: item.cotizacion_fecha,
                                    cotizacion_valor: item.cotizacion_valor
                                };
                                this.cn.execute(strSql, param, {}, connection)
                                    .then(data_det => {
                                        callback(undefined, data_det);
                                    })
                                    .catch(err => {
                                        let result = {
                                            status: 'ERROR',
                                            message: err.message,
                                            data: err};
                                        callback(result);

                                    });
                            };
                            async.eachSeries(details, task, (err, asyncData) => {
                                connection.commit((errCommit) => {
                                    if (errCommit) {
                                        let result = {
                                            status: 'ERROR',
                                            message: err.message,
                                            data: err.stack};
                                        reject(result);
                                    } else {
                                        this.cn.releaseConnection(connection);
                                        this.getById(newId)
                                        .then(payment => {
                                                let result = {
                                                    status: 'OK',
                                                    data: payment};
                                                resolve(result);
                                            });
                                    }
                                });
                            });
                        })
                        .catch(err => {
                            let result = {
                                status: 'ERROR',
                                message: err.message,
                                data: err};
                            reject(result);
                        });
                })
            .catch(err => {
                    let result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err.stack};
                    reject(result);
                });
        });
        return promise;
    }

    configm (id) {
        var promise = new Promise((resolve, reject) => {
            var strSql = `UPDATE LIQUIDACIONES_CAB
                            SET ESTADO = 0
                            WHERE ID = :1`;
            this.cn.simpleExecute(strSql, [id], {autoCommit: true})
            .then(data => {
                    resolve({
                        status: 'OK',
                        data: {
                            ID: id,
                            ESTADO: 0
                        }});
                })
            .catch(err => {
                    reject({
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    });
                });
        });
        return promise;
    }

    cancel (id) {
        var promise = new Promise((resolve, reject) => {
            var strSql = `UPDATE LIQUIDACIONES_CAB
                            SET ESTADO = 9
                            WHERE ID = :1`;
            this.cn.simpleExecute(strSql, [id], {autoCommit: true})
                .then(data => {
                    resolve({
                        status: 'OK',
                        data: {
                            ID: id,
                            ESTADO: 9
                        }});
                })
                .catch(err => {
                    reject({
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    });
                });
        });
        return promise;
    }

    getById (id) {
        var promise = new Promise((resolve, reject) => {
            var result = {};
            var strSql = `SELECT *
                            FROM LIQUIDACIONES_CAB C
                                INNER JOIN LIQUIDACIONES_DET D ON C.ID = D.ID_CAB
                            WHERE C.ID = :1`;
            this.cn.simpleExecute(strSql, [id], {outFormat: this.cn.oracledb.OBJECT})
                .then(data => {
                    let header = null;
                    let dataRow = data.rows[0];
                    if (data.rows.length > 0) {
                        header = {
                            ID: dataRow.ID,
                            CLIENTE: dataRow.CLIENTE,
                            SECCION: dataRow.SECCION,
                            OPERACION: dataRow.OPERACION,
                            DOCUMENTO: dataRow.DOCUMENTO,
                            BUQUE_IMO: dataRow.BUQUE_IMO,
                            FECHA_DESDE: dataRow.FECHA_DESDE,
                            FECHA_HASTA: dataRow.FECHA_HASTA,
                            DOCUMENTO_ANIO: dataRow.DOCUMENTO_ANIO,
                            DOCUMENTO_NRO: dataRow.DOCUMENTO_NRO,
                            FECHA_PRELIQUIDACION: dataRow.FECHA_PRELIQUIDACION,
                            ERP_NRO_LIQUIDACION: dataRow.ERP_NRO_LIQUIDACION,
                            ERP_NRO_FACTURA: dataRow.ERP_NRO_FACTURA,
                            ESTADO: dataRow.ESTADO,
                            DETAILS: []
                        };
                        header.DETAILS = data.rows.map(item => ({
                            TARIFA: item.TARIFA,
                            CANTIDAD1: item.CANTIDAD1,
                            CANTIDAD2: item.CANTIDAD2,
                            UNITARIO: item.UNITARIO,
                            COTIZACION_FECHA: item.COTIZACION_FECHA,
                            COTIZACION_VALOR: item.COTIZACION_VALOR
                        }));
                    }

                    result = {
                        status: 'OK',
                        data: header
                    };
                    resolve(result);
                })
                .catch(err=>{
                    result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return  promise;
    }

}

module.exports = Payment;
