const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');
const { text } = require('express');

const registerUser = async (req, res) => {
  try {
    const {
      username,
      email,
      nombre_completo,
      direccion,
      telefono,
      fecha_nac,
      password
    } = req.body;

    if (
      !username ||
      !email ||
      !nombre_completo ||
      !direccion ||
      !telefono ||
      !fecha_nac ||
      !password
    ) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 1000,
        data: null,
        message: 'Faltan campos obligatorios.'
      });
    }

    const existingUser = await pool.query(
      `SELECT id FROM usuarios WHERE email = $1 OR username = $2`,
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        intCode: 1001,
        data: null,
        message: 'El usuario o email ya existe.'
      });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios (
        username,
        email,
        nombre_completo,
        direccion,
        telefono,
        fecha_nac,
        password_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, nombre_completo, creado_en
      `,
      [
        username,
        email,
        nombre_completo,
        direccion,
        telefono,
        fecha_nac,
        password_hash
      ]
    );

    return res.status(201).json({
  statusCode: 201,
  intOpCode: 'SxUS201',
  data: [
    {
      user: result.rows[0],
      message: 'Usuario registrado correctamente.'
    }
  ]
});
  } catch (error) {
    console.error('Error en registerUser:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 1002,
        data: null,
        message: 'Correo y contraseña son obligatorios.'
      });
    }

    const userResult = await pool.query(
      `
      SELECT id, username, email, nombre_completo, direccion, telefono, password_hash, activo
      FROM usuarios
      WHERE email = $1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        statusCode: 401,
        intCode: 1003,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    const user = userResult.rows[0];

    if (user.activo === false) {
      return res.status(403).json({
        statusCode: 403,
        intCode: 1004,
        data: null,
        message: 'Usuario inactivo.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({
        statusCode: 401,
        intCode: 1005,
        data: null,
        message: 'Contraseña incorrecta.'
      });
    }

    // Permisos globales
    const globalPermissionsResult = await pool.query(
      `
      SELECT p.codigo
      FROM usuario_permisos_globales upg
      INNER JOIN permisos p ON p.id = upg.permiso_id
      WHERE upg.usuario_id = $1
      ORDER BY p.codigo
      `,
      [user.id]
    );

    const globalPermissions = globalPermissionsResult.rows.map(row => row.codigo);

    // Permisos por grupo
    const groupPermissionsResult = await pool.query(
      `
      SELECT
        upg.grupo_id,
        p.codigo
      FROM usuario_permisos_grupo upg
      INNER JOIN permisos p ON p.id = upg.permiso_id
      WHERE upg.usuario_id = $1
      ORDER BY upg.grupo_id, p.codigo
      `,
      [user.id]
    );

    const groupPermissionsMap = {};

    for (const row of groupPermissionsResult.rows) {
      if (!groupPermissionsMap[row.grupo_id]) {
        groupPermissionsMap[row.grupo_id] = [];
      }
      groupPermissionsMap[row.grupo_id].push(row.codigo);
    }

    const groupPermissions = Object.entries(groupPermissionsMap).map(
      ([grupo_id, permissions]) => ({
        grupo_id,
        permissions
      })
    );

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET || 'dev_secret_key',
      { expiresIn: '1d' }
    );

    await pool.query(
      `
      UPDATE usuarios
      SET last_login = now()
      WHERE id = $1
      `,
      [user.id]
    );

    return res.status(200).json({
      statusCode: 200,
      intOpCode: 'SxUS200',
      data: [
        {
        message: 'Login correcto.',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nombre_completo: user.nombre_completo,
          direccion:user.direccion,
          telefono:user.telefono  
        },
        globalPermissions,
        groupPermissions
      }
      ],
    });
  } catch (error) {
    console.error('Error en loginUser:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        nombre_completo
      FROM usuarios
      WHERE activo = true
      ORDER BY nombre_completo ASC
      `
    );

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: result.rows,
      message: 'Usuarios obtenidos correctamente.'
    });
  } catch (error) {
    console.error('Error en getUsers:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        nombre_completo,
        direccion,
        telefono,
        fecha_nac,
        activo,
        creado_en
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 1006,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: result.rows[0],
      message: 'Usuario obtenido correctamente.'
    });
  } catch (error) {
    console.error('Error en getUserById:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      email,
      nombre_completo,
      direccion,
      telefono,
      fecha_nac,
      password
    } = req.body;

    if (
      !username ||
      !email ||
      !nombre_completo ||
      !direccion ||
      !telefono ||
      !fecha_nac
    ) {
      return res.status(400).json({
        statusCode: 400,
        intCode: 1007,
        data: null,
        message: 'Faltan campos obligatorios.'
      });
    }

    const existingUser = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 1008,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    const duplicateUser = await pool.query(
      `
      SELECT id
      FROM usuarios
      WHERE (email = $1 OR username = $2)
        AND id <> $3
      `,
      [email, username, id]
    );

    if (duplicateUser.rows.length > 0) {
      return res.status(409).json({
        statusCode: 409,
        intCode: 1009,
        data: null,
        message: 'El username o email ya está en uso por otro usuario.'
      });
    }

    let query = `
      UPDATE usuarios
      SET
        username = $1,
        email = $2,
        nombre_completo = $3,
        direccion = $4,
        telefono = $5,
        fecha_nac = $6
    `;

    const params = [
      username,
      email,
      nombre_completo,
      direccion,
      telefono,
      fecha_nac
    ];

    if (typeof password === 'string' && password.trim().length > 0) {
      const password_hash = await bcrypt.hash(password, 10);
      query += `, password_hash = $7 WHERE id = $8
        RETURNING id, username, email, nombre_completo, direccion, telefono, fecha_nac`;
      params.push(password_hash, id);
    } else {
      query += ` WHERE id = $7
        RETURNING id, username, email, nombre_completo, direccion, telefono, fecha_nac`;
      params.push(id);
    }

    const result = await pool.query(query, params);

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: result.rows[0],
      message: 'Perfil actualizado correctamente.'
    });
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};


const getUserFullById = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      `
      SELECT
        id,
        username,
        email,
        nombre_completo,
        direccion,
        telefono,
        fecha_nac,
        activo,
        creado_en
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 1010,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    const globalPermissionsResult = await pool.query(
      `
      SELECT
        p.id,
        p.codigo,
        p.descripcion,
        p.scope
      FROM usuario_permisos_globales upg
      INNER JOIN permisos p ON p.id = upg.permiso_id
      WHERE upg.usuario_id = $1
      ORDER BY p.codigo
      `,
      [id]
    );

    // Traer TODOS los grupos donde el usuario pertenece
    const userGroupsResult = await pool.query(
      `
      SELECT
        g.id AS grupo_id,
        g.nombre AS grupo_nombre
      FROM grupo_miembros gm
      INNER JOIN grupos g ON g.id = gm.grupo_id
      WHERE gm.usuario_id = $1
      ORDER BY g.nombre ASC
      `,
      [id]
    );

    // Traer los permisos por grupo que ya tiene asignados
    const groupPermissionsResult = await pool.query(
      `
      SELECT
        upg.grupo_id,
        p.id AS permiso_id,
        p.codigo,
        p.descripcion,
        p.scope
      FROM usuario_permisos_grupo upg
      INNER JOIN permisos p ON p.id = upg.permiso_id
      WHERE upg.usuario_id = $1
      ORDER BY upg.grupo_id, p.codigo
      `,
      [id]
    );

    const groupMap = {};

    // Primero registrar todos los grupos donde pertenece
    for (const row of userGroupsResult.rows) {
      groupMap[row.grupo_id] = {
        grupo_id: row.grupo_id,
        grupo_nombre: row.grupo_nombre,
        permissions: []
      };
    }

    // Después meter los permisos que ya tenga asignados en esos grupos
    for (const row of groupPermissionsResult.rows) {
      if (!groupMap[row.grupo_id]) {
        groupMap[row.grupo_id] = {
          grupo_id: row.grupo_id,
          grupo_nombre: '',
          permissions: []
        };
      }

      groupMap[row.grupo_id].permissions.push({
        id: row.permiso_id,
        codigo: row.codigo,
        descripcion: row.descripcion,
        scope: row.scope
      });
    }

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: {
        user: userResult.rows[0],
        globalPermissions: globalPermissionsResult.rows,
        groupPermissions: Object.values(groupMap)
      },
      message: 'Detalle del usuario obtenido correctamente.'
    });
  } catch (error) {
    console.error('Error en getUserFullById:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: 'Error interno del servidor.'
    });
  }
};

const updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      globalPermissionIds = [],
      groupPermissions = []
    } = req.body;

    // LIMPIAR IDs inválidos
    const cleanGlobalIds = (globalPermissionIds || [])
      .filter(id => id && typeof id === 'string');

    // BORRAR SOLO SI VIENEN DATOS
    await pool.query(
      `DELETE FROM usuario_permisos_globales WHERE usuario_id = $1`,
      [id]
    );

    if (cleanGlobalIds.length > 0) {
      await pool.query(
        `
        INSERT INTO usuario_permisos_globales (usuario_id, permiso_id)
        SELECT $1, UNNEST($2::uuid[])
        `,
        [id, cleanGlobalIds]
      );
    }

    // GRUPOS
    await pool.query(
      `DELETE FROM usuario_permisos_grupo WHERE usuario_id = $1`,
      [id]
    );

    for (const gp of groupPermissions) {
      const grupoId = gp.grupo_id;
      const permissionIds = (gp.permissionIds || []).filter(p => p);

      if (permissionIds.length > 0) {
        await pool.query(
          `
          INSERT INTO usuario_permisos_grupo (usuario_id, grupo_id, permiso_id)
          SELECT $1, $2, UNNEST($3::uuid[])
          `,
          [id, grupoId, permissionIds]
        );
      }
    }

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: [],
      message: 'Permisos actualizados correctamente.'
    });

  } catch (error) {
    console.error('Error en updateUserPermissions:', error);
    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: [],
      message: 'Error interno del servidor.'
    });
  }
};

const deleteUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const userResult = await client.query(
      `
      SELECT id, email
      FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        intCode: 1012,
        data: null,
        message: 'Usuario no encontrado.'
      });
    }

    await client.query('BEGIN');

    // 1. Limpiar referencias en tickets
    await client.query(
      `
      UPDATE tickets
      SET autor_id = NULL
      WHERE autor_id = $1
      `,
      [id]
    );

    await client.query(
      `
      UPDATE tickets
      SET asignado_id = NULL
      WHERE asignado_id = $1
      `,
      [id]
    );

    // 2. Limpiar referencias en historial
    await client.query(
      `
      UPDATE historial_tickets
      SET usuario_id = NULL
      WHERE usuario_id = $1
      `,
      [id]
    );

    // 3. Si el usuario creó grupos, aquí tienes dos opciones:
    //    A) impedir borrarlo si aún es creador de grupos
    //    B) poner creador_id en NULL si la columna lo permite
    //
    // Aquí usaré la opción A, más segura.
    const ownedGroupsResult = await client.query(
      `
      SELECT id, nombre
      FROM grupos
      WHERE creador_id = $1
      LIMIT 1
      `,
      [id]
    );

    if (ownedGroupsResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        statusCode: 409,
        intCode: 1013,
        data: null,
        message: 'No se puede eliminar el usuario porque aún es creador de uno o más grupos.'
      });
    }

    // 4. Borrar relaciones del usuario
    await client.query(
      `
      DELETE FROM usuario_permisos_globales
      WHERE usuario_id = $1
      `,
      [id]
    );

    await client.query(
      `
      DELETE FROM usuario_permisos_grupo
      WHERE usuario_id = $1
      `,
      [id]
    );

    await client.query(
      `
      DELETE FROM grupo_miembros
      WHERE usuario_id = $1
      `,
      [id]
    );

    // 5. Finalmente borrar usuario
    await client.query(
      `
      DELETE FROM usuarios
      WHERE id = $1
      `,
      [id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      statusCode: 200,
      intCode: 0,
      data: null,
      message: 'Usuario eliminado correctamente.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en deleteUser:', error);

    return res.status(500).json({
      statusCode: 500,
      intCode: 9999,
      data: null,
      message: error.message || 'Error interno del servidor.'
    });
  } finally {
    client.release();
  }
};
module.exports = {
  registerUser,
  loginUser,
  getUsers,
  getUserById,
      getUserFullById,
  updateUserProfile,
    updateUserPermissions,
  deleteUser
};