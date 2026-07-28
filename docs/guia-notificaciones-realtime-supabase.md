# Guía: notificaciones in-app en tiempo real con Supabase Realtime

> Documento genérico, pensado para copiar a otros proyectos que usen Supabase + un framework con
> islas de React (Astro, Next, etc.). La implementación de referencia (código real, no pseudocódigo)
> vive en este mismo repo — está referenciada al final de cada sección.

## Qué resuelve esto

Una campanita tipo Facebook/Instagram: cada usuario logueado ve sus propios avisos (cambios de
estado, mensajes nuevos, lo que sea relevante para su rol) y **aparecen solos, sin recargar la
página ni hacer polling**. La pieza que lo hace posible es **Supabase Realtime**, que escucha
cambios en una tabla de Postgres (vía replicación lógica) y los empuja por WebSocket a los clientes
suscriptos.

No hace falta infraestructura extra (sin Redis, sin un servidor de sockets propio) — es una feature
nativa de Supabase, capa gratis incluye 200 conexiones concurrentes y 2 millones de mensajes/mes,
de sobra para un proyecto chico/mediano.

---

## 1. Modelo de datos

Una tabla simple alcanza. Ejemplo genérico:

```sql
CREATE TABLE IF NOT EXISTS notificaciones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,  -- a quién le llega
  entidad_id   uuid,           -- opcional: a qué registro apunta (pedido, ticket, lo que sea)
  titulo       text NOT NULL,
  mensaje      text,
  leida        boolean NOT NULL DEFAULT false,
  creado_en    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones (usuario_id, creado_en DESC);
```

Puntos de diseño que importan:
- **Un `usuario_id` fijo por fila**, no una tabla de "para quién es visible" — si un evento le
  corresponde a 3 personas, se insertan 3 filas. Simplifica la policy de RLS (siguiente sección) y
  el filtro de Realtime a un solo `WHERE usuario_id = X`.
- `entidad_id` nullable: no todas las notificaciones tienen que apuntar a algo clickeable (ej. un
  mensaje de contacto genérico no linkea a ningún detalle).
- Nada de esto rompe algo existente si se agrega a un proyecto en producción — es aditivo.

**Implementación real:** `notificaciones` en `docs/ESTADO_PROYECTO.md` → sección "Notificaciones
in-app en tiempo real" (usa `solicitud_id` en vez de `entidad_id` genérico).

---

## 2. RLS — la parte que la gente se olvida

Esto es lo más importante de toda la guía: **Supabase Realtime respeta Row Level Security**. La
policy de `SELECT` no es solo para consultas normales — es la que Supabase usa para decidir qué
fila le llega a cada conexión de WebSocket. Sin una policy de `SELECT` que filtre por el dueño de
la fila, Realtime **no entrega nada** (o si RLS está deshabilitado en la tabla, entregaría *todo* a
*todos* — un agujero de seguridad, no una feature).

```sql
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificaciones: usuario ve las suyas"
  ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

-- Si el usuario va a poder marcar como leída desde el browser directo (sin pasar por un API route):
CREATE POLICY "notificaciones: usuario marca las suyas como leidas"
  ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Los inserts los hace el backend con la service_role key (que bypasea RLS) — no hace falta
-- policy de INSERT para usuarios normales, y de hecho conviene NO dársela: los inserts deberían
-- salir siempre de lógica de servidor validada, no de que cualquiera inserte notificaciones falsas.
```

### ⚠️ Las policies con `EXISTS`/JOIN a otra tabla no le llegan bien a Realtime

Esto es un hallazgo **confirmado en producción** en este proyecto, no una sospecha teórica —
importa lo suficiente como para tener su propia sub-sección.

Si la policy de `SELECT` es una comparación directa de columna (`usuario_id = auth.uid()`,
`cliente_id = auth.uid()`), Realtime entrega el evento sin problema. Pero si la policy necesita un
`EXISTS`/`JOIN` contra otra tabla para resolver el dueño de la fila — típico cuando el "dueño" no
es la fila misma sino algo relacionado, ej. `EXISTS (SELECT 1 FROM tecnicos t WHERE t.id =
tabla.tecnico_id AND t.usuario_id = auth.uid())` — la policy funciona perfecto para queries
normales (`select`, `.eq()`, etc.) pero **Realtime nunca entrega el evento**, sin ningún error
visible ni en el cliente ni en los logs. Se descubre solo probándolo en la práctica: la fila
existe, la policy en teoría la permite, pero la suscripción se queda muda.

Dos formas de resolverlo, de menor a mayor esfuerzo/riesgo:

1. **Reusar un canal que ya sabés que funciona como disparador de refresco**, en vez de suscribirte
   directo a la tabla problemática. Si el usuario ya recibe una notificación (tabla
   `notificaciones`, policy simple) por cada evento relevante, escuchá *esa* tabla y hacé un
   refetch normal (vía API, con `service_role`, sin RLS de por medio) cuando llegue. Es lo que se
   hizo acá — cero cambios de esquema, cero riesgo nuevo, reusa infraestructura ya probada.
