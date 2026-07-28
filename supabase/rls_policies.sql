-- ============================================================
-- Taita Soluciones — Políticas RLS
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- ── Habilitar RLS en todas las tablas ───────────────────────
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tecnicos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias            ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitudes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resenas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialidades_tecnico ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USUARIOS
-- ============================================================

-- Lectura pública de datos básicos de técnicos activos (necesario para joins en /tecnicos)
CREATE POLICY "usuarios: lectura publica de tecnicos activos"
  ON usuarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tecnicos t WHERE t.usuario_id = id AND t.activo = true
    )
  );

-- Cualquier usuario autenticado puede leer su propio perfil
CREATE POLICY "usuarios: leer propio"
  ON usuarios FOR SELECT
  USING (id = auth.uid());

-- Admin puede leer todos
CREATE POLICY "usuarios: admin lee todo"
  ON usuarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- Cada usuario puede actualizar su propio perfil
CREATE POLICY "usuarios: actualizar propio"
  ON usuarios FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- El trigger de auth.users crea la fila (service_role, no necesita policy de INSERT para usuarios normales)

-- ============================================================
-- TECNICOS
-- ============================================================

-- Todos pueden ver técnicos activos (lectura pública)
CREATE POLICY "tecnicos: lectura publica activos"
  ON tecnicos FOR SELECT
  USING (activo = true);

-- El técnico ve su propio perfil aunque no esté activo
CREATE POLICY "tecnicos: tecnico ve el suyo"
  ON tecnicos FOR SELECT
  USING (usuario_id = auth.uid());

-- Admin ve todos
CREATE POLICY "tecnicos: admin ve todos"
  ON tecnicos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- El técnico puede actualizar sus propios datos (descripcion, zona, tarifa)
CREATE POLICY "tecnicos: tecnico actualiza el suyo"
  ON tecnicos FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Solo admin puede aprobar (cambiar activo=true)
-- Se maneja via service_role en el backend del dashboard admin

-- El registro de técnico lo hace el propio usuario al registrarse (cliente-side con auth session)
CREATE POLICY "tecnicos: insertar propio al registrarse"
  ON tecnicos FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Admin puede actualizar cualquier técnico (aprobación/rechazo)
CREATE POLICY "tecnicos: admin actualiza"
  ON tecnicos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- Admin puede eliminar técnicos (rechazo)
CREATE POLICY "tecnicos: admin elimina"
  ON tecnicos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- ============================================================
-- CATEGORIAS
-- ============================================================

-- Lectura pública de categorías activas
CREATE POLICY "categorias: lectura publica"
  ON categorias FOR SELECT
  USING (activa = true);

-- Admin puede leer, insertar, actualizar y eliminar
CREATE POLICY "categorias: admin crud"
  ON categorias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- ============================================================
-- ESPECIALIDADES_TECNICO
-- ============================================================

-- Lectura pública (se usa en joins de tecnicos)
CREATE POLICY "especialidades_tecnico: lectura publica"
  ON especialidades_tecnico FOR SELECT
  USING (true);

-- El técnico gestiona sus propias especialidades
CREATE POLICY "especialidades_tecnico: tecnico gestiona las suyas"
  ON especialidades_tecnico FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tecnicos t WHERE t.id = tecnico_id AND t.usuario_id = auth.uid()
    )
  );

-- Admin puede gestionar todas
CREATE POLICY "especialidades_tecnico: admin crud"
  ON especialidades_tecnico FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- ============================================================
-- SOLICITUDES
-- ============================================================

-- El cliente ve sus propias solicitudes
CREATE POLICY "solicitudes: cliente ve las suyas"
  ON solicitudes FOR SELECT
  USING (cliente_id = auth.uid());

-- El técnico ve las solicitudes que le corresponden
CREATE POLICY "solicitudes: tecnico ve las suyas"
  ON solicitudes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tecnicos t WHERE t.id = tecnico_id AND t.usuario_id = auth.uid()
    )
  );

-- Admin ve todas
CREATE POLICY "solicitudes: admin ve todas"
  ON solicitudes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- El cliente puede crear solicitudes (solo con su propio cliente_id)
CREATE POLICY "solicitudes: cliente crea"
  ON solicitudes FOR INSERT
  WITH CHECK (cliente_id = auth.uid());

