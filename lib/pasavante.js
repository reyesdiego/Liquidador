/**
 * Created by diego on 17/08/16.
 */

/**
 * Pasavante - Liquidador de Pasavante de Embarcaciones
 * @contructor
 * @param {object} DB - Objecto de conexión a Base de Datos
 * */
class Pasavante {
    constructor (DB) {
        this.cn = DB;
    }

    /**
     * Da de alta una configuración de liquidación de Pasavante
     * */
    add (pasavante) {
        var promise = new Promise((resolve, reject) => {
            var result;
            var moment = require('moment');

            var strSql = `INSERT INTO PASAVANTES (
                            ID,
                            ID_TIPO_NAVEGACION,
                            ID_TARIFA,
                            ID_TERMINAL,
                            FECHA_INICIO,
                            FECHA_FIN,
                            MINIMO) VALUES (
                            seq_pasavante.nextval,
                            :id_tipo_navegacion,
                            :id_tarifa,
                            :id_terminal,
                            to_date(:fecha_inicio, 'YYYY-MM-DD'),
                            to_date(:fecha_fin, 'YYYY-MM-DD'),
                            :minimo
                            ) RETURNING ID INTO :outputId`;
            var param = {
                outputId: {type: this.cn.oracledb.NUMBER, dir: this.cn.oracledb.BIND_OUT},
                id_tipo_navegacion: pasavante.id_tipo_navegacion,
                id_tarifa: pasavante.id_tarifa,
                id_terminal: pasavante.id_terminal,
                minimo: (pasavante.minimo === undefined) ? 0 : pasavante.minimo,
                fecha_inicio: (pasavante.fecha_inicio === undefined) ? null : moment(pasavante.fecha_inicio).format("YYYY-MM-DD"),
                fecha_fin: (pasavante.fecha_fin === undefined) ? null : moment(pasavante.fecha_fin).format("YYYY-MM-DD")
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

    minRateControl (pasavante) {
        var result;
        var promise = new Promise((resolve, reject) => {
            if (pasavante.minimo){
                var strSql = `SELECT COUNT(*) AS TARIFAS_MINIMO FROM PASAVANTES
                            WHERE
                                ID_TIPO_NAVEGACION = :id_tipo_navegacion AND
                                ID_TERMINAL = :id_terminal AND
                                ID_TARIFA <> :id_tarifa AND
                                MINIMO > 0 AND
                                (FECHA_FIN IS NULL OR FECHA_FIN > CURRENT_DATE)`;

                var param = {
                    id_tipo_navegacion: pasavante.id_tipo_navegacion,
                    id_terminal: pasavante.id_terminal,
                    id_tarifa: pasavante.id_tarifa
                };
                this.cn.simpleExecute(strSql, param, {outFormat: this.cn.oracledb.OBJECT})
                    .then(data => {
                        if (data.rows[0].TARIFAS_MINIMO > 0){
                            result = {
                                status: 'ERROR',
                                message: 'El pasavante seleccionado ya posee una tarifa de mínimo.'
                            };
                            reject(result);
                        } else {
                            resolve();
                        }
                    })
                    .catch(err => {
                        result = {
                            status: 'ERROR',
                            message: err.message,
                            data: err
                        };
                        reject(result);
                    });
            } else {
                resolve();
            }
        });
        return promise;
    }

    disable (id) {
        var promise = new Promise((resolve, reject) => {
            var result;
            var strSql = `UPDATE PASAVANTES
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
                            FROM V_PASAVANTE_TARIFAS V
                              INNER JOIN TARIFAS T ON V.ID_TARIFA = T.ID_TARIFA
                            ORDER BY V.ID_TIPO_NAVEGACION, ID_TERMINAL`;
            this.cn.simpleExecute(strSql)
                .then(data => {
                    var res = Enumerable.from(data.rows)
                        .groupBy('$.ID_TIPO_NAVEGACION', item => {return item;}, (embarque, terminales) => {

                            var tar = Enumerable.from(terminales.getSource())
                            .groupBy('$.ID_TERMINAL', itemTer => {return itemTer;}, (terminal, tarifas) => {
                                    return {
                                        ID_TERMINAL: terminal,
                                        TARIFAS: tarifas.getSource().map(item => ({
                                            ID: item.ID,
                                            ID_TARIFA: item.ID_TARIFA,
                                            DESCRIPCION: item.DESCRI_TARIFA,
                                            FECHA_INICIO: item.FECHA_INICIO,
                                            FECHA_FIN: item.FECHA_FIN,
                                            VALOR: item.VALOR_TARIFA,
                                            FECHA_TARIFA: item.FECHA_TARIFA,
                                            MINIMO: item.MINIMO
                                        }))
                                    };
                                }).toArray();

                            return {
                                ID_TIPO_NAVEGACION: embarque,
                                TERMINALES: tar
                            };
                        }).toArray();
                    result = {
                        status: 'OK',
                        totalCount: data.rows.length,
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
     * @param {integer} id_tipo_navegacion - Código del tipo de Navegación del Pasavante
     * */
    getTarifas (id_tipo_navegacion, id_sitio, fecha) {
        var moment = require('moment');
        var promise = new Promise((resolve, reject) => {
            var strSql,
                result;

            fecha = moment(fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');

            strSql = `SELECT ID_TARIFA, ID_TERMINAL, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP, MINIMO, SUM(VALOR_TARIFA) VALOR_TARIFA
                    FROM V_PASAVANTE_TARIFAS
                         INNER JOIN MONEDAS ON RELA_MONEDA = ID_MONEDA
                    WHERE FECHA_TARIFA <= TO_DATE(:1, 'YYYY-MM-DD') AND
                          ID_TIPO_NAVEGACION = :2 AND
                          ID_TERMINAL = :3 AND
                          (FECHA_INICIO IS NULL OR FECHA_INICIO <= TO_DATE(:1, 'YYYY-MM-DD') ) AND
                          (FECHA_FIN IS NULL OR FECHA_FIN >= TO_DATE(:1, 'YYYY-MM-DD') )
                    GROUP BY ID_TARIFA, ID_TERMINAL, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP, MINIMO`;

            this.cn.simpleExecute(strSql, [fecha, id_tipo_navegacion, id_sitio], {outFormat: this.cn.OBJECT})
                .then(data => {
                    result = {
                        status: 'OK',
                        data: data.rows
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

    update (params) {
        var promise = new Promise((resolve, reject) => {
            var result;
            var strSql;
            var setUpdate = '';

            if (params.fecha_inicio) {
                setUpdate += ` FECHA_INICIO = to_date('${params.fecha_inicio}', 'YYYY-MM-DD HH24:MI:SS'),`;
            }
            if (params.fecha_fin) {
                setUpdate += ` FECHA_FIN = to_date('${params.fecha_fin}', 'YYYY-MM-DD HH24:MI:SS'),`;
            } else {
                setUpdate += ` FECHA_FIN = null,`;
            }

            if (params.minimo){
                setUpdate += ` MINIMO = ${params.minimo},`;
            }

            setUpdate = ' SET ' + setUpdate.substr(0, setUpdate.length - 1);
            strSql = `UPDATE PASAVANTES ${setUpdate}  WHERE ID = :1`;

            this.cn.simpleExecute(strSql, [params.id], {autoCommit: true})
                .then(data => {
                    result = {
                        status: 'OK',
                        data: {id: parseInt(params.id)}
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

    toString() {
        return "Pasavante class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Pasavante;