const pool = require('../db/db');

const getGroups = async (request, reply) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, descripcion, creado_en
      FROM grupos
      ORDER BY creado_en DESC
    `);

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGR200',
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: 'Error al obtener grupos'
    });
  }
};

const createGroup = async (request, reply) => {
  try {
    const { nombre, descripcion, creado_por } = request.body;

    const result = await pool.query(
      `
      INSERT INTO grupos (nombre, descripcion, creado_por)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [nombre, descripcion, creado_por]
    );

    return reply.status(201).send({
      statusCode: 201,
      intOpCode: 'SxGR201',
      data: result.rows
    });
  } catch (error) {
    console.error(error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: 'Error al crear grupo'
    });
  }
};

module.exports = {
  getGroups,
  createGroup
};