-- El técnico puede cambiar el estado de sus solicitudes (aceptar/rechazar/en_curso/completar)
CREATE POLICY "solicitudes: tecnico actualiza estado"
  ON solicitudes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tecnicos t WHERE t.id = tecnico_id AND t.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tecnicos t WHERE t.id = tecnico_id AND t.usuario_id = auth.uid()
    )
  );

-- Admin puede actualizar cualquier solicitud
CREATE POLICY "solicitudes: admin actualiza"
  ON solicitudes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- ============================================================
-- RESENAS
-- ============================================================

-- Lectura pública de reseñas
CREATE POLICY "resenas: lectura publica"
  ON resenas FOR SELECT
  USING (true);

-- El cliente crea reseñas de sus propias solicitudes completadas
CREATE POLICY "resenas: cliente crea"
  ON resenas FOR INSERT
  WITH CHECK (
    cliente_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM solicitudes s
      WHERE s.id = solicitud_id
        AND s.cliente_id = auth.uid()
        AND s.estado = 'completada'
    )
  );

-- El cliente puede editar su propia reseña
CREATE POLICY "resenas: cliente edita la suya"
  ON resenas FOR UPDATE
  USING (cliente_id = auth.uid())
  WITH CHECK (cliente_id = auth.uid());

-- Admin puede gestionar todas las reseñas
CREATE POLICY "resenas: admin crud"
  ON resenas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- ============================================================
-- SOLICITUD_HISTORIAL_ESTADOS (tanda de notificaciones/timeline)
-- ============================================================

ALTER TABLE solicitud_historial_estados ENABLE ROW LEVEL SECURITY;

-- El cliente ve el historial de sus propias solicitudes
CREATE POLICY "historial: cliente ve el de sus solicitudes"
  ON solicitud_historial_estados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes s WHERE s.id = solicitud_id AND s.cliente_id = auth.uid()
    )
  );

-- El técnico ve el historial de las solicitudes asignadas a él
CREATE POLICY "historial: tecnico ve el de las suyas"
  ON solicitud_historial_estados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes s
      JOIN tecnicos t ON t.id = s.tecnico_id
      WHERE s.id = solicitud_id AND t.usuario_id = auth.uid()
    )
  );

-- Admin ve todo el historial
CREATE POLICY "historial: admin ve todo"
  ON solicitud_historial_estados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- Los inserts siempre se hacen desde el backend con service_role (notificarCambioEstado),
-- que no depende de RLS — no hace falta policy de INSERT para usuarios normales.

-- ============================================================
-- PAGOS (tanda de conformidad — registro mock, sin cobro real)
-- ============================================================

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- El cliente ve los pagos de sus propias solicitudes
CREATE POLICY "pagos: cliente ve los de sus solicitudes"
  ON pagos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes s WHERE s.id = solicitud_id AND s.cliente_id = auth.uid()
    )
  );

-- El técnico ve los pagos de las solicitudes asignadas a él
CREATE POLICY "pagos: tecnico ve los de las suyas"
  ON pagos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solicitudes s
      JOIN tecnicos t ON t.id = s.tecnico_id
      WHERE s.id = solicitud_id AND t.usuario_id = auth.uid()
    )
  );

-- Admin ve todos los pagos
CREATE POLICY "pagos: admin ve todos"
  ON pagos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios u WHERE u.id = auth.uid() AND u.tipo = 'admin'
    )
  );

-- Los inserts se hacen desde el backend con service_role (dar-conformidad.ts) — no hace falta
-- policy de INSERT para usuarios normales.

-- ============================================================
-- NOTIFICACIONES (campanita in-app, tiempo real vía Supabase Realtime)
-- ============================================================

ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Cada usuario ve solo sus propias notificaciones. Esta misma policy es la que Supabase Realtime
-- usa para filtrar qué inserts le llegan a cada cliente conectado — sin esto, Realtime no
-- entregaría ninguna fila (o las entregaría todas, según config), así que es obligatoria para
-- que la campanita funcione, no solo para el listado normal.
CREATE POLICY "notificaciones: usuario ve las suyas"
  ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

-- El usuario puede marcar sus propias notificaciones como leídas (usado desde
-- /api/notificaciones/marcar-leida, que ya filtra por usuario_id igual — esta policy es la
-- segunda capa de defensa, por si algún día se llama directo con el cliente browser).
CREATE POLICY "notificaciones: usuario marca las suyas como leidas"
  ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Los inserts se hacen desde el backend con service_role (notificarCambioEstado,
-- notificarNuevaSolicitud, notificarConformidad, notificarMensajeAdmin) — no hace falta policy de
-- INSERT para usuarios normales.
