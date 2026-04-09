const { GROUPS_SERVICE_URL } = require('../config/env');

async function groupsRoutes(fastify) {
  fastify.register(require('@fastify/http-proxy'), {
    upstream: GROUPS_SERVICE_URL,
    prefix: '/groups',
    rewritePrefix: '/groups'
  });
}

module.exports = groupsRoutes;