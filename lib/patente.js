/**
 * Created by diego on 23/08/16.
 */

/**
 * Patente - Liquidador de Patentes de Embarcaciones
 * @contructor
 * @param {object} DB - Objecto de conexión a Base de Datos
 * */
class Patente {
    constructor (DB) {
        this.cn = DB;
    }

    /**
     * Da de alta una configuración de liquidación de Patente
     * */
    add (patente) {
        var promise = new Promise((resolve, reject) => {
            var result;
            var moment = require('moment');

            var strSql = `INSERT INTO PATENTES (
                            ID,
                            ID_TIPO_EMBARCACION,
                            ID_TARIFA,
                            FECHA_INICIO,
                            FECHA_FIN) VALUES (
                            seq_patente.nextval,
                            :id_tipo_embarcacion,
                            :id_tarifa,
                            to_date(:fecha_inicio, 'YYYY-MM-DD HH24:MI:SS'),
                            to_date(:fecha_fin, 'YYYY-MM-DD HH24:MI:SS')
                            ) RETURNING ID INTO :outputId`;
            var param = {
                outputId: {type: this.cn.oracledb.NUMBER, dir: this.cn.oracledb.BIND_OUT},
                id_tipo_embarcacion: patente.id_tipo_embarcacion,
                id_tarifa: patente.id_tarifa,
                fecha_inicio: (patente.fecha_inicio === undefined) ? null : moment(patente.fecha_inicio).format("YYYY-MM-DD"),
                fecha_fin: (patente.fecha_fin === undefined) ? null : moment(patente.fecha_fin).format("YYYY-MM-DD")
            };
            this.cn.simpleExecute(strSql, param, {autoCommit: true})
            .then(data => {
                    result = {
                        status: 'OK',
                        data: {ID: data.outBinds.outputId[0]}
                    };
                    resolve(result);
                })
            .catch(err => {
                    result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return promise;
    }

    disable (id) {
        var promise = new Promise((resolve, reject) => {
            var result;
            var strSql = `UPDATE PATENTES
                            SET FECHA_FIN = SYSDATE
                            WHERE ID = :1`;

            this.cn.simpleExecute(strSql, [id], {autoCommit: true})
                .then(data => {
                    result = {
                        status: 'OK',
                        data: {id: id}
                    };
                    resolve(result);
                })
                .catch(err => {
                    result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return promise;
    }

    getAll () {
        var promise = new Promise((resolve, reject) => {
            var Enumerable = require('linq');
            var result;
            var strSql = `SELECT V.*, DESCRI_TARIFA
                            FROM V_PATENTE_TARIFAS V
                              INNER JOIN TARIFAS T ON V.ID_TARIFA = T.ID_TARIFA
                            ORDER BY V.ID_TIPO_EMBARCACION`;
            this.cn.simpleExecute(strSql, [], {outFormat: this.cn.oracledb.OBJECT})
                .then(data => {
                    var res = Enumerable.from(data.rows)
                        .groupBy('$.ID_TIPO_EMBARCACION', item => {return item;}, (embarque, terminales) => {
                            return {
                                ID_TIPO_EMBARCACION: embarque,
                                TARIFAS: terminales.getSource().map(item => ({
                                    ID: item.ID,
                                    ID_TARIFA: item.ID_TARIFA,
                                    DESCRIPCION: item.DESCRI_TARIFA,
                                    FECHA_INICIO: item.FECHA_INICIO,
                                    FECHA_FIN: item.FECHA_FIN,
                                    VALOR: item.VALOR_TARIFA,
                                    FECHA_TARIFA: item.FECHA_TARIFA
                                }))
                            };
                        }).toArray();
                    result = {
                        status: 'OK',
                        data: res
                    };
                    resolve(result);
                })
                .catch(err => {
                    result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return promise;
    }

    /**
     * Obtiene las tarifas de una Patente por tipo de Embarque
     * */
    getTarifas (id_tipo_embarcacion, fecha) {
        var promise = new Promise((resolve, reject) => {
            var strSql;

            strSql = `SELECT ID_TARIFA, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP, SUM(VALOR_TARIFA) VALOR_TARIFA
                    FROM V_PATENTE_TARIFAS
                         INNER JOIN MONEDAS ON RELA_MONEDA = ID_MONEDA
                    WHERE FECHA_TARIFA <= TO_DATE(:1, 'YYYY-MM-DD') AND
                          ID_TIPO_EMBARCACION = :2 AND
                          (FECHA_INICIO IS NULL OR FECHA_INICIO <= TO_DATE(:1, 'YYYY-MM-DD') ) AND
                          (FECHA_FIN IS NULL OR FECHA_FIN >= TO_DATE(:1, 'YYYY-MM-DD') )
                    GROUP BY ID_TARIFA, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP`;

            this.cn.simpleExecute(strSql, [fecha, id_tipo_embarcacion], {outFormat: this.cn.OBJECT})
                .then(data => {
                    var result = {
                        status: 'OK',
                        data: data.rows
                    };
                    resolve(result);
                })
                .catch(err => {
                    reject(err);
                });
        });
        return promise;
    }

    toString() {
        return "Patentes class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Patente;