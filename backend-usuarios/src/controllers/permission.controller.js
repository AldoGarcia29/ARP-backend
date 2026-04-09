const pool = require('../db/db');

const getPermissionsCatalog = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT id, codigo, descripcion, scope
      FROM permisos
      ORDER BY scope, codigo
      `
    );

    const globalPermissions = result.rows.filter(p => p.scope === 'global');
    const groupPermissions = result.rows.filter(p => p.scope === 'group');

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: {
        globalPermissions,
        groupPermissions
      },
      message: 'Catálogo de permisos obtenido correctamente.'
    });
  } catch (error) {
    console.error('Error en getPermissionsCatalog:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

module.exports = {
  getPermissionsCatalog
};