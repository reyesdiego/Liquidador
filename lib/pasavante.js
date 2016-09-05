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
            var strSql = `INSERT INTO PASAVANTES (
                            ID,
                            ID_TIPO_NAVEGACION,
                            ID_TARIFA,
                            ID_TERMINAL) VALUES (
                            seq_pasavante.nextval,
                            :id_tipo_navegacion,
                            :id_tarifa,
                            :id_terminal
                            ) RETURNING ID INTO :outputId`;
            var param = {
                outputId: {type: this.cn.oracledb.NUMBER, dir: this.cn.oracledb.BIND_OUT},
                id_tipo_embarcacion: pasavante.id_tipo_navegacion,
                id_tarifa: pasavante.id_tarifa,
                id_terminal: pasavante.id_terminal
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

            strSql = `SELECT ID_TARIFA, ID_TERMINAL, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP, SUM(VALOR_TARIFA) VALOR_TARIFA
                    FROM V_PASAVANTE_TARIFAS
                         INNER JOIN MONEDAS ON RELA_MONEDA = ID_MONEDA
                    WHERE FECHA_TARIFA <= TO_DATE(:1, 'YYYY-MM-DD') AND
                          ID_TIPO_NAVEGACION = :2 AND
                          ID_TERMINAL = :3
                    GROUP BY ID_TARIFA, ID_TERMINAL, CODIGO_TARIFA, RELA_MONEDA, CODIGOAFIP`;

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

    toString() {
        return "Pasavante class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Pasavante;