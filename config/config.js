/**
 * Created by diego on 26/04/16.
 */
var config;

if (process.env.NODE_ENV === 'development') {
    config = require('./config_dev.json');
} else {
    config = require('./config_pro.json');
}

module.exports = config;