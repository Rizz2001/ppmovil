---
name: mercantil-p2c-ui-verifier
description: Arquitectura técnica modular y escalable, y sistema de diseño UI (Clean Soft Dashboard en Azul Rey y Azul Cielo) para el verificador local de Pagos Móviles P2C del Banco Mercantil Venezuela. Úsalo siempre que se cree, edite, escale o mantenga la aplicación de verificación de pagos móviles en Node.js y su interfaz de usuario.
---
# Mercantil P2C UI Verifier

Guía obligatoria de arquitectura backend modular en Node.js nativo y sistema de diseño UI estilo "Clean Soft Dashboard" (Azul Rey y Azul Cielo) para la estación local de verificación de Pagos Móviles del Banco Mercantil Venezuela.

## 1. Estructura de Carpetas Ordenada y Escalable (Separación de Responsabilidades)

Prohibido crear archivos monolíticos gigantes o mezclar HTML/CSS/JS y lógica de negocio en un solo archivo. Todo el proyecto debe mantener estrictamente esta estructura modular para que sea fácil de escalar (agregar nuevos bancos, cierres de caja, reportes o múltiples terminales):

verificador-mercantil-catador/
├── .agent/
│   └── skills/
│       └── mercantil-p2c-ui-verifier/
│           └── SKILL.md            # Reglas de arquitectura y UI del proyecto
├── config/
│   ├── config.json                 # Credenciales reales (Ignorado en Git)
│   └── config.example.json         # Plantilla de ejemplo para el repositorio
├── data/
│   └── pagos_verificados.json      # Base de datos local anti-fraude (Ignorado en Git)
├── src/
│   ├── server.js                   # Punto de entrada HTTP y servidor de archivos estáticos
│   ├── routes/
│   │   └── api.routes.js           # Enrutador limpio para /api/verificar, /api/historial, /api/config
│   ├── services/
│   │   ├── mercantil.service.js    # Cliente HTTP hacia API Banco Mercantil + Modo Mock
│   │   └── storage.service.js      # Lectura/escritura segura en data/pagos_verificados.json
│   └── utils/
│       ├── crypto.util.js          # Algoritmo exclusivo AES-128-ECB + SHA-256 (16 bytes)
│       └── validator.util.js       # Normalización de teléfonos (58...), fechas y montos
├── public/
│   ├── index.html                  # Estructura HTML limpia del Clean Soft Dashboard
│   ├── css/
│   │   └── styles.css              # Variables CSS (Azul Rey / Azul Cielo), animaciones y scrollbars
│   └── js/
│       ├── app.js                  # Controlador principal, eventos de teclado (Enter) y foco
│       ├── api.client.js           # Peticiones fetch hacia el backend local
│       └── ui.components.js        # Renderizado de tarjetas, alertas, tabla, exportación CSV y sonidos
├── .clinerules                     # Reglas activas en la raíz del repositorio
├── .gitignore                      # Ignora config/config.json y data/pagos_verificados.json
└── Iniciar_Verificador.bat         # Lanzador de 1 clic para Windows (node src/server.js)

## 2. Reglas de Arquitectura Backend Local (Cero Dependencias Externas)

1. **Módulos Nativos Exclusivamente**:
   - Utilizar solo `node:http`, `node:fs`, `node:path` y `node:crypto`.
   - Prohibido requerir `npm install` o librerías externas para garantizar que corra en cualquier PC de caja sin configuraciones complejas.

2. **Seguridad de Credenciales (`config/config.json` y `.gitignore`)**:
   - Leer las credenciales desde `config/config.json`:
     - `MODO`: `"mock"` | `"sandbox"` | `"prod"` (iniciar en `"mock"` por defecto).
     - `CLIENT_ID`: Clave `X-IBM-Client-Id` del portal Mercantil.
     - `MERCHANT_ID`: Código numérico del comercio.
     - `SECRET_KEY`: Clave secreta de cifrado entregada por Mercantil.
     - `TELEFONO_EMPRESA`: Teléfono receptor afiliado a Tpago (ej. `"584140000000"`).
     - `PUERTO`: `3000`.
   - Mantener siempre `config/config.json` y `data/pagos_verificados.json` dentro de `.gitignore`.

