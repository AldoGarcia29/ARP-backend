const express = require('express');
const router = express.Router();
const { getPermissionsCatalog } = require('../controllers/permission.controller');

router.get('/catalog', getPermissionsCatalog);

module.exports = router;