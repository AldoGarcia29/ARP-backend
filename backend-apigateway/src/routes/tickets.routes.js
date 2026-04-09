const { TICKETS_SERVICE_URL } = require('../config/env');

async function ticketsRoutes(fastify) {
  fastify.register(require('@fastify/http-proxy'), {
    upstream: TICKETS_SERVICE_URL,
    prefix: '/tickets',
    rewritePrefix: '/tickets'
  });
}

module.exports = ticketsRoutes;