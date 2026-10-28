// Entry point for sequelize-cli (see .sequelizerc). sequelize-cli loads its
// config with import(); on Node 22.12+ that runs an ES-syntax .js file as
// native ESM, skipping Babel (no `~` alias, no extensionless imports). A
// .cjs file is always CommonJS, so this require goes through babel-node.
module.exports = require('./database.config')
