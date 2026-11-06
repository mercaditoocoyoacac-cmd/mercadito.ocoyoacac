# Plan para convertir la app en nativa

Documento de trabajo. Fecha: 5 de noviembre de 2026.

## 1. Punto de partida

La app instalada hoy es una **WebView remota**: Capacitor carga
`https://mercadito-ocoyoacac.vercel.app` y el APK solo aporta cuatro cosas
(notificaciones push, geolocalización, hápticos y abrir enlaces externos). El
resto de la interfaz es la web de Next.js dentro de un navegador embebido.

Consecuencias prácticas de eso:

- Las descargas dependen de un WebView que no implementa descargas (el caso del
  Excel).
- La cámara, el escaneo, los mapas, el teclado, los gestos y el scroll no son
  nativos.
- No hay acceso offline real ni arranque instantáneo.
- La apariencia y el comportamiento cambian según la versión de Android System
  WebView del teléfono.
- Los errores del navegador se confunden con errores de la app.

Tamaño actual del producto:

| Elemento | Cantidad |
|---|---|
| Páginas Next.js | 67 |
| Endpoints API | 105 |
| Acciones de servidor (`"use server"`) | 8 archivos |
| Modelos Prisma | 30 |
| Líneas TypeScript/TSX | ~43,000 |
| Componentes de interfaz | 46 en `src/components/ui` |
| Variables de diseño (CSS) | 186 en `src/app/globals.css` |

**Aclaración importante:** "dejar de ser una WebView" no se logra cambiando una
bandera de Capacitor. Significa **escribir un cliente nuevo** que consuma la
misma API. Empaquetar el sitio con `next export` dentro del WebView sigue siendo
una WebView.

## 2. Alcance y orden de migración

### Decisiones tomadas

- **Android primero.** iOS se evalúa cuando el producto esté estable en Google
  Play. No se mantiene código exclusivo de iOS en esta etapa.
- **Solo Google Play.** Sin APK directo como canal oficial, para conservar
  actualizaciones firmadas y una sola fuente de instalación.
- **El vendedor es el primer rol que se migra, junto con el administrador.**
  La app nativa empieza atendiendo a quien opera el mercado: la tienda y la
  administración. Comprador y repartidor se migran después, sobre una base ya
  probada con datos reales.

### Roles y decisión

| Rol | Pantallas | Decisión | Fase |
|---|---|---|---|
| Vendedor | 19 | Nativo | 2 |
| Administrador | 21 | Nativo parcial | 2 |
| Comprador | 18 | Nativo | 3 y 5 |
| Repartidor | 6 | Nativo | 4 |
| Portales de cambio de rol | 3 | Nativo | 2 |

### Por qué el vendedor primero

Es el rol que usa el teléfono todo el día y el que valida el ciclo completo de
datos: publicar producto, recibir pedido, cambiar estado, cobrar y cerrar. Si esa
base funciona en nativo con datos reales, comprador y repartidor se construyen
sobre contratos ya probados. Además concentra el mayor dolor de la WebView actual:
cámara para fotos de producto, importación de listas, notificaciones de pedidos y
descarga de recibos.

### Alcance del administrador en nativo

No se migra el panel completo. Se migran las pantallas de operación diaria y el
resto se queda en la web, que es donde funciona bien una tabla densa con teclado
y pantalla grande.

Nativo en fase 2: aprobación de tiendas y documentos, pedidos, envíos y
asignación de repartidores, usuarios y roles, mensajes de soporte, productos.

Se quedan en web: informes y exportaciones, configuración de envíos, campañas,
cupones, membresías, ranking, publicidad y Mercado Pago. El enlace a esas
secciones abre la web en el navegador del sistema.

### Pantallas nativas por fase

Vendedor (fase 2): panel, pedidos, detalle de pedido, productos, alta y edición,
importación, promociones, cupones, recibos, membresía y pagos.

Administrador (fase 2): las pantallas de operación listadas arriba.

Comprador MVP (fase 3): inicio y catálogo, tiendas, tienda, producto, carrito,
checkout, mis pedidos y detalle de pedido.

