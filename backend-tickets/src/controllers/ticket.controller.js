const pool = require('../db/db');

const saveTicketHistory = async (ticketId, usuarioId, accion, detalle) => {
  await pool.query(
    `
    INSERT INTO historial_tickets (ticket_id, usuario_id, accion, detalle)
    VALUES ($1, $2, $3, $4)
    `,
    [ticketId, usuarioId, accion, detalle]
  );
};

const getTicketBaseById = async (ticketId) => {
  const result = await pool.query(
    `
    SELECT
      t.id,
      t.grupo_id,
      t.titulo,
      t.descripcion,
      t.autor_id,
      t.asignado_id,
      t.estado_id,
      t.prioridad_id,
      t.creado_en,
      t.fecha_limite,
      t.fecha_final
    FROM tickets t
    WHERE t.id = $1
    LIMIT 1
    `,
    [ticketId]
  );

  return result.rows[0] || null;
};

const getEstadoNombreById = async (estadoId) => {
  const result = await pool.query(
    `SELECT nombre FROM estados WHERE id = $1 LIMIT 1`,
    [estadoId]
  );

  return result.rows[0]?.nombre || null;
};

const getPrioridadNombreById = async (prioridadId) => {
  const result = await pool.query(
    `SELECT nombre FROM prioridades WHERE id = $1 LIMIT 1`,
    [prioridadId]
  );

  return result.rows[0]?.nombre || null;
};

const getUsuarioNombreById = async (usuarioId) => {
  if (!usuarioId) return 'Sin asignar';

  const result = await pool.query(
    `
    SELECT nombre_completo, username
    FROM usuarios
    WHERE id = $1
    LIMIT 1
    `,
    [usuarioId]
  );

  return result.rows[0]?.nombre_completo || result.rows[0]?.username || 'Usuario';
};

const createTicket = async (request, reply) => {
  try {
    const {
      grupo_id,
      titulo,
      descripcion,
      asignado_id,
      estado_id,
      prioridad_id,
      fecha_limite
    } = request.body;

    const autor_id = request.user.id;

    if (!grupo_id || !titulo || !estado_id || !prioridad_id) {
      return reply.status(400).send({
        statusCode: 400,
        intOpCode: 'SxTK400',
        data: [],
        message: 'Faltan campos obligatorios'
      });
    }

    const result = await pool.query(
      `
      INSERT INTO tickets (
        grupo_id,
        titulo,
        descripcion,
        autor_id,
        asignado_id,
        estado_id,
        prioridad_id,
        fecha_limite
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        grupo_id,
        titulo,
        descripcion || null,
        autor_id,
        asignado_id || null,
        estado_id,
        prioridad_id,
        fecha_limite || null
      ]
    );

    const ticket = result.rows[0];

    await saveTicketHistory(
      ticket.id,
      autor_id,
      'Creación',
      'Se creó el ticket'
    );

    return reply.status(201).send({
      statusCode: 201,
      intOpCode: 'SxTK201',
      data: [ticket]
    });
  } catch (error) {
    console.error('Error en createTicket:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al crear ticket'
    });
  }
};

const getTicketsByGroup = async (request, reply) => {
  try {
    const { grupoId } = request.params;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.grupo_id,
        t.titulo,
        t.descripcion,
        t.autor_id,
        t.asignado_id,
        t.estado_id,
        t.prioridad_id,
        t.creado_en,
        t.fecha_limite,
        t.fecha_final,

        g.nombre AS grupo_nombre,
        au.username AS autor_username,
        au.nombre_completo AS autor_nombre_completo,
        asi.username AS asignado_username,
        asi.nombre_completo AS asignado_nombre_completo,
        e.nombre AS estado_nombre,
        p.nombre AS prioridad_nombre

      FROM tickets t
      INNER JOIN grupos g ON g.id = t.grupo_id
      INNER JOIN usuarios au ON au.id = t.autor_id
      LEFT JOIN usuarios asi ON asi.id = t.asignado_id
      INNER JOIN estados e ON e.id = t.estado_id
      INNER JOIN prioridades p ON p.id = t.prioridad_id
      WHERE t.grupo_id = $1
      ORDER BY t.creado_en DESC
      `,
      [grupoId]
    );

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getTicketsByGroup:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al obtener tickets'
    });
  }
};

