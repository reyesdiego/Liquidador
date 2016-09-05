/**
 * Created by diego on 22/08/16.
 */


/**
 * Tarifario
 * @contructor
 * @param {object} DB - Objecto de conexión a Base de Datos
 * */
class Rate {
    constructor (DB) {
        this.cn = DB;
    }

    /**
     * Obtiene el listado de Tarifas
     * */
    getRates (rate) {

        var promise = new Promise((resolve, reject) => {
            var strSql;
            var strWhere = '\n';

            if (rate !== undefined) {
                strWhere = ` WHERE ID_TARIFA = ${rate}`;
            }
            strSql = `SELECT *
                  FROM TARIFAS
                  ${strWhere}`;

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

    getRate (rate) {
        var promise = new Promise((resolve, reject) => {

            this.getRates(rate)
                .then(data => {
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
        return "Rate class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Rate;