Repartidor (fase 4): panel de envíos, detalle de envío, escaneo de código,
documentos, horarios, ubicación en segundo plano, chat con el cliente y
confirmación de entrega.

Comprador completo (fase 5): seguimiento, chat, notificaciones, perfil,
dispositivos, promociones, recibir pedido, alta, recuperación de contraseña y
eliminación de cuenta.

### Regla de convivencia

Mientras un rol no tenga paridad nativa, ese rol sigue usando la app actual. No
se retira la WebView hasta cumplir los criterios de la sección 9. Durante las
fases 2 a 4 conviven tres clientes: web de escritorio, WebView móvil y app
nativa.

## 3. Arquitectura propuesta

### Cliente

- **React Native con Expo** (última versión estable), TypeScript, Expo Router.
- **TanStack Query** para datos y caché; **Zustand** para estado local.
- **React Hook Form + Zod** para formularios y validación compartida con el
  servidor.
- **NativeWind** para estilos con tokens compartidos.
- **react-native-maps** con Google Maps.
- **expo-notifications** para push; **expo-secure-store** para tokens.
- **expo-file-system + expo-sharing** para descargar y compartir Excel/PDF
  (resuelve el problema actual de raíz).
- **expo-image-picker**, **expo-camera**, **expo-location**.
- **expo-web-browser** para pagos, informes y enlaces legales.
- **Sentry** para errores y **EAS Update** para correcciones de JavaScript sin
  publicar en la tienda.

### Repositorio

Mantener el repositorio actual y agregar dos carpetas, sin mover la web:

```
mercadito/
  src/                 web Next.js (sin cambios de estructura)
  prisma/              esquema y migraciones
  mobile/              app React Native (Expo)
  packages/shared/     tipos, esquemas Zod, cliente API, tokens de diseño
  pnpm-workspace.yaml
```

Ventaja: Vercel sigue desplegando la raíz y la app móvil se compila aparte. La
web y el móvil comparten contratos y tipos sin duplicarlos.

### Backend

Se reutiliza la misma API de Next.js, con una capa nueva:

```
/api/mobile/v1/...   endpoints para la app (Bearer token)
/api/admin/...       se mantiene (cookie)
/api/vendor/...      se mantiene (cookie)
/api/auth/...        se mantiene para la web
```

La lógica de negocio (Prisma, pagos, push, informes) no se duplica: se extrae a
`src/server/*` y la consumen ambos clientes.

## 4. Prerrequisitos obligatorios en el backend

Sin esto, la app nativa no se puede lanzar. Es también la fase P0 de seguridad
que quedó en pausa.

| # | Cambio | Motivo |
|---|---|---|
| 1 | Autenticación por tokens: access JWT de 15 min + refresh de 30 días con rotación y revocación | Las cookies de NextAuth no son un buen mecanismo para una app instalada |
| 2 | `requireUser`/`requireRole` aceptan cookie o `Authorization: Bearer` | Convivencia web y móvil |
| 3 | Tabla de sesiones móviles: `deviceId`, plataforma, versión, push token, último uso | Hoy la autorización de dispositivo usa hash de User-Agent + IP y no sirve en móvil |
| 4 | Reemplazar las 8 acciones de servidor por endpoints | El móvil no puede invocarlas |
| 5 | Contratos Zod compartidos y envelope único de errores | Evita divergencias entre web y móvil |
| 6 | Versionado `/v1`, paginación e `Idempotency-Key` en checkout y acciones de pedido | Reintentos por red móvil no deben duplicar pedidos |
| 7 | Push por dispositivo con plataforma y baja al cerrar sesión | Un teléfono por usuario, no un token global |
| 8 | Enlaces profundos verificados (`assetlinks.json`) | Abrir pedidos desde una notificación sin pasar por el navegador |
| 9 | Rate limiting real (las credenciales de Upstash no están configuradas en producción) | La API móvil queda expuesta |
| 10 | Verificación del webhook de Mercado Pago, checkout transaccional, `delivery/confirm` y transiciones de vendedor | La app actual ya tenía estos huecos; con más clientes, el riesgo crece |
| 11 | Rotar la contraseña de Neon y completar `WHATSAPP_APP_SECRET` | Credenciales pendientes |
| 12 | Captcha alternativo para móvil (Play Integrity o límite por dispositivo) | reCAPTCHA no aplica en React Native |

## 5. Fases y calendario

Estimación con **2 desarrolladores móviles**, 1 backend a medio tiempo y diseño
a demanda.

| Fase | Semanas | Entregable | Criterio de cierre |
|---|---|---|---|
| 0. Preparación | 3–4 | Repo móvil, tokens, CI, EAS, P0 de seguridad | Login móvil contra producción; build instalable en un teléfono |
| 1. Base | 3–4 | Navegación, design system nativo, cliente API, sesión, push, Sentry, tema claro/oscuro | App vacía con sesión persistente, push y errores reportados |
| 2. Vendedor y administrador | 7–10 | Panel de tienda, pedidos, productos, promociones, recibos; operación administrativa | Un vendedor y el administrador trabajan un día completo desde el teléfono |
| 3. Comprador MVP | 6–8 | Catálogo, tienda, producto, carrito, checkout, pedidos | Compra completa con pago real en sandbox y producción controlada |
| 4. Repartidor | 4–6 | Envíos, escaneo, ubicación en segundo plano, documentos, chat | Un repartidor real completa un turno sin la app web |
| 5. Comprador completo | 3–4 | Seguimiento, chat, promociones, notificaciones, perfil, dispositivos, cuenta | Paridad funcional con la web para el comprador |
| 6. Endurecimiento y publicación | 3–4 | Accesibilidad, rendimiento, offline, seguridad, ficha de Play | Publicación en Google Play |

Total: **29–40 semanas** con 2 personas. Primera entrega con valor real (fases 0
a 2): **13–18 semanas**, con el vendedor y el administrador usando la app nativa
en producción.

Al poner al vendedor primero, el comprador sigue en la WebView unas semanas más.
Es deliberado: la tienda valida antes los contratos, los estados de pedido y los
pagos, y el comprador recibe una app construida sobre esa base en lugar de
estrenarla.

## 6. Estrategia de migración

1. **API primero.** Todo lo que la app necesita debe existir como endpoint
   versionado antes de escribir la pantalla.
2. **Una pantalla, una entrega.** Cada pantalla nativa se prueba contra datos
   reales antes de pasar a la siguiente.
3. **Bandera por rol.** La app nueva consulta `/api/mobile/v1/config` y decide
   qué roles atiende (`vendor`, `admin`, `buyer`, `delivery`).
4. **Publicación escalonada.** Interna, luego cerrada (20–50 usuarios), luego
   producción al 10 %, 50 % y 100 %.
5. **Versión mínima soportada.** El servidor puede exigir actualización; sin
   esto, un cambio de API rompe teléfonos viejos.
6. **Retiro de la WebView.** Solo cuando el rol tenga paridad, sin pantallas
   remotas y con métricas estables durante dos semanas.

## 7. Qué se gana y qué se pierde

Se gana: rendimiento, arranque, gestos reales, cámara y escaneo, mapas fluidos,
descargas y compartición de archivos, ubicación en segundo plano confiable,
push más fiable, offline parcial, presencia en Google Play y actualizaciones
controladas.

Se pierde: despliegue instantáneo (salvo EAS Update), revisión de Google Play,
doble mantenimiento durante la transición, y la posibilidad de arreglar un
problema de interfaz con un `git push` en segundos.

## 8. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| La API actual mezcla cookies, acciones de servidor y lógica en páginas | Alto | Extraer lógica a `src/server`, contratos Zod, endpoints `/v1` |
| Pagos con redirección y 3DS | Alto | Checkout Pro en navegador seguro + retorno por enlace profundo; probar sandbox y casos de rechazo |
| Ubicación en segundo plano | Alto | Servicio en primer plano, declaración en Play Console, prueba de batería |
| Sin pruebas ni CI hoy | Alto | Vitest para lógica compartida, Maestro para flujos, CI en cada cambio |
| Equipo pequeño | Alto | Fases, no big bang; vendedor y administrador primero |
| Doble mantenimiento | Medio | API única, paquete compartido, regla de no duplicar reglas de negocio |
| El comprador sigue en WebView hasta la fase 3 | Medio | Push y enlaces profundos en la WebView actual; aviso de próxima versión nativa |
| Android antiguo (minSdk 24) | Medio | Pruebas en Android 7 y 8; evitar APIs nuevas sin respaldo |
| Firma del APK | Medio | Keystore creado en `android/mercadito.keystore` con credenciales en `android/keystore.properties` (fuera de git). Respaldarlo en un gestor de contraseñas; si se pierde, no se pueden publicar actualizaciones sin Play App Signing |
| Identificadores de paquete | Resuelto | Unificado en `com.mercadito.ocoyoacac.app.compras` (ya publicado en Play) en `capacitor.config.ts`, `build.gradle`, Java, iOS y `strings.xml` |

## 9. Criterios para decir "ya no es una WebView"

- Ninguna pantalla se carga desde una URL remota.
- `server.url` eliminado de `capacitor.config.ts` (o la app deja de usar
  Capacitor).
- `react-native-webview` solo en tres casos justificados: páginas legales, pago
  externo e informes del administrador.
- Catálogo y pedidos visibles sin conexión (caché).
- Arranque en frío menor a 2.5 s en un teléfono de gama media.
- 99.5 % de sesiones sin fallo.
- Accesibilidad: etiquetas, roles, objetivo táctil de 44 pt, contraste AA, texto
  escalable y TalkBack probado.
- Descarga de informes funciona sin salir de la app.

## 10. Alternativas evaluadas

| Opción | Ventajas | Riesgos | Veredicto |
|---|---|---|---|
| React Native + Expo | Reutiliza TypeScript, Zod, API y tokens; actualizaciones OTA; permite agregar iOS después | Ecosistema de módulos; requiere compilación nativa | **Recomendada** |
| Flutter | Interfaz muy consistente, buen rendimiento | Lenguaje nuevo, sin reutilización de tipos ni componentes | Alternativa si hay equipo Dart |
| Kotlin nativo | Máxima integración y rendimiento | Una app aparte, sin reutilización de la web ni de los tipos | Solo si se necesita hardware o SDK muy específico |
| Shell nativo con WebView por excepción | Rápido de arrancar | No resuelve el fondo; sigue dependiendo de la web | Solo como transición |

## 11. Costos de referencia

- Google Play: 25 USD una vez.
- EAS Build/Submit: 0 a 99 USD al mes según uso.
- Sentry, analítica y mapas: 0 a 100 USD al mes según volumen.
- Esfuerzo: 290–400 días-persona (2 móviles a tiempo completo y 1 backend a
  medio tiempo durante 29–40 semanas).

## 12. Primeros pasos concretos (2 semanas)

1. Respaldar el keystore de firma y sus credenciales, y enrolarlo en Play App
   Signing al crear la ficha.
2. Mantener fijo el identificador `com.mercadito.ocoyoacac.app.compras`; ya está
   publicado en Play y no se puede cambiar.
3. Crear `pnpm-workspace.yaml`, `mobile/` y `packages/shared/`.
4. Implementar tokens móviles en `src/server/auth` con rotación y revocación.
5. Adaptar `requireUser`/`requireRole` para aceptar `Authorization: Bearer`.
6. Crear `/api/mobile/v1/session`, `/config` y `/notifications/push-token`.
7. Extraer a `src/server` la lógica de productos, pedidos y tienda del vendedor.
8. Montar Expo con Expo Router, TanStack Query, tema claro/oscuro y Sentry.
9. Configurar EAS Build y un perfil de desarrollo instalable.
10. Configurar `assetlinks.json` y definir los tokens de diseño compartidos a
    partir de `globals.css`.

## 13. Decisiones pendientes

- ¿Quién es dueño de la cuenta de Google Play Console y con qué correo se
  registra?
- ¿Se conserva la app actual publicada mientras se publica la nueva, o se
  reemplaza la ficha?
- ¿Quién valida cada compilación antes de subirla a la pista interna?
- ¿Se retoma antes la fase P0 de seguridad? (Recomendado: sí, es prerrequisito.)
