const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const { PORT } = require('./config/env');

const authRoutes = require('./routes/auth.routes');
const ticketsRoutes = require('./routes/tickets.routes');
const groupsRoutes = require('./routes/groups.routes');
const permissionsRoutes = require('./routes/permissions.routes');

async function buildServer() {
  await fastify.register(cors, {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  });

  fastify.get('/', async () => {
    return {
      statusCode: 200,
      intOpCode: 'SxGW200',
      data: {
        message: 'API Gateway funcionando'
      }
    };
  });

  await fastify.register(authRoutes);
  await fastify.register(ticketsRoutes);
  await fastify.register(groupsRoutes);
  await fastify.register(permissionsRoutes);

  return fastify;
}

buildServer()
  .then((app) => {
    app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      app.log.info(`API Gateway corriendo en ${address}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });