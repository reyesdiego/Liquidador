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
    getRates (id) {

        var promise = new Promise((resolve, reject) => {
            var strSql;
            var strWhere = '\n';

            if (id !== undefined) {
                strWhere = ` WHERE ID_TARIFA = ${id}`;
            }
            strSql = `SELECT ID_TARIFA,
                    CODIGO_TARIFA,
                    DESCRI_TARIFA,
                    SIMBOLO,
                    CODIGOAFIP
                  FROM TARIFAS T
                    INNER JOIN MONEDAS M ON T.RELA_MONEDA = M.ID_MONEDA
                  ${strWhere}`;

            this.cn.simpleExecute(strSql, [], {outFormat: this.cn.OBJECT, maxRows: 1000})
                .then(data => {
                    var result = {
                        status: 'OK',
                        totalCount: data.rows.length,
                        data: data.rows
                    };
                    resolve(result);
                })
                .catch(err => {
                    var result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return promise;
    }

    getRate (id) {
        var promise = new Promise((resolve, reject) => {

            this.getRates(id)
                .then(data => {
                    if (data.status === 'OK' && data.data.length > 0) {
                        this.getRateValues(id)
                            .then(values => {
                                data.data[0].VALORES = values.data;
                                resolve(data);
                            }).
                            catch(err => {
                                var result = {
                                    status: 'ERROR',
                                    message: err.message,
                                    data: err
                                };
                                reject(result);
                            });
                    } else {
                        resolve(data);
                    }
                })
                .catch(err => {
                    reject(err);
                });
        });
        return promise;
    }

    getRateValues (id) {
        var promise = new Promise((resolve, reject) => {
            var strSql;

            strSql = `SELECT RELA_TARIFA ID_TARIFA,
                    VALOR_TARIFA,
                    FECHA_TARIFA
                  FROM VALORES_TARIFAS T
                  WHERE RELA_TARIFA = :1
                  ORDER BY FECHA_TARIFA DESC`;

            this.cn.simpleExecute(strSql, [id], {outFormat: this.cn.OBJECT})
                .then(data => {
                    var result = {
                        status: 'OK',
                        data: data.rows
                    };
                    resolve(result);
                })
                .catch(err => {
                    var result = {
                        status: 'ERROR',
                        message: err.message,
                        data: err
                    };
                    reject(result);
                });
        });
        return promise;
    }

    getRateByDocument (documentId) {
        var promise = new Promise((resolve, reject) => {
            var strSql;

            strSql = `SELECT ID_TARIFA,
                    CODIGO_TARIFA,
                    DESCRI_TARIFA,
                    SIMBOLO,
                    CODIGOAFIP
                  FROM TARIFAS T
                    INNER JOIN MONEDAS M ON T.RELA_MONEDA = M.ID_MONEDA
                    INNER JOIN DOCUMENTOS_TARIFAS DT ON DT.RELA_TARIFA = T.ID_TARIFA
                  WHERE DT.RELA_DOCUMENTO = :1 AND
                        EXISTS (SELECT * FROM VALORES_TARIFAS VT WHERE VT.RELA_TARIFA = T.ID_TARIFA)`;

            this.cn.simpleExecute(strSql, [documentId], {outFormat: this.cn.OBJECT, maxRows: 1000})
                .then(data => {
                    var result = {
                        status: 'OK',
                        totalCount: data.rows.length,
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
        return "Rate class on Oracle 11b - Diego Reyes";
    }
}

module.exports = Rate;