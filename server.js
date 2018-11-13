// load environment properties from a .env file for local development
require('dotenv').load({ silent: true });

const config = require('config');
const expressConfig = config.get('node.express')
const logger = require('./src/logger')

const app = require('./app.js');

const port = expressConfig.PORT || 3000;
app.listen(port, () => {
  logger.info(`express listening on port ${port}`);
});
