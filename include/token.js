/**
 * Created by diego on 27/04/16.
 * @module Token
 */

'use strict';

var jwt = require("jsonwebtoken");
var secret = require("../config/secret.js");
var config = require("../config/config.js");

let createToken = (payload, callback) => {
    jwt.sign(payload, secret, {expiresIn: config.token_timeout}, (token) => {
        callback(token);
    });
}
module.exports.createToken = createToken;

/**
 * Verifica token
 *
 * @param {string} token - Token.
 * @param {function} callback - return Function
 */
let verifyToken = (token, callback) => {
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            callback(err);
        } else {
            callback(undefined, decoded);
        }
    });
}
module.exports.verifyToken = verifyToken;