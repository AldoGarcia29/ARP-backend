const pool = require('../db/db');

const getGroups = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        g.id,
        g.nivel,
        g.creador_id,
        g.nombre,
        g.descripcion,
        g.creado_en,
        u.nombre_completo AS autor
      FROM grupos g
      INNER JOIN usuarios u ON u.id = g.creador_id
      ORDER BY g.creado_en DESC
      `
    );

    const groups = [];

    for (const row of result.rows) {
      const membersResult = await pool.query(
        `
        SELECT
          us.id,
          us.username,
          us.email,
          us.nombre_completo
        FROM grupo_miembros gm
        INNER JOIN usuarios us ON us.id = gm.usuario_id
        WHERE gm.grupo_id = $1
        ORDER BY us.nombre_completo ASC
        `,
        [row.id]
      );

      groups.push({
        id: row.id,
        nivel: row.nivel,
        creador_id: row.creador_id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        creado_en: row.creado_en,
        autor: row.autor,
        members: membersResult.rows,
        ticketsCount: 0
      });
    }

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: groups,
      message: 'Grupos obtenidos correctamente.'
    });
  } catch (error) {
    console.error('Error en getGroups:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const createGroup = async (req, res) => {
  try {
    const { nivel, creador_id, nombre, descripcion } = req.body;

    if (!nivel || !creador_id || !nombre || !descripcion) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 2000,
        data: null,
        message: 'Faltan campos obligatorios.'
      });
    }

    const creatorResult = await pool.query(
      `
      SELECT id, nombre_completo
      FROM usuarios
      WHERE id = $1
      `,
      [creador_id]
    );

    if (creatorResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2001,
        data: null,
        message: 'El creador del grupo no existe.'
      });
    }

    const duplicateResult = await pool.query(
      `
      SELECT id
      FROM grupos
      WHERE LOWER(nombre) = LOWER($1)
      `,
      [nombre]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        intCode: 2002,
        data: null,
        message: 'Ya existe un grupo con ese nombre.'
      });
    }

    const insertResult = await pool.query(
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

    // Opcional: agregar automáticamente al creador como miembro
    await pool.query(
      `
      INSERT INTO grupo_miembros (
        grupo_id,
        usuario_id
      )
      VALUES ($1, $2)
      `,
      [newGroup.id, creador_id]
    );

    return res.status(201).json({
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
    console.error('Error en createGroup:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { nivel, nombre, descripcion } = req.body;

    const existingGroup = await pool.query(
      `
      SELECT id
      FROM grupos
      WHERE id = $1
      `,
      [id]
    );

    if (existingGroup.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2003,
        data: null,
        message: 'Grupo no encontrado.'
      });
    }

    if (!nivel || !nombre || !descripcion) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 2004,
        data: null,
        message: 'Faltan campos obligatorios.'
      });
    }

    const duplicateResult = await pool.query(
      `
      SELECT id
      FROM grupos
      WHERE LOWER(nombre) = LOWER($1)
        AND id <> $2
      `,
      [nombre, id]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        intCode: 2005,
        data: null,
        message: 'Ya existe otro grupo con ese nombre.'
      });
    }

    const updateResult = await pool.query(
      `
      UPDATE grupos
      SET
        nivel = $1,
        nombre = $2,
        descripcion = $3
      WHERE id = $4
      RETURNING id, nivel, creador_id, nombre, descripcion, creado_en
      `,
      [nivel, nombre, descripcion, id]
    );

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: updateResult.rows[0],
      message: 'Grupo actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error en updateGroup:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const existingGroup = await pool.query(
      `
      SELECT id
      FROM grupos
      WHERE id = $1
      `,
      [id]
    );

    if (existingGroup.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2006,
        data: null,
        message: 'Grupo no encontrado.'
      });
    }

    await pool.query(
      `
      DELETE FROM grupo_miembros
      WHERE grupo_id = $1
      `,
      [id]
    );

    await pool.query(
      `
      DELETE FROM grupos
      WHERE id = $1
      `,
      [id]
    );

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: null,
      message: 'Grupo eliminado correctamente.'
    });
  } catch (error) {
    console.error('Error en deleteGroup:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const addGroupMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuarioId } = req.body;

    if (!usuarioId) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 2007,
        data: null,
        message: 'El usuario es obligatorio.'
      });
    }

    const groupResult = await pool.query(
      `
      SELECT id
      FROM grupos
      WHERE id = $1
      `,
      [id]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2008,
        data: null,
        message: 'Grupo no encontrado.'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE id = $1
      `,
      [usuarioId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2009,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    const existingMembership = await pool.query(
      `
      SELECT id
      FROM grupo_miembros
      WHERE grupo_id = $1
        AND usuario_id = $2
      `,
      [id, usuarioId]
    );

    if (existingMembership.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        intCode: 2010,
        data: null,
        message: 'El usuario ya pertenece a este grupo.'
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO grupo_miembros (
        grupo_id,
        usuario_id
      )
      VALUES ($1, $2)
      RETURNING id, grupo_id, usuario_id, fecha_unido
      `,
      [id, usuarioId]
    );

    return res.status(201).json({
      statusCode: 201,
      intCode: 0,
      data: insertResult.rows[0],
      message: 'Miembro agregado correctamente.'
    });
  } catch (error) {
    console.error('Error en addGroupMember:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const removeGroupMember = async (req, res) => {
  try {
    const { id, usuarioId } = req.params;

    const existingMembership = await pool.query(
      `
      SELECT id
      FROM grupo_miembros
      WHERE grupo_id = $1
        AND usuario_id = $2
      `,
      [id, usuarioId]
    );

    if (existingMembership.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 2011,
        data: null,
        message: 'El miembro no pertenece a este grupo.'
      });
    }

    await pool.query(
      `
      DELETE FROM grupo_miembros
      WHERE grupo_id = $1
        AND usuario_id = $2
      `,
      [id, usuarioId]
    );

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: null,
      message: 'Miembro removido correctamente.'
    });
  } catch (error) {
    console.error('Error en removeGroupMember:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember
};