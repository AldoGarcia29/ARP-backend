const pool = require('../db/db');

const getGroups = async (request, reply) => {
  try {
    const result = await pool.query(`
      SELECT
        g.id,
        g.nivel,
        g.creador_id,
        g.nombre,
        g.descripcion,
        g.creado_en,
        u.nombre_completo AS autor,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', mu.id,
              'username', mu.username,
              'email', mu.email,
              'nombre_completo', mu.nombre_completo
            )
          ) FILTER (WHERE mu.id IS NOT NULL),
          '[]'
        ) AS members,
        COUNT(DISTINCT gm.usuario_id)::int AS members_count
      FROM grupos g
      LEFT JOIN usuarios u
        ON u.id = g.creador_id
      LEFT JOIN grupo_miembros gm
        ON gm.grupo_id = g.id
      LEFT JOIN usuarios mu
        ON mu.id = gm.usuario_id
      GROUP BY
        g.id, g.nivel, g.creador_id, g.nombre, g.descripcion, g.creado_en, u.nombre_completo
      ORDER BY g.creado_en DESC
    `);

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGR200',
      data: result.rows
    });
  } catch (error) {
    console.error('ERROR GET GROUPS:', error);

    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: error.message
    });
  }
};

const createGroup = async (request, reply) => {
  const client = await pool.connect();

  try {
    const { nivel, creador_id, nombre, descripcion } = request.body;

    await client.query('BEGIN');

    const groupResult = await client.query(
      `
      INSERT INTO grupos (nivel, creador_id, nombre, descripcion)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [nivel, creador_id, nombre, descripcion]
    );

    const createdGroup = groupResult.rows[0];

    await client.query(
      `
      INSERT INTO grupo_miembros (grupo_id, usuario_id)
      VALUES ($1, $2)
      `,
      [createdGroup.id, creador_id]
    );

    await client.query('COMMIT');

    return reply.status(201).send({
      statusCode: 201,
      intOpCode: 'SxGR201',
      data: [createdGroup],
      message: 'Grupo creado correctamente'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ERROR CREATE GROUP:', error);

    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: error.message
    });
  } finally {
    client.release();
  }
};

const updateGroup = async (request, reply) => {
  try {
    const { id } = request.params;
    const { nivel, nombre, descripcion } = request.body;

    const result = await pool.query(
      `
      UPDATE grupos
      SET nivel = $1,
          nombre = $2,
          descripcion = $3
      WHERE id = $4
      RETURNING *
      `,
      [nivel, nombre, descripcion, id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxGR404',
        data: null,
        message: 'Grupo no encontrado'
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGR200',
      data: result.rows,
      message: 'Grupo actualizado correctamente'
    });
  } catch (error) {
    console.error('ERROR UPDATE GROUP:', error);

    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: error.message
    });
  }
};

const deleteGroup = async (request, reply) => {
  try {
    const { id } = request.params;

    const result = await pool.query(
      `
      DELETE FROM grupos
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxGR404',
        data: null,
        message: 'Grupo no encontrado'
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGR200',
      data: result.rows,
      message: 'Grupo eliminado correctamente'
    });
  } catch (error) {
    console.error('ERROR DELETE GROUP:', error);

    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGR500',
      data: null,
      message: error.message
    });
  }
};

const getGroupMembers = async (request, reply) => {
  try {
    const { groupId } = request.params;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.nombre_completo
      FROM grupo_miembros gm
      INNER JOIN usuarios u ON u.id = gm.usuario_id
      WHERE gm.grupo_id = $1
      ORDER BY u.nombre_completo ASC
      `,
      [groupId]
    );

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGM200',
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getGroupMembers:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGM500',
      data: []
    });
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers
};