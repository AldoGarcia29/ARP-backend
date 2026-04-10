const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
  addGroupMember,
  removeGroupMember
} = require('../controllers/group.controller');

async function groupRoutes(fastify) {
  fastify.get('/groups', getGroups);
  fastify.post('/groups', createGroup);
  fastify.put('/groups/:id', updateGroup);
  fastify.delete('/groups/:id', deleteGroup);
  fastify.get('/groups/:groupId/members', getGroupMembers);
  fastify.post('/groups/:groupId/members', addGroupMember);
  fastify.delete('/groups/:groupId/members/:usuarioId', removeGroupMember);
}

module.exports = groupRoutes;