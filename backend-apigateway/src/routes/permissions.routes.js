const { USERS_SERVICE_URL } = require('../config/env');

async function permissionsRoutes(fastify) {
  fastify.register(require('@fastify/http-proxy'), {
    upstream: USERS_SERVICE_URL,
    prefix: '/permissions',
    rewritePrefix: '/permissions'
  });
}

module.exports = permissionsRoutes;