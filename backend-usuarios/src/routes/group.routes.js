const express = require('express');
const router = express.Router();
const {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember
} = require('../controllers/group.controller');

router.get('/', getGroups);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addGroupMember);
router.delete('/:id/members/:usuarioId', removeGroupMember);

module.exports = router;