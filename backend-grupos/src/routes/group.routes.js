const { getGroups, createGroup } = require('../controllers/group.controller');

async function groupRoutes(fastify) {
  fastify.get('/groups', getGroups);
  fastify.post('/groups', createGroup);
}

module.exports = groupRoutes;