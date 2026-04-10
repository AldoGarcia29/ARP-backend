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
        COUNT(DISTINCT gm.usuario_id)::int AS members_count,
        COUNT(DISTINCT t.id)::int AS tickets_count
      FROM grupos g
      LEFT JOIN usuarios u
        ON u.id = g.creador_id
      LEFT JOIN grupo_miembros gm
        ON gm.grupo_id = g.id
      LEFT JOIN usuarios mu
        ON mu.id = gm.usuario_id
      LEFT JOIN tickets t
        ON t.grupo_id = g.id
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

    if (!nivel || !creador_id || !nombre || !descripcion) {
      return reply.status(400).send({
        statusCode: 400,
        intCode: 2000,
        data: null,
        message: 'Faltan campos obligatorios.'
      });
    }

    await client.query('BEGIN');

    const creatorResult = await client.query(
      `
      SELECT id, nombre_completo, email
      FROM usuarios
      WHERE id = $1
      `,
      [creador_id]
    );

    if (creatorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return reply.status(404).send({
        statusCode: 404,
        intCode: 2001,
        data: null,
        message: 'El creador del grupo no existe.'
      });
    }

    const duplicateResult = await client.query(
      `
      SELECT id
      FROM grupos
      WHERE LOWER(nombre) = LOWER($1)
      `,
      [nombre]
    );

    if (duplicateResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return reply.status(409).send({
        statusCode: 409,
        intCode: 2002,
        data: null,
        message: 'Ya existe un grupo con ese nombre.'
      });
    }

    const insertResult = await client.query(
      `
      INSERT INTO grupos (
        nivel,
        creador_id,
        nombre,
        descripcion
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, nivel, creador_id, nombre, descripcion, creado_en
      `,
      [nivel, creador_id, nombre, descripcion]
    );

    const newGroup = insertResult.rows[0];

    // agregar creador como miembro si no existe ya
    const creatorMembership = await client.query(
      `
      SELECT id
      FROM grupo_miembros
      WHERE grupo_id = $1 AND usuario_id = $2
      `,
      [newGroup.id, creador_id]
    );

    if (creatorMembership.rows.length === 0) {
      await client.query(
        `
        INSERT INTO grupo_miembros (
          grupo_id,
          usuario_id
        )
        VALUES ($1, $2)
        `,
        [newGroup.id, creador_id]
      );
    }

    // buscar superAdmin por email
    const superAdminResult = await client.query(
      `
      SELECT id, nombre_completo, email
      FROM usuarios
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      ['aldoprogarciapacheco@gmail.com']
    );

    if (superAdminResult.rows.length > 0) {
      const superAdmin = superAdminResult.rows[0];

      // agregar superAdmin como miembro si no existe
      const superAdminMembership = await client.query(
        `
        SELECT id
        FROM grupo_miembros
        WHERE grupo_id = $1 AND usuario_id = $2
        `,
        [newGroup.id, superAdmin.id]
      );

      if (superAdminMembership.rows.length === 0) {
        await client.query(
          `
          INSERT INTO grupo_miembros (
            grupo_id,
            usuario_id
          )
          VALUES ($1, $2)
          `,
          [newGroup.id, superAdmin.id]
        );
      }

      // obtener todos los permisos de grupo
      const groupPermissionsResult = await client.query(
        `
        SELECT id
        FROM permisos
        WHERE scope = 'group'
        ORDER BY codigo
        `
      );

      for (const perm of groupPermissionsResult.rows) {
        const existingPermission = await client.query(
          `
          SELECT 1
          FROM usuario_permisos_grupo
          WHERE usuario_id = $1
            AND grupo_id = $2
            AND permiso_id = $3
          `,
          [superAdmin.id, newGroup.id, perm.id]
        );

        if (existingPermission.rows.length === 0) {
          await client.query(
            `
            INSERT INTO usuario_permisos_grupo (
              usuario_id,
              grupo_id,
              permiso_id
            )
            VALUES ($1, $2, $3)
            `,
            [superAdmin.id, newGroup.id, perm.id]
          );
        }
      }
    }

    await client.query('COMMIT');

    return reply.status(201).send({
      statusCode: 201,
      intCode: 0,
      data: {
        ...newGroup,
        autor: creatorResult.rows[0].nombre_completo,
        members: [],
        ticketsCount: 0
      },
      message: 'Grupo creado correctamente.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en createGroup:', error);

    return reply.status(500).send({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: error.message || 'Error interno del servidor.'
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

const addGroupMember = async (request, reply) => {
  try {
    const { groupId } = request.params;
    const { usuarioId } = request.body;

    if (!usuarioId) {
      return reply.status(400).send({
        statusCode: 400,
        intOpCode: 'SxGM400',
        data: null,
        message: 'El campo usuarioId es obligatorio'
      });
    }

    const groupExists = await pool.query(
      `SELECT id FROM grupos WHERE id = $1`,
      [groupId]
    );

    if (groupExists.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxGM404',
        data: null,
        message: 'Grupo no encontrado'
      });
    }

    const userExists = await pool.query(
      `SELECT id FROM usuarios WHERE id = $1`,
      [usuarioId]
    );

    if (userExists.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxGM404',
        data: null,
        message: 'Usuario no encontrado'
      });
    }

    const alreadyExists = await pool.query(
      `
      SELECT 1
      FROM grupo_miembros
      WHERE grupo_id = $1 AND usuario_id = $2
      `,
      [groupId, usuarioId]
    );

    if (alreadyExists.rows.length > 0) {
      return reply.status(409).send({
        statusCode: 409,
        intOpCode: 'SxGM409',
        data: null,
        message: 'El usuario ya pertenece a este grupo'
      });
    }

    await pool.query(
      `
      INSERT INTO grupo_miembros (grupo_id, usuario_id)
      VALUES ($1, $2)
      `,
      [groupId, usuarioId]
    );

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.nombre_completo
      FROM usuarios u
      WHERE u.id = $1
      `,
      [usuarioId]
    );

    return reply.status(201).send({
      statusCode: 201,
      intOpCode: 'SxGM201',
      data: result.rows,
      message: 'Miembro agregado correctamente'
    });
  } catch (error) {
    console.error('Error en addGroupMember:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGM500',
      data: null,
      message: error.message
    });
  }
};


const removeGroupMember = async (request, reply) => {
  try {
    const { groupId, usuarioId } = request.params;

    const result = await pool.query(
      `
      DELETE FROM grupo_miembros
      WHERE grupo_id = $1 AND usuario_id = $2
      RETURNING grupo_id, usuario_id
      `,
      [groupId, usuarioId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxGM404',
        data: null,
        message: 'Miembro no encontrado en este grupo'
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxGM200',
      data: result.rows,
      message: 'Miembro removido correctamente'
    });
  } catch (error) {
    console.error('Error en removeGroupMember:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxGM500',
      data: null,
      message: error.message
    });
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  getGroupMembers,
    addGroupMember,
  removeGroupMember
};