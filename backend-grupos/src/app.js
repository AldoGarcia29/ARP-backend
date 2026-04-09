const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
require('dotenv').config();

const groupRoutes = require('./routes/group.routes');

async function start() {
  await fastify.register(cors, {
    origin: true
  });

  await fastify.register(groupRoutes);

  fastify.get('/', async () => {
    return {
      statusCode: 200,
      intOpCode: 'SxGR200',
      data: [{ message: 'Servicio de grupos funcionando' }]
    };
  });

  await fastify.listen({
    port: process.env.PORT || 3003,
    host: '0.0.0.0'
  });
}

start().catch(err => {
  fastify.log.error(err);
  process.exit(1);
});