3. **Algoritmo Exacto de Cifrado Banco Mercantil (`src/utils/crypto.util.js`)**:
   - El Banco Mercantil NO utiliza los 32 bytes completos del hash SHA-256.
   - Implementación obligatoria:
     - Calcular el hash `sha256` en binario (`digest()`) de `SECRET_KEY`.
     - Cortar y tomar ESTRICTAMENTE los primeros 16 bytes (`subarray(0, 16)`).
     - Cifrar usando `crypto.createCipheriv('aes-128-ecb', key16Bytes, null)` con `setAutoPadding(true)` y salida en `base64`.
   - En `src/utils/validator.util.js`, normalizar siempre los números telefónicos al formato `584XXXXXXXXX` (reemplazar el `0` inicial por `58` y limpiar caracteres no numéricos) antes de cifrarlos.

4. **Estructura del Payload Oficial (`src/services/mercantil.service.js`)**:
   - Sandbox URL: `https://apimbu.mercantilbanco.com/mercantil-banco/sandbox/v1/mobile-payment/search`
   - Producción URL: `https://apimbu.mercantilbanco.com/mercantil-banco/prod/v1/mobile-payment/search`
   - Cabecera obligatoria: `'X-IBM-Client-Id': CONFIG.CLIENT_ID`
   - Enviar en `search_by`: `amount` (decimal), `currency: "ves"`, `destination_mobile_number` (cifrado en Base64), `payment_reference` y `trx_date` (por defecto la fecha actual en `YYYY-MM-DD`).

5. **Control Local Anti-Fraude (`src/services/storage.service.js`)**:
   - Al recibir éxito en `transaction_list[0]`, extraer la referencia completa oficial de 12 dígitos (`payment_reference`).
   - Verificar si esa referencia completa ya existe en `data/pagos_verificados.json`:
     - Si YA EXISTE: Rechazar con HTTP `409` (`estado: "DUPLICADO"`), devolviendo la fecha y hora exacta en que ya fue aprobado ese pago anteriormente.
     - Si NO EXISTE: Guardarlo en `data/pagos_verificados.json` con fecha/hora local y devolver HTTP `200` (`estado: "APROBADO"`).
   - En `MODO: "mock"`: Si la referencia termina en `"0000"`, devolver 404 (no encontrado); para cualquier otra referencia, simular respuesta exitosa generando una referencia completa de 12 dígitos (`"005891" + referencia`) y validarla contra `data/pagos_verificados.json`.

## 3. Sistema de Diseño UI: Clean Soft Dashboard (Azul Rey + Azul Cielo)

Toda interfaz en `public/index.html`, `public/css/styles.css` y `public/js/ui.components.js` debe seguir este diseño Soft UI luminoso (prohibido usar fondos oscuros negros):

1. **Paleta de Colores Oficial**:
   - **Fondo Exterior (Canvas)**: Gris azulado suave `#E2E8F0` (`bg-slate-200`).
   - **Contenedor Principal del Dashboard**: Blanco humo limpio `#F8FAFC` con esquinas súper redondeadas (`rounded-[36px]`), sombra profunda (`shadow-2xl`) y borde blanco sutil.
   - **Azul Rey Principal**: `#1D4ED8` / `#2563EB` (`blue-700` / `blue-600`).
   - **Azul Rey Profundo (Textos y títulos)**: `#1E3A8A` / `#0F172A` (`blue-900` / `slate-900`).
   - **Azul Cielo Vibrante (Acentos, Hovers y Gradientes)**: `#38BDF8` / `#0EA5E9` (`sky-400` / `sky-500`).
   - **Fondo de Inputs**: Blanco puro `#FFFFFF` o azul hielo ultra sutil con bordes refinados y sombras de foco limpias.
   - **Tipografía**: `Plus Jakarta Sans` desde Google Fonts y Tailwind CSS vía CDN.

