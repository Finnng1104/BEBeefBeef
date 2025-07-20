import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import express from 'express';
const swaggerDocument = yaml.load(path.join(__dirname, '../config/swagger.yml'));
export default (app: express.Application) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