2. **Denormalizar la columna del dueño directo en la tabla** (ej. agregar
   `tecnico_usuario_id` a la tabla de pedidos, mantenida con un trigger `BEFORE INSERT OR UPDATE`),
   y reescribir la policy para comparar esa columna directo contra `auth.uid()`. Más prolijo y
   resuelve el problema de raíz para cualquier suscripción futura a esa tabla, pero es un cambio de
   esquema con más superficie — evaluar si vale la pena para el caso de uso.

Para este proyecto, la opción 1 alcanzó y evitó tocar una policy que ya está en uso en varios
lugares.

## 3. Habilitar Realtime en la tabla

Un paso aparte de crear la tabla — si no se hace esto, no hay tiempo real aunque el resto esté
perfecto:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
```

(Equivalente a ir al dashboard → Database → Replication → activar el toggle de la tabla — pero
como SQL queda documentado y versionado junto con el resto del schema.)

Si se corre dos veces, tira un error de "ya está agregada" — es seguro ignorarlo.

---

## 4. Backend: dónde insertar las filas

**No dupliques la lógica de negocio.** Si ya tenés un punto único donde se dispara un email o se
loguea un evento, insertá la notificación ahí mismo, no en un lugar nuevo. Ejemplo (adaptado del
proyecto real):

```ts
async function crearNotificacion(
  supabase: SupabaseClient,
  usuarioId: string,
  titulo: string,
  mensaje: string,
  entidadId: string | null = null,
): Promise<void> {
  const { error } = await supabase.from('notificaciones').insert({
    usuario_id: usuarioId, entidad_id: entidadId, titulo, mensaje,
  })
  if (error) console.error('[crearNotificacion]', error.message)
}
```

Y se llama justo al lado de donde ya se manda el email correspondiente, con el `usuario_id` real
(no el email) de cada destinatario. Si "admin" puede ser más de una persona, insertar una fila por
cada `usuario_id` con ese rol, no una fila compartida.

**Implementación real:** `crearNotificacion()` / `crearNotificacionesAdmin()` en
`src/lib/notificaciones.ts`, llamadas desde las mismas funciones que ya mandaban los emails.

---

## 5. Frontend: el componente de la campanita

Estructura mínima (React, pero el patrón aplica a cualquier framework con estado + efectos):

```tsx
useEffect(() => {
  // 1. Carga inicial: traer las últimas N + el conteo de no leídas.
  cargarInicial()

  // 2. Suscripción en tiempo real, filtrada por el usuario actual.
  const channel = supabase
    .channel(`notificaciones-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${userId}` },
      (payload) => {
        setNotifs(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
      },
    )
    .subscribe()

  // 3. Limpieza: sin esto, cada montaje del componente deja una conexión de WebSocket colgada.
  return () => { supabase.removeChannel(channel) }
}, [userId])
```

Detalles que importan:
- **Usar el cliente de Supabase del browser (anon key)**, no el de servidor. El filtro de RLS es
  lo que da la seguridad, no el tipo de key.
- **El `filter` del canal es una optimización, no la seguridad real** — aunque no lo pongas, RLS
  igual va a bloquear filas ajenas. Pero conviene ponerlo: sin filtro, el cliente se suscribe a
  *todos* los inserts de la tabla (los que no le corresponden los descarta RLS del lado del
  servidor, pero es más tráfico innecesario).
- **Un canal por componente montado** — si la campanita vive en un layout/navbar que se re-renderiza
  en cada cambio de página (común en apps con varias páginas server-rendered, no un SPA puro), hay
  que asegurarse de que el `useEffect` no vuelva a crear el canal en cada navegación sin limpiar el
  anterior. La clave `[userId]` en el array de dependencias evita resuscribirse innecesariamente
  mientras el usuario no cambie.
- **⚠️ Gotcha real que rompió la app en la implementación de este proyecto:** si el mismo
  componente se monta **más de una vez al mismo tiempo** (típico en navbars responsive: una
  versión para desktop y otra para mobile, ocultas con CSS `hidden`/`md:hidden` pero **ambas
  montadas en React**), y las dos usan el mismo nombre de canal (ej. `notificaciones-${userId}`),
  la segunda instancia choca contra la primera que ya está suscripta:
  `Uncaught Error: cannot add postgres_changes callbacks for realtime:X after subscribe()` — y
  tira abajo el componente entero (y todo lo que esté dentro del mismo error boundary). El fix es
  darle a cada instancia un nombre de canal único con `useId()` de React:
  `` `notificaciones-${userId}-${useId()}` ``. Costó bastante diagnosticar la primera vez — vale la
  pena aplicar `useId()` desde el arranque, aunque hoy el componente no se monte dos veces, por si
  el layout cambia más adelante.
- **No hace falta sincronizar "marcado como leído" entre pestañas** salvo que el caso de uso lo
  pida — agrega complejidad (habría que escuchar también eventos `UPDATE`) que la mayoría de los
  proyectos no necesita.

**Implementación real:** `src/components/NotificacionesBell.tsx`.

---

## 6. Marcar como leída

Dos caminos válidos:
- **Directo desde el browser** con la policy de `UPDATE` de la sección 2 (más simple, menos código).
- **A través de un API route del backend** (más seguro/auditable, útil si el proyecto ya tiene la
  convención de que toda mutación del cliente pasa por el servidor). Es lo que se usó en la
  implementación real de este proyecto, por consistencia con el resto del código — no es
  obligatorio, es una decisión de estilo.

En cualquiera de los dos casos, actualizar el estado local de forma optimista (cambiar `leida` en
el array de React antes de esperar la respuesta) hace que se sienta instantáneo.

---

## 7. Checklist para replicar esto en otro proyecto

1. Crear la tabla de notificaciones (sección 1), adaptando qué campos hacen falta.
2. RLS de `SELECT` (obligatoria) y `UPDATE` (si vas a marcar como leída directo desde el browser).
3. `ALTER PUBLICATION supabase_realtime ADD TABLE ...` — no te olvides, es el paso que más se salta.
4. Insertar notificaciones desde el mismo lugar donde ya existe la lógica de negocio del evento
   (no crear un sistema paralelo).
5. Componente de campanita: carga inicial + suscripción + limpieza al desmontar.
6. Verificar en la práctica que **dos usuarios distintos, cada uno en su pestaña, solo ven lo
   suyo** — es el test que más rápido detecta una policy de RLS mal armada.

---

## 8. Variante: "hay cambios, actualizar" en vez de una lista de notificaciones

No siempre hace falta una campanita con historial — a veces alcanza con avisar que una pantalla
puntual (un detalle, una lista) quedó desactualizada y dejar que el usuario decida cuándo
refrescar. Mismo mecanismo de Realtime (sección 5), pero mucho más liviano: el componente no
guarda ningún dato, solo un booleano.

```tsx
function CambiosEnVivo({ suscripciones }: { suscripciones: { tabla: string; filtro: string }[] }) {
  const [hayCambios, setHayCambios] = useState(false)
  const instanceId = useId()

  useEffect(() => {
    const channels = suscripciones.map((s, i) =>
      supabase
        .channel(`cambios-${instanceId}-${i}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: s.tabla, filter: s.filtro }, () => setHayCambios(true))
        .subscribe()
    )
    return () => { channels.forEach(c => supabase.removeChannel(c)) }
  }, [instanceId, JSON.stringify(suscripciones)])

  if (!hayCambios) return null
  return (
    <div className="fixed bottom-5 right-5 ...">
      🔄 Hay cambios nuevos <button onClick={() => window.location.reload()}>Actualizar</button>
    </div>
  )
}
```

Por qué **no** recargar sola automáticamente: si la pantalla tiene un formulario a medio llenar
(el admin reasignando un horario, el técnico subiendo fotos), un reload sorpresivo le hace perder
lo que estaba haciendo. Dejar que decida cuándo es más seguro, cuesta lo mismo de implementar, y
sigue sintiéndose "vivo" sin el riesgo.

Diseñado para ser genérico y declarativo: un mismo componente sirve para "avisame si cambia esta
fila puntual" (`filtro: id=eq.${id}`) o "avisame si cambia cualquier fila que me pertenezca"
(`filtro: usuario_id=eq.${userId}`), y acepta varias tablas a la vez (útil cuando una pantalla
depende de más de una tabla — ej. el panel de un trabajador que necesita enterarse tanto de sus
tareas asignadas como de un cambio en su propio perfil/aprobación).

Cuándo usar cada variante:
- **Lista con historial + contador de no leídas** (secciones 1-6): cuando el usuario necesita
  repasar avisos que se perdió, no solo el más reciente.
- **Banner "hay cambios"** (esta sección): pantallas de detalle o listas donde lo único que
  importa es "esto ya no es lo que estás viendo", sin necesidad de guardar historial.
- **Refetch silencioso en el propio estado** (lo que se hizo en la lista paginada del cliente de
  este proyecto, `MisSolicitudes.tsx`): cuando el componente ya maneja su propio estado/paginado y
  conviene que se actualice solo, sin ni siquiera pedirle un click al usuario — válido cuando no
  hay riesgo de pisar un formulario a medio completar (una lista de solo lectura, por ejemplo).

**Implementación real:** `src/components/CambiosEnVivo.tsx`.

---

## Costo / cuándo NO usar esto

Realtime está pensado justo para "avisos puntuales tipo notificación", no para sincronizar toda una
UI compleja en vivo (listas grandes, tableros con muchas filas cambiando seguido). Para eso el
costo sube: hay que repensar cómo cada pantalla carga y actualiza sus datos, no solo agregar una
suscripción. Si la necesidad es "que se actualice todo solo", evaluar caso por caso qué pantallas
puntuales lo justifican, en vez de convertir toda la app de una.
