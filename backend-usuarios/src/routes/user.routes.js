const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
  getUserFullById,
  updateUserProfile,
  updateUserPermissions,
  deleteUser
} = require('../controllers/user.controller');

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.get('/:id/full', getUserFullById);
router.put('/:id', updateUserProfile);
router.put('/:id/permissions', updateUserPermissions);
router.delete('/:id', deleteUser);



module.exports = router;