const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/user.routes');
const groupRoutes = require('./routes/group.routes');
const permissionRoutes = require('./routes/permission.routes');


const app = express();

app.use(cors({
  origin: 'http://localhost:4200'
}));

app.use(express.json());

app.use('/auth', userRoutes);
app.use('/groups', groupRoutes);
app.use('/permissions', permissionRoutes);

module.exports = app;