//Setup Winston Logger
const logConfig = require('config').get('node.logger');
const winston = require('winston');
const Syslog = require('winston-syslog').Syslog;

const logLevel = { level : logConfig.level };

const consoleLog = new winston.transports.Console(logLevel);
const sysLog = new winston.transports.Syslog(logLevel);

module.exports = logger = winston.createLogger({
  transports: [
    consoleLog, //Console Log
    sysLog // Sys Log
  ],
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp(),
    winston.format.prettyPrint(),
    winston.format.simple())
});