const getTicketById = async (request, reply) => {
  try {
    const { id } = request.params;

    const result = await pool.query(
      `
      SELECT
        t.id,
        t.grupo_id,
        t.titulo,
        t.descripcion,
        t.autor_id,
        t.asignado_id,
        t.estado_id,
        t.prioridad_id,
        t.creado_en,
        t.fecha_limite,
        t.fecha_final,

        g.nombre AS grupo_nombre,
        au.username AS autor_username,
        au.nombre_completo AS autor_nombre_completo,
        asi.username AS asignado_username,
        asi.nombre_completo AS asignado_nombre_completo,
        e.nombre AS estado_nombre,
        p.nombre AS prioridad_nombre

      FROM tickets t
      INNER JOIN grupos g ON g.id = t.grupo_id
      INNER JOIN usuarios au ON au.id = t.autor_id
      LEFT JOIN usuarios asi ON asi.id = t.asignado_id
      INNER JOIN estados e ON e.id = t.estado_id
      INNER JOIN prioridades p ON p.id = t.prioridad_id
      WHERE t.id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxTK404',
        data: [],
        message: 'Ticket no encontrado'
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: [result.rows[0]]
    });
  } catch (error) {
    console.error('Error en getTicketById:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al obtener ticket'
    });
  }
};

const updateTicket = async (request, reply) => {
  try {
    const { id } = request.params;
    const {
      titulo,
      descripcion,
      asignado_id,
      prioridad_id,
      fecha_limite
    } = request.body;

    const usuario_id = request.user.id;

    const currentTicket = await getTicketBaseById(id);

    if (!currentTicket) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxTK404',
        data: [],
        message: 'Ticket no encontrado'
      });
    }

    const result = await pool.query(
      `
      UPDATE tickets
      SET
        titulo = COALESCE($1, titulo),
        descripcion = COALESCE($2, descripcion),
        asignado_id = COALESCE($3, asignado_id),
        prioridad_id = COALESCE($4, prioridad_id),
        fecha_limite = COALESCE($5, fecha_limite)
      WHERE id = $6
      RETURNING *
      `,
      [
        titulo || null,
        descripcion || null,
        asignado_id || null,
        prioridad_id || null,
        fecha_limite || null,
        id
      ]
    );

    if (titulo && titulo !== currentTicket.titulo) {
      await saveTicketHistory(
        id,
        usuario_id,
        'Cambio de título',
        `De "${currentTicket.titulo}" a "${titulo}"`
      );
    }

    if (
      descripcion !== undefined &&
      descripcion !== null &&
      descripcion !== currentTicket.descripcion
    ) {
      await saveTicketHistory(
        id,
        usuario_id,
        'Cambio de descripción',
        'Se actualizó la descripción del ticket'
      );
    }

    if (
      asignado_id !== undefined &&
      asignado_id !== currentTicket.asignado_id
    ) {
      const oldUser = await getUsuarioNombreById(currentTicket.asignado_id);
      const newUser = await getUsuarioNombreById(asignado_id);

      await saveTicketHistory(
        id,
        usuario_id,
        'Cambio de asignado',
        `De "${oldUser}" a "${newUser}"`
      );
    }

    if (
      prioridad_id !== undefined &&
      prioridad_id !== currentTicket.prioridad_id
    ) {
      const oldPriority = await getPrioridadNombreById(currentTicket.prioridad_id);
      const newPriority = await getPrioridadNombreById(prioridad_id);

      await saveTicketHistory(
        id,
        usuario_id,
        'Cambio de prioridad',
        `De "${oldPriority}" a "${newPriority}"`
      );
    }

    if (
      fecha_limite !== undefined &&
      fecha_limite !== currentTicket.fecha_limite
    ) {
      await saveTicketHistory(
        id,
        usuario_id,
        'Cambio de fecha límite',
        `Nueva fecha límite: ${fecha_limite || 'Sin fecha'}`
      );
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: [result.rows[0]]
    });
  } catch (error) {
    console.error('Error en updateTicket:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al actualizar ticket'
    });
  }
};

const deleteTicket = async (request, reply) => {
  try {
    const { id } = request.params;

    const result = await pool.query(
      `
      DELETE FROM tickets
      WHERE id = $1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxTK404',
        data: [],
        message: 'Ticket no encontrado'
      });
    }

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: []
    });
  } catch (error) {
    console.error('Error en deleteTicket:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al eliminar ticket'
    });
  }
};

const changeTicketStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { estado_id, fecha_final } = request.body;
    const usuario_id = request.user.id;

    if (!estado_id) {
      return reply.status(400).send({
        statusCode: 400,
        intOpCode: 'SxTK400',
        data: [],
        message: 'estado_id es obligatorio'
      });
    }

    const currentTicket = await getTicketBaseById(id);

    if (!currentTicket) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxTK404',
        data: [],
        message: 'Ticket no encontrado'
      });
    }

    const oldStateName = await getEstadoNombreById(currentTicket.estado_id);
    const newStateName = await getEstadoNombreById(estado_id);

    const result = await pool.query(
      `
      UPDATE tickets
      SET
        estado_id = $1,
        fecha_final = $2
      WHERE id = $3
      RETURNING *
      `,
      [estado_id, fecha_final || null, id]
    );

    await saveTicketHistory(
      id,
      usuario_id,
      'Cambio de estado',
      `De "${oldStateName}" a "${newStateName}"`
    );

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: [result.rows[0]]
    });
  } catch (error) {
    console.error('Error en changeTicketStatus:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al cambiar estado'
    });
  }
};

const assignTicket = async (request, reply) => {
  try {
    const { id } = request.params;
    const { asignado_id } = request.body;
    const usuario_id = request.user.id;

    const currentTicket = await getTicketBaseById(id);

    if (!currentTicket) {
      return reply.status(404).send({
        statusCode: 404,
        intOpCode: 'SxTK404',
        data: [],
        message: 'Ticket no encontrado'
      });
    }

    const result = await pool.query(
      `
      UPDATE tickets
      SET asignado_id = $1
      WHERE id = $2
      RETURNING *
      `,
      [asignado_id || null, id]
    );

    const oldUser = await getUsuarioNombreById(currentTicket.asignado_id);
    const newUser = await getUsuarioNombreById(asignado_id);

    await saveTicketHistory(
      id,
      usuario_id,
      'Cambio de asignado',
      `De "${oldUser}" a "${newUser}"`
    );

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTK200',
      data: [result.rows[0]]
    });
  } catch (error) {
    console.error('Error en assignTicket:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTK500',
      data: [],
      message: 'Error interno al asignar ticket'
    });
  }
};

const getTicketHistory = async (request, reply) => {
  try {
    const { id } = request.params;

    const result = await pool.query(
      `
      SELECT
        th.id,
        th.ticket_id,
        th.usuario_id,
        th.accion,
        th.detalle,
        th.creado_en,
        u.username,
        u.nombre_completo
      FROM historial_tickets th
      LEFT JOIN usuarios u ON u.id = th.usuario_id
      WHERE th.ticket_id = $1
      ORDER BY th.creado_en DESC
      `,
      [id]
    );

    return reply.status(200).send({
      statusCode: 200,
      intOpCode: 'SxTH200',
      data: result.rows
    });
  } catch (error) {
    console.error('Error en getTicketHistory:', error);
    return reply.status(500).send({
      statusCode: 500,
      intOpCode: 'SxTH500',
      data: [],
      message: 'Error interno al obtener historial'
    });
  }
};

module.exports = {
  createTicket,
  getTicketsByGroup,
  getTicketById,
  updateTicket,
  deleteTicket,
  changeTicketStatus,
  assignTicket,
  getTicketHistory
};