2. **Componentes del Dashboard**:
   - **Barra Lateral Izquierda Curva (Orgánica)**: Acoplada al margen izquierdo con bordes derechos muy redondeados (`rounded-r-[44px]`), en degradado vertical de Azul Rey a Azul Cielo (`bg-gradient-to-b from-blue-800 via-blue-600 to-sky-400`), íconos blancos y botón activo con fondo blanco redondeado (`bg-white text-blue-700 shadow-lg rounded-2xl`).
   - **Tarjetas Flotantes (Cards)**: Blancas puras (`#FFFFFF`), `rounded-3xl`, con sombras suaves azules (`shadow-[0_12px_35px_rgba(37,99,235,0.07)]`).
   - **Tarjeta Banner de Resumen Diario**: Tarjeta vertical destacada en degradado Azul Rey a Azul Cielo (`bg-gradient-to-br from-blue-700 via-blue-600 to-sky-400`), texto blanco, mostrando el Total en Bs. verificados hoy, cantidad de pagos y botón oscuro (`bg-slate-900 text-white rounded-full`) para exportar a CSV.

3. **Flujo Operativo Ultrarrápido (Solo Teclado con `Enter`)**:
   - No pedir nombre del cliente.
   - Solo 2 campos principales grandes:
     1. **Número de Referencia** (con `autofocus` permanente al cargar y tras cada consulta).
     2. **Monto en Bs.** (numérico con decimales).
   - Presionar `Enter` en cualquiera de los dos campos dispara la consulta inmediatamente.
   - **Tarjeta de Resultado Limpia y Elegante**:
     - **APROBADO**: Fondo verde esmeralda suave (`bg-emerald-50 border border-emerald-300`), título sobrio e impactante **`"Pago móvil aprobado - [Fecha y Hora]"`**, mostrando en grande el **Monto (`Bs. X.XXX,XX`)** y la **Referencia Completa Oficial (`12 dígitos`)**. Reproducir sonido corto de confirmación con Web Audio API, limpiar los inputs y devolver el foco (`focus()`) a Referencia.
     - **DUPLICADO**: Fondo ámbar (`bg-amber-50 border border-amber-300`), indicando que el pago ya fue utilizado junto con su fecha y hora original.
     - **NO ENCONTRADO**: Fondo rojo coral suave (`bg-rose-50 border border-rose-300`), indicando que no existe en Banco Mercantil.

## 4. Reglas Estrictas Anti-Clichés de IA (Diseño Profesional FinTech para Producción)

Queda terminantemente prohibido incluir elementos genéricos que delatan código generado por IA o prototipos de demostración. La aplicación debe verse y sentirse como un software bancario/financiero de nivel empresarial real (estilo Stripe, Revolut o Apple):

1. **CERO Botones de Depuración o "Chips Mock"**:
   - Prohibido renderizar en la interfaz botones de prueba como "✓ Éxito (589123)" o "✕ No encontrado (...0000)". En una aplicación de punto de venta real de un comercio, los cajeros no tienen botones tramposos en pantalla.
2. **CERO Botones Redundantes o Artificiales**:
   - Prohibido colocar botones de ayuda forzada como "[ESC] Foco", widgets de reloj con segundos y etiquetas explicativas obvias. El foco debe ser invisible, automático y reactivo mediante JavaScript, sin ensuciar la interfaz con botones innecesarios.
3. **CERO Tarjetas de Relleno Explicativo**:
   - Prohibido añadir cajas de texto genéricas que explican el funcionamiento del sistema (ej. "Control anti-fraude local: Cada referencia aprobada queda indexada..."). Un software profesional no incluye párrafos de tutorial o relleno de pantalla.
4. **CERO Badges Chillonas de Desarrollador**:
   - Prohibido llenar el encabezado con píldoras de depuración como `MODO: MOCK` o `BANCO MERCANTIL P2C` con animaciones parpadeantes de juguete (`animate-ping`). El encabezado debe ser sobrio, elegante y ejecutivo (ej. logotipo/marca "Catador" con subtítulo profesional y un indicador de estado minimalista y discreto).
5. **CERO Textos de Instrucción Evidentes**:
   - Prohibido incluir leyendas como "Presiona Enter para verificar" con etiquetas `<kbd>` que rompen la estética. La acción debe ser obvia y fluida con el botón principal "Verificar Pago".
6. **Estándar Visual de Alta Fidelidad**:
   - Composición limpia, espacios generosos, tipografía nítida en jerarquía visual perfecta, microinteracciones sutiles y balance estético de producto comercial final.
