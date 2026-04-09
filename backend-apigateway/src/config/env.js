require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  USERS_SERVICE_URL: process.env.USERS_SERVICE_URL,
  TICKETS_SERVICE_URL: process.env.TICKETS_SERVICE_URL,
  GROUPS_SERVICE_URL: process.env.GROUPS_SERVICE_URL
};