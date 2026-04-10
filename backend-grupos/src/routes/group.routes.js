const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers
} = require('../controllers/group.controller');

async function groupRoutes(fastify) {
  fastify.get('/groups', getGroups);
  fastify.post('/groups', createGroup);
  fastify.put('/groups/:id', updateGroup);
  fastify.delete('/groups/:id', deleteGroup);
    fastify.get('/groups/:groupId/members', getGroupMembers);
}

module.exports = groupRoutes;