/**
 * Created by diego on 22/08/16.
 */


/**
 * Cotización de Monedas
 * @contructor
 * @param {object} DB - Objecto de conexión a Base de Datos
 * */
class Dollar {
    constructor (DB) {
        this.cn = DB;
    }

    getCurrencyTypes () {
        var promise = new Promise((resolve, reject) => {

            var strSql;

            strSql = `SELECT *
                  FROM MONEDAS`;

            this.cn.simpleExecute(strSql, [], {outFormat: this.cn.OBJECT})
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

    /**
     * Obtiene la Cotización de Dolar según fecha solicitada
     * @param {date} date - Fecha de última cotización solicitada
     * */
    getDollars (currency, date) {

        var promise = new Promise((resolve, reject) => {
            var moment = require('moment');
            var fecha = date;

            var strSql;
            var strWhere = '\n';

            if (fecha !== undefined) {
                fecha = moment(fecha, 'YYYY-MM-DD').format('YYYY-MM-DD');
                strWhere = `AND FECHA_VALOR_MONEDA <= TO_DATE('${fecha}', 'YYYY-MM-DD')`;
            }
            strSql = `SELECT
                    RELA_MONEDA ID,
                    FECHA_VALOR_MONEDA FECHA,
                    VALOR_MONEDA VALOR,
                    SIMBOLO, DESCRI,
                    FBAJA, CODIGOAFIP
                  FROM COTIZACIONES_MONEDAS
                        INNER JOIN MONEDAS ON RELA_MONEDA = ID_MONEDA
                  WHERE RELA_MONEDA = :1
                  ${strWhere}
                  ORDER BY FECHA DESC`;

            this.cn.simpleExecute(strSql, [currency], {outFormat: this.cn.OBJECT})
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
    /**
     * Obtiene la Cotización de Dolar según fecha solicitada
     * @param {date} date - Fecha de última cotización solicitada
     * */
    getDollar (currency, date) {

        var promise = new Promise((resolve, reject) => {

            this.getDollars(currency, date).
                then(data => {
                    data.data = data.data[0];
                    resolve(data);
                })
                .catch(err => {
                    reject(err);
                });
        });
        return promise;
    }

    toString() {
        return "Dollar class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Dollar;