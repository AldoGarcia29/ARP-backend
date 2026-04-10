module.exports = async function (fastify, opts) {
  const {
    createTicket,
    getTicketsByGroup,
    getTicketById,
    updateTicket,
    deleteTicket,
    changeTicketStatus,
    assignTicket,
    getTicketHistory,
    getAllTickets    
  } = require('../controllers/ticket.controller');

  fastify.post('/tickets', {
    preHandler: [fastify.authenticate]
  }, createTicket);

  fastify.get('/tickets/group/:grupoId', {
    preHandler: [fastify.authenticate]
  }, getTicketsByGroup);

  fastify.get('/tickets/:id', {
    preHandler: [fastify.authenticate]
  }, getTicketById);

  fastify.put('/tickets/:id', {
    preHandler: [fastify.authenticate]
  }, updateTicket);

  fastify.delete('/tickets/:id', {
    preHandler: [fastify.authenticate]
  }, deleteTicket);

  fastify.patch('/tickets/:id/status', {
    preHandler: [fastify.authenticate]
  }, changeTicketStatus);

  fastify.patch('/tickets/:id/assign', {
    preHandler: [fastify.authenticate]
  }, assignTicket);

  fastify.get('/tickets/:id/history', {
  preHandler: [fastify.authenticate]
}, getTicketHistory);

fastify.get('/tickets', {
  preHandler: [fastify.authenticate]
}, getAllTickets);
};