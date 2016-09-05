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
            var strSql = `INSERT INTO PATENTES (
                            ID,
                            ID_TIPO_EMBARCACION,
                            ID_TARIFA) VALUES (
                            seq_patente.nextval,
                            :id_tipo_embarcacion,
                            :id_tarifa
                            ) RETURNING ID INTO :outputId`;
            var param = {
                outputId: {type: this.cn.oracledb.NUMBER, dir: this.cn.oracledb.BIND_OUT},
                id_tipo_embarcacion: patente.id_tipo_embarcacion,
                id_tarifa: patente.id_tarifa
            };
            this.cn.simpleExecute(strSql, param, {autoCommit: true})
            .then(data => {
                    result = {
                        status: 'OK',
                        data: {id: data.outBinds.outputId[0]}
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
            var strSql = `SELECT *
                            FROM PATENTES
                            ORDER BY ID_TIPO_EMBARCACION`;
            this.cn.simpleExecute(strSql, [], {outFormat: this.cn.oracledb.OBJECT})
            .then(data => {
                    var res = Enumerable.from(data.rows)
                    .groupBy('$.ID_TIPO_EMBARCACION',(item)=>{return item;}, (embarque, tarifas) => {
                            return {
                                ID_TIPO_EMBARCACION: embarque,
                                TARIFAS: tarifas.getSource().map(item => ({ID_TARIFA: item.ID_TARIFA, ID: item.ID, VALOR: 0}))
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
                          ID_TIPO_EMBARCACION = :2
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