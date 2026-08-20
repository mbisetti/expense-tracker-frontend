# Apps nativas (Capacitor) — estado y lo que falta

**S44 · Agosto 2026.** Este doc es el mapa de las apps de iOS y Android: qué está hecho, qué
está bloqueado y por qué, y el contrato exacto de lo que falta. Se escribió para que quien
retome esto (o Marko en tres meses) no tenga que redescubrir nada.

Decisión de fondo, ya tomada en `roadmap.md`: **Capacitor, no un rewrite nativo.** El front son
~24.000 líneas de React con 598 tests. Capacitor lo empaqueta entero y produce un `.aab` y un
`.ipa` de verdad, con plugins nativos. Un rewrite en Swift + Kotlin serían tres frontends para
mantener, y cada feature futura se pagaría tres veces.

---

## 1. Qué está hecho

| Pieza | Archivo | Qué hace |
|---|---|---|
| Capa de plataforma | `src/lib/platform.ts` | `isNative()` / `getPlatform()`. **Todo lo nativo entra detrás de este guard**: la web no cambió de comportamiento en nada. |
| Config | `capacitor.config.ts` | appId, splash, teclado, insets. `CapacitorHttp` apagado a propósito (§3). |
| Arranque nativo | `src/lib/nativeBootstrap.ts` | Splash, back de Android, estado de la app, red. Imports dinámicos: la web no carga un byte de Capacitor. |
| Botón atrás | `src/lib/nativeBack.ts` + `Modal.tsx`, campanita y menú de la persona | Pila LIFO. Con un modal, panel o menú abierto, el back lo cierra, no cierra la app. |
| Status bar | `src/lib/nativeChrome.ts` | Sigue el tema, enganchado en `useTheme`. |
| Conexión | `src/lib/onlineStatus.ts` | El `OfflineBanner` deja de creerle a `navigator.onLine`, que en iOS siempre dice que sí. |
| Safe areas | `src/index.css` (bloque S44) | `--safe-top` / `--safe-bottom`. Android 15+ fuerza edge-to-edge y Capacitor inyecta sus propias variables en vez de poblar `env()`. |
| Export | `src/lib/nativeShare.ts` | En el teléfono un `<a download>` no hace nada: el archivo va al cache y se abre la hoja de compartir. |
| API | `src/lib/http.ts` | La base es relativa en web (same-origin, S9) y absoluta en nativo. |
| appId | `scripts/set-app-id.mjs`, `scripts/check-app-id.mjs` | El id vive en **10 lugares**. Un script lo cambia, otro verifica que coincidan. |
| CI | `.github/workflows/native.yml` | APK de debug en cada push. iOS a mano (§6). |

### Compilar

```bash
npm run native:sync          # build de la web + copia a android/ e ios/
cd android && ./gradlew assembleDebug
```

En esta máquina no hay JDK ni Android SDK en Windows, pero **sí en WSL** (OpenJDK 21 +
`~/android-sdk`, instalado en S44). El APK se compila desde ahí, contra el proyecto que vive en
`/mnt/c/...`. iOS necesita una Mac: no hay vuelta (§6).

---

## 2. Lo que bloquea el NOMBRE

El appId por default es `app.manguitos.provisional` y **dice "provisional" a propósito**: es
imposible publicar sin darse cuenta. El package name de Google Play es **inmutable
post-publicación** (`roadmap.md`, riesgo #3), así que este es un cambio de una sola bala.

Cuando caiga la decisión:

```bash
npm run app:id -- com.elnombre.app
npx cap sync
npm run app:check-id
```

También dependen del nombre/dominio:

- El `custom_url_scheme` de Android, que es el que hace volver el OAuth de Google (§4).
- Los Universal Links de iOS y App Links de Android, que necesitan un dominio con
  `apple-app-site-association` y `assetlinks.json` servidos por HTTPS.
- `VITE_NATIVE_API_ORIGIN` en `.env.production`, que hoy apunta al dominio provisional de
  Railway.

---

## 3. El problema de verdad: el refresh token

**Esto es lo que hay que resolver antes de que la app sirva, y es trabajo de backend.**

Hoy la sesión funciona así (S25.1): el access token vive en memoria y viaja como `Bearer`; el
refresh token viaja en una **cookie httpOnly**, con rotación y detección de reuso.

En la web eso es correcto y no se toca. Adentro del WebView se cae:

- El origen de la app es `capacitor://localhost` (iOS) o `https://localhost` (Android). Contra
  `https://<dominio>/api/v1`, esa cookie es **de terceros**.
- El WKWebView de iOS las bloquea (ITP). Resultado: el login anda, y cuando el access token
  vence, la sesión muere. En Android puede llegar a andar con `SameSite=None; Secure`, pero no
  es algo sobre lo que construir.

### Por qué no se usa el atajo

El workaround típico es prender `CapacitorHttp`, que parchea el `fetch` global y saca las
requests por la capa nativa con el cookie jar del sistema. **Acá rompe más de lo que arregla:**
su `fetch` maneja mal `FormData` y `Blob`, y esta app depende de los dos — `httpUpload` sube el
`.xlsx` del import y el PDF del resumen, `httpBlob` baja los reportes del export (S26). Se
arreglaría el refresh a cambio de romper import y export. Queda apagado y anotado en
`capacitor.config.ts`.

### El contrato que falta

Refresh token en storage seguro del dispositivo (Keychain / Keystore) en vez de cookie, para
clientes nativos **y sólo para ellos**:

1. `POST /auth/login`, `/auth/register` y `/auth/google` aceptan un header `X-Client: native`.
   Con ese header, el refresh token vuelve **en el body** además de (o en vez de) la cookie.
2. `POST /auth/refresh` acepta el refresh token **en el body** cuando viene de un cliente
   nativo, y devuelve el nuevo par también en el body. La rotación y la detección de reuso que
   ya existen no cambian: cambia el transporte, no el modelo.
3. `POST /auth/logout` acepta el token en el body para revocar la familia.
4. CORS: agregar `capacitor://localhost` y `https://localhost` a los orígenes permitidos,
   **sin credenciales**. Los clientes nativos mandan el token por header y body, así que
   `Access-Control-Allow-Credentials` no hace falta para ellos — y no conviene: el origen
   `https://localhost` lo comparte **cualquier** app Capacitor de Android (y cualquier server
   local), así que no es un origen al que confiarle cookies.

Del lado del front, entonces: guardar el refresh token con un plugin de storage seguro (no
`@capacitor/preferences`, que **no está cifrado**) y enchufarlo en `refreshManager.ts`, que ya
tiene el single-flight resuelto.

**No se escribió nada de esto todavía**, a propósito: es código muerto hasta que exista el
endpoint, y código muerto que toca auth es peor que no tener nada.

---

## 4. Google Sign-In nativo

El "Continuar con Google" de hoy usa Google Identity Services por script web. **Google bloquea
OAuth dentro de webviews embebidos** (política anti-phishing), así que adentro de la app no va
a funcionar.

Lo que hace falta:

- Un plugin de Google Sign-In nativo (o el flujo de `@capacitor/browser` contra el browser del
  sistema + deep link de vuelta, que es lo que ya anticipaba `roadmap.md`).
- Un **client ID por plataforma**: uno de iOS y uno de Android. El de Android se registra con
  el **fingerprint SHA-1** del certificado de firma, y el de debug es distinto al de release:
  hay que cargar los dos.
- El backend tiene que aceptar ID tokens de **varias audiencias** (web + iOS + Android), no
  sólo la del cliente web.

Depende del NOMBRE, porque el deep link de vuelta depende del appId y del dominio.

---

## 5. Riesgo de review de Apple (guía 4.2)

Apple rechaza apps que son "sólo un sitio web empaquetado" (*minimum functionality*). Una app
de Capacitor **puede** pasar sin problema, pero tiene que ganarse el lugar con integraciones
nativas de verdad. Las que ya están (share sheet, status bar, back de Android, red del sistema)
son un piso, no un argumento.

Lo que más pesa a favor, en orden de valor para este producto:

1. **Notificaciones push** — ya hay 15 tipos de notificación modelados desde S34 y el canal
   push estaba anotado como pendiente. Es la integración nativa más natural y la que más
   servicio da.
2. **Bloqueo por biometría** al abrir la app. Es una app de plata; Face ID / huella es lo que
   la gente espera. Además destraba la deuda #9 de S34.
3. **Widget de pantalla de inicio** con el gasto del mes. Caro, pero es lo que ninguna web puede
   hacer.

El **lector de notificaciones de Android** (`NotificationListener` para capturar "Pagaste $X en
..." de MP y bancos) sigue siendo, como dice el roadmap, LA razón de producto de la app Android.
Es un plugin nativo propio: no existe listo. Y en iOS es imposible.

---

## 6. iOS necesita una Mac

No hay forma de compilar ni firmar un `.ipa` sin macOS. Las opciones:

| Opción | Costo | Sirve para |
|---|---|---|
| Runner macOS de GitHub Actions | Minutos a 10x en repos privados | Ya está escrito en `native.yml`, a mano. Compila **sin firmar**: valida que el proyecto y los 10 plugins compilen. |
| Una Mac prestada o alquilada | — | Todo, incluido subir a TestFlight |
| Servicio de build en la nube (Codemagic, Appflow) | Tiene tier gratis | Build firmado sin Mac propia |

Sin cuenta de Apple Developer (US$99/año) no se puede firmar ni subir a TestFlight, se tenga
Mac o no.

---

## 7. Checklist para publicar (nada de esto se puede hacer hoy)

- [ ] **NOMBRE decidido** — bloquea todo lo demás
- [ ] `npm run app:id -- <el.id.definitivo>` y `npm run app:check-id` en verde
- [ ] Cuenta Google Play (US$25, una vez) · cuenta Apple Developer (US$99/año)
- [ ] Cuentas personales nuevas de Play: **12 testers durante 14 días corridos** antes de poder
      publicar en producción. Es el plazo más largo de la lista: conviene arrancarlo primero.
- [ ] Refresh token nativo funcionando (§3) — sin esto la sesión se muere sola
- [ ] Google Sign-In nativo (§4)
- [ ] Al menos una integración nativa fuerte para la guía 4.2 (§5)
- [ ] Ícono y splash definitivos (los actuales derivan del favicon provisional del mango)
- [ ] Política de privacidad en un dominio propio (la piden las dos stores)
- [ ] Data safety de Play y privacy nutrition labels de Apple
- [ ] Keystore de release de Android **guardado donde no se pierda**: si se pierde, no se puede
      volver a publicar bajo el mismo package name nunca más
