const { USERS_SERVICE_URL } = require('../config/env');

async function authRoutes(fastify) {
  fastify.register(require('@fastify/http-proxy'), {
    upstream: USERS_SERVICE_URL,
    prefix: '/auth',
    rewritePrefix: '/auth'
  });
}

module.exports = authRoutes;