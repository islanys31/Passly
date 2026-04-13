/**
 * PASSLY - Generador de Manual de Usuario en Word (.docx)
 * Ejecutar: node generate_manual.js
 * Requiere: npm install docx
 */

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  ShadingType, convertInchesToTwip, Header, Footer, PageNumber, PageBreak
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ── CONFIGURACIÓN DE RUTAS ──────────────────────────────────────────────────
const IMG_DIR  = "C:\\Users\\Personal\\.gemini\\antigravity\\brain\\c4875efc-b21e-4bbd-b889-a9ad9dea7f85";
const OUT_FILE = path.join(__dirname, "MANUAL_DE_USUARIO_PASSLY.docx");

function loadImg(name) {
  const p = path.join(IMG_DIR, name);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

// ── PALETA DE COLORES ───────────────────────────────────────────────────────
const C = {
  green:  "1B8F5E",
  blue:   "2356D4",
  accent: "00C77F",
  gray:   "6B6B8A",
  text:   "1F1F2E",
  dark:   "2E2E40",
};

// ── BLOQUES DE CONSTRUCCIÓN ─────────────────────────────────────────────────

const h1 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, color: C.green, size: 40, font: "Calibri" })],
  spacing:  { before: 400, after: 200 },
  border:   { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.accent } },
});

const h2 = (text) => new Paragraph({
  children: [new TextRun({ text, bold: true, color: C.blue, size: 28, font: "Calibri" })],
  spacing:  { before: 320, after: 140 },
});

const p = (text) => new Paragraph({
  children: [new TextRun({ text, color: C.text, size: 22, font: "Calibri" })],
  spacing:  { after: 140 },
});

const bull = (text) => new Paragraph({
  children: [new TextRun({ text, color: C.text, size: 22, font: "Calibri" })],
  bullet:   { level: 0 },
  spacing:  { after: 80 },
});

const num = (text) => new Paragraph({
  children:  [new TextRun({ text, color: C.text, size: 22, font: "Calibri" })],
  numbering: { reference: "num-list", level: 0 },
  spacing:   { after: 100 },
});

const sp  = () => new Paragraph({ text: "", spacing: { after: 100 } });
const pb  = () => new Paragraph({ children: [new PageBreak()], spacing: { after: 0 } });

// Cuadros de aviso
function noteBox(label, body, borderColor, bgColor) {
  const cellBorder = { style: BorderStyle.NONE };
  const allBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
  return new Table({
    width:   { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 2,  color: borderColor },
      bottom:  { style: BorderStyle.SINGLE, size: 2,  color: borderColor },
      left:    { style: BorderStyle.SINGLE, size: 18, color: borderColor },
      right:   { style: BorderStyle.NONE },
      insideH: { style: BorderStyle.NONE },
      insideV: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading:  { fill: bgColor, type: ShadingType.CLEAR },
      margins:  { top: 80, bottom: 80, left: 160, right: 80 },
      borders:  allBorders,
      children: [
        new Paragraph({ children: [new TextRun({ text: label, bold: true, color: borderColor, size: 20, font: "Calibri" })], spacing: { after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: body,  italics: true, color: C.text,   size: 20, font: "Calibri" })], spacing: { after: 0  } }),
      ],
    })] })],
  });
}

const noteInfo  = (t) => noteBox("💡 NOTA",        t, "1B8F5E", "E8F5E9");
const noteWarn  = (t) => noteBox("⚠️ IMPORTANTE",  t, "E65100", "FFF8E1");
const noteCaut  = (t) => noteBox("🔒 SEGURIDAD",   t, "C62828", "FFEBEE");
const noteTip   = (t) => noteBox("ℹ️ CONSEJO",     t, "2356D4", "E3F2FD");

// Imagen con epígrafe
function imgBlock(data, w, h, caption) {
  const out = [];
  if (data) out.push(new Paragraph({
    children:  [new ImageRun({ data, transformation: { width: w, height: h } })],
    alignment: AlignmentType.CENTER,
    spacing:   { after: 60 },
    border: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      left:   { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
      right:  { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" },
    },
  }));
  if (caption) out.push(new Paragraph({
    children:  [new TextRun({ text: caption, italics: true, color: C.gray, size: 18, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing:   { after: 200 },
  }));
  return out;
}

// Tabla con cabecera verde
function tbl(headers, rows) {
  const nb = { style: BorderStyle.NONE };
  const sbW = { style: BorderStyle.SINGLE, size: 2, color: "FFFFFF" };
  const sbG = { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0" };

  const hRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading:  { fill: C.green, type: ShadingType.CLEAR },
      margins:  { top: 80, bottom: 80, left: 120, right: 120 },
      borders:  { top: sbW, bottom: sbW, left: sbW, right: sbW },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "FFFFFF", size: 20, font: "Calibri" })] })],
    })),
  });

  const dRows = rows.map((row, ri) => new TableRow({
    children: row.map(cell => new TableCell({
      shading:  { fill: ri % 2 === 0 ? "F0FFF4" : "FFFFFF", type: ShadingType.CLEAR },
      margins:  { top: 60, bottom: 60, left: 120, right: 120 },
      borders:  { top: sbG, bottom: sbG, left: sbG, right: sbG },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, color: C.text, font: "Calibri" })] })],
    })),
  }));

  return new Table({
    width:   { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 4, color: C.green },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: C.green },
      left:    { style: BorderStyle.SINGLE, size: 4, color: C.green },
      right:   { style: BorderStyle.SINGLE, size: 4, color: C.green },
      insideH: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0" },
      insideV: { style: BorderStyle.SINGLE, size: 2, color: "E0E0E0" },
    },
    rows: [hRow, ...dRows],
  });
}

// ── PORTADA ─────────────────────────────────────────────────────────────────
function cover() {
  return [
    new Paragraph({ text: "", spacing: { before: 1200, after: 0 } }),
    new Paragraph({
      children:  [new TextRun({ text: "PASSLY", bold: true, size: 120, color: C.green, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 80 },
    }),
    new Paragraph({
      children:  [new TextRun({ text: "Sistema de Control de Accesos Inteligente", size: 32, color: C.blue, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 720 },
    }),
    new Paragraph({
      children:  [new TextRun({ text: "MANUAL DE USUARIO", bold: true, size: 56, color: C.text, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 180 },
    }),
    new Paragraph({
      children:  [new TextRun({ text: "Versión 3.0.0  —  Cloud Edition  —  Abril 2026", size: 24, color: C.gray, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 1000 },
    }),
    tbl(["Campo", "Detalle"], [
      ["Versión",          "1.0"],
      ["Fecha",            "Abril 2026"],
      ["URL de producción","https://passly3106.vercel.app"],
      ["Soporte técnico",  "catira3132@mail.com"],
      ["Tecnologías",      "Node.js · Express · MySQL · Socket.IO · Docker"],
    ]),
    pb(),
  ];
}

// ── DOCUMENTO PRINCIPAL ──────────────────────────────────────────────────────
async function main() {
  console.log("Cargando imágenes...");
  const imgLanding   = loadImg("landing_page_retry_1776033238795.png");
  const imgLogin     = loadImg("login_modal_1776033277606.png");
  const imgRegister  = loadImg("passly_register_form_1776033657555.png");
  const imgDash      = loadImg("passly_dashboard_overview_1776033549670.png");
  const imgUsers     = loadImg("passly_users_management_1776033572591.png");
  const imgAccess    = loadImg("passly_access_log_1776033588647.png");
  const imgScanner   = loadImg("passly_qr_scanner_1776033600329.png");
  const imgAnalytics = loadImg("passly_analytics_1776033633102.png");

  const imgs = { imgLanding, imgLogin, imgRegister, imgDash, imgUsers, imgAccess, imgScanner, imgAnalytics };
  for (const [k, v] of Object.entries(imgs)) {
    console.log(`  ${k}: ${v ? "✅ cargada" : "⚠️ no encontrada"}`);
  }

  const children = [
    ...cover(),

    // ── 1. INTRODUCCIÓN ──
    h1("1. Introducción"),
    p("Passly es una plataforma web de gestión y control de accesos diseñada para unidades residenciales, edificios corporativos y cualquier espacio que requiera controlar quién entra y sale con precisión, seguridad y en tiempo real."),
    sp(),
    bull("Códigos QR personales y temporales para invitados con expiración automática."),
    bull("Monitoreo en tiempo real mediante WebSockets sin necesidad de recargar la página."),
    bull("Autenticación de dos factores (MFA/2FA) mediante TOTP para máxima seguridad."),
    bull("Reportes exportables en CSV y PDF con diseño profesional."),
    bull("Gestión completa de usuarios, dispositivos y registros de acceso."),
    bull("Gráficas y analíticas del flujo de personas por hora, día y semana."),
    pb(),

    // ── 2. ROLES ──
    h1("2. Roles del Sistema"),
    p("Passly define cuatro niveles de acceso. Cada rol determina qué módulos puede ver y usar cada usuario:"),
    sp(),
    tbl(["Rol", "Descripción", "Permisos Principales"], [
      ["🔴 Super Admin",   "Administrador global del sistema",  "Acceso total a todos los módulos y sedes"],
      ["🟠 Administrador", "Gestor de una sede o unidad",       "CRUD de usuarios, dispositivos, accesos y configuración"],
      ["🟢 Residente",     "Usuario regular / empleado",         "QR personal, historial propio, actualizar perfil"],
      ["🔵 Seguridad",     "Personal de vigilancia",            "Escáner QR, accesos manuales, historial de accesos"],
    ]),
    sp(),
    noteInfo("Al iniciar sesión, debe seleccionar el rol correspondiente a su cuenta. El sistema mostrará únicamente las opciones disponibles para ese rol."),
    pb(),

    // ── 3. ACCESO ──
    h1("3. Acceso a la Plataforma"),
    h2("3.1 Página de Inicio (Landing Page)"),
    p("Al ingresar a https://passly3106.vercel.app verá la página de aterrizaje con la barra de navegación, el botón \"Ingresar\" en la esquina superior derecha y las secciones informativas Inicio, Funciones, Nosotros y Contacto."),
    sp(),
    ...imgBlock(imgLanding, 560, 252, "Figura 1: Página de inicio de Passly (Landing Page)"),

    h2("3.2 Iniciar Sesión"),
    p("Haga clic en el botón \"Ingresar\" (esquina superior derecha). Aparecerá el modal de autenticación:"),
    sp(),
    ...imgBlock(imgLogin, 420, 336, "Figura 2: Modal de inicio de sesión"),
    num("Ingrese su Correo Corporativo registrado en el sistema."),
    num("Ingrese su Contraseña (mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos)."),
    num("Seleccione su Nivel de Autorización (rol) en el menú desplegable."),
    num("Presione el botón \"ENTRAR AL SISTEMA\"."),
    sp(),
    noteWarn("Tras 5 intentos fallidos consecutivos, el sistema bloquea temporalmente el acceso. Utilice el enlace \"¿Olvidó su contraseña?\" si olvida sus credenciales."),
    sp(),

    h2("3.3 Crear Cuenta (Registro)"),
    p("En el modal de autenticación, haga clic en \"Regístrate aquí\" para mostrar el formulario de creación de cuenta:"),
    sp(),
    ...imgBlock(imgRegister, 420, 380, "Figura 3: Formulario de registro de nueva cuenta"),
    num("Complete los campos: Nombre, Apellido, Email y Contraseña."),
    num("Seleccione su Rol en el menú desplegable."),
    num("Haga clic en \"REGISTRARME\"."),
    num("Recibirá un correo de bienvenida automáticamente con instrucciones de acceso."),
    sp(),
    noteTip("La contraseña debe tener entre 8 y 12 caracteres con al menos una mayúscula, una minúscula, un número y un carácter especial. Ejemplo válido: Passly@2025*"),
    sp(),

    h2("3.4 Verificación de Dos Factores (2FA / MFA)"),
    p("Si su cuenta tiene activado el segundo factor de autenticación, después de ingresar email y contraseña, el sistema solicita el código de 6 dígitos generado por su aplicación autenticadora (Google Authenticator, Authy o Microsoft Authenticator). El código cambia cada 30 segundos."),
    sp(),
    noteWarn("Los códigos TOTP cambian cada 30 segundos. Ingrese el código antes de que expire para no tener que generarlo nuevamente."),
    sp(),

    h2("3.5 Recuperación de Contraseña"),
    num("Haga clic en \"¿Olvidó su contraseña?\" en el modal de login."),
    num("Ingrese su correo electrónico registrado y haga clic en \"Enviar Código\"."),
    num("Recibirá un código de 6 dígitos en su email (válido por 15 minutos)."),
    num("Ingrese el código recibido y su nueva contraseña, luego haga clic en \"CAMBIAR CONTRASEÑA\"."),
    sp(),
    noteCaut("Solo se permiten 3 solicitudes de recuperación por hora. Si agota los intentos deberá esperar antes de volver a solicitar un código."),
    pb(),

    // ── 4. DASHBOARD ──
    h1("4. Panel de Control (Dashboard)"),
    p("Tras iniciar sesión exitosamente, accederá al Panel de Control. Este es el núcleo operativo de Passly, mostrando estadísticas en tiempo real y acceso rápido a todos los módulos del sistema."),
    sp(),
    ...imgBlock(imgDash, 560, 336, "Figura 4: Panel de control principal (Dashboard) con estadísticas en tiempo real"),

    h2("4.1 Barra Lateral (Sidebar)"),
    p("La barra lateral izquierda contiene el menú de navegación. Los módulos visibles dependen del rol:"),
    sp(),
    tbl(["Sección del Menú", "Administrador", "Residente", "Seguridad"], [
      ["📊 Vista General",   "✅", "✅", "✅"],
      ["👥 Usuarios",        "✅", "❌", "❌"],
      ["📱 Dispositivos",    "✅", "✅", "❌"],
      ["🔑 Accesos",         "✅", "✅", "✅"],
      ["📷 Escáner QR",      "✅", "❌", "✅"],
      ["📈 Analíticas",      "✅", "❌", "❌"],
      ["⚙️ Configuración",   "✅", "❌", "❌"],
    ]),
    sp(),

    h2("4.2 Estadísticas en Tiempo Real"),
    p("El dashboard principal muestra 4 tarjetas de estadísticas actualizadas automáticamente mediante WebSockets:"),
    bull("👥 Usuarios Activos — Total de cuentas activas registradas en el sistema."),
    bull("🔑 Accesos del Día — Total de entradas y salidas registradas en el día actual."),
    bull("📱 Dispositivos — Cantidad de vehículos y dispositivos activos vinculados."),
    bull("⚠️ Alertas — Número de alertas o anomalías de seguridad pendientes."),
    sp(),

    h2("4.3 Mi Llave QR Personal"),
    num("Localice la sección \"Mi Llave QR\" en el panel principal."),
    num("Haga clic en \"Generar\" para crear su código QR único."),
    num("Haga clic en \"Descargar\" para guardar el QR como imagen PNG."),
    num("Muestre este QR al personal de seguridad para registrar su entrada o salida."),
    sp(),
    noteInfo("El QR personal es permanente y está vinculado a su cuenta. No expira mientras su cuenta permanezca activa."),
    pb(),

    // ── 5. USUARIOS ──
    h1("5. Gestión de Usuarios"),
    noteCaut("Este módulo está disponible exclusivamente para los roles Administrador y Super Admin."),
    sp(),
    ...imgBlock(imgUsers, 560, 308, "Figura 5: Módulo de gestión de usuarios con tabla de datos y acciones"),

    h2("5.1 Ver Listado"),
    p("Haga clic en \"Usuarios\" en el menú lateral. La tabla muestra: foto de perfil, nombre completo, email, rol y estado. Use el campo de búsqueda para filtrar y la paginación para navegar entre páginas del listado."),

    h2("5.2 Crear Usuario"),
    num("Haga clic en \"+ Nuevo Usuario\"."),
    num("Complete: Nombre, Apellido, Email, Contraseña temporal y Rol."),
    num("Haga clic en \"Confirmar\"."),
    num("El usuario recibirá automáticamente un correo de bienvenida con sus credenciales."),
    sp(),

    h2("5.3 Editar Usuario"),
    num("Haga clic en el ícono ✏️ junto al usuario que desea modificar."),
    num("Actualice los campos necesarios en el modal."),
    num("Haga clic en \"Confirmar\" para guardar los cambios."),
    sp(),

    h2("5.4 Desactivar Usuario"),
    num("Haga clic en el ícono 🗑️ junto al usuario."),
    num("Confirme la acción en el diálogo de confirmación."),
    num("El usuario queda inactivo y no puede iniciar sesión. Sus datos se conservan íntegramente."),
    sp(),
    noteInfo("Passly usa Soft Delete: los usuarios desactivados conservan todo su historial de accesos para auditoría. No se pierde ningún dato."),
    pb(),

    // ── 6. DISPOSITIVOS ──
    h1("6. Gestión de Dispositivos"),
    p("Un dispositivo representa cualquier medio de transporte vinculado a un usuario: vehículo particular, motocicleta, bicicleta u otro."),

    h2("6.1 Ver Dispositivos"),
    p("Haga clic en \"Dispositivos\" en el menú lateral. La tabla muestra el identificador (placa/serial), tipo de transporte, usuario propietario y estado actual."),

    h2("6.2 Agregar Dispositivo"),
    num("Haga clic en \"+ Nuevo Dispositivo\"."),
    num("Complete: Identificador único (placa o serial), Tipo (Vehículo, Motocicleta, Bicicleta, Peatonal), Usuario propietario y Descripción opcional."),
    num("Haga clic en \"Confirmar\"."),

    h2("6.3 Editar Dispositivo"),
    num("Haga clic en el ícono ✏️ junto al dispositivo."),
    num("Actualice la información necesaria."),
    num("Guarde con \"Confirmar\"."),

    h2("6.4 Desactivar Dispositivo"),
    num("Haga clic en el ícono 🗑️ junto al dispositivo."),
    num("Confirme la desactivación. Los registros históricos de acceso del dispositivo se conservan."),
    pb(),

    // ── 7. ACCESOS ──
    h1("7. Control de Accesos"),
    p("El módulo de Accesos registra cada entrada y salida del recinto y permite exportar el historial completo en diferentes formatos."),
    sp(),
    ...imgBlock(imgAccess, 560, 308, "Figura 6: Historial de accesos con opciones de exportación CSV y PDF"),

    h2("7.1 Ver Historial"),
    p("Haga clic en \"Accesos\" en el menú lateral. La tabla muestra: nombre del usuario, tipo (Entrada/Salida), dispositivo, método (Manual o QR), fecha y hora exacta. Use los filtros de búsqueda y la paginación para navegar el historial eficientemente."),

    h2("7.2 Registrar Acceso Manual"),
    num("Haga clic en \"+ Registro Manual\"."),
    num("Seleccione: Usuario, Dispositivo (si aplica), Tipo (Entrada o Salida) y agregue Observaciones de ser necesario."),
    num("Haga clic en \"Confirmar\"."),
    num("El registro se guarda y todos los administradores conectados reciben una notificación automática en tiempo real."),

    h2("7.3 Invitar a un Huésped (QR Temporal)"),
    num("En \"Accesos\" → \"+ Registro Manual\" → pestaña \"Nuevo Invitado (QR)\"."),
    num("Complete: Nombre del invitado, Email del invitado y Duración de validez (4h / 24h / 3 días / 1 semana)."),
    num("Haga clic en \"Generar Invitación\"."),
    num("El sistema envía automáticamente un email al invitado con su código QR de acceso."),
    sp(),
    noteInfo("El QR de invitado se invalida automáticamente al vencer el tiempo seleccionado. El invitado solo muestra el QR del email al personal de seguridad."),
    sp(),

    h2("7.4 Exportar Registros"),
    tbl(["Botón", "Formato", "Uso sugerido"], [
      ["📊 CSV", "Archivo .csv (texto plano)", "Abrir con Excel, Google Sheets o LibreOffice Calc"],
      ["📄 PDF", "Documento .pdf formateado",  "Reporte profesional con logo corporativo y tablas"],
    ]),
    pb(),

    // ── 8. ESCÁNER QR ──
    h1("8. Escáner QR"),
    p("El Escáner QR permite al personal de seguridad registrar accesos rápidamente usando la cámara del dispositivo. Es la herramienta principal de validación de identidad en tiempo real."),
    sp(),
    ...imgBlock(imgScanner, 360, 460, "Figura 7: Escáner QR mostrando un acceso autorizado con foto del usuario"),
    noteCaut("Disponible para Administrador y Seguridad. Requiere permiso de cámara en el navegador y conexión HTTPS."),
    sp(),

    h2("8.1 Cómo Usar el Escáner"),
    num("Haga clic en \"📷 Escáner QR\" en el menú lateral."),
    num("El navegador solicitará permiso para acceder a la cámara. Haga clic en \"Permitir\"."),
    num("La cámara trasera se activará mostrando un cuadro de enfoque."),
    num("Pida al usuario que muestre su código QR (desde el dashboard o el email)."),
    num("Apunte la cámara al código QR; el sistema lo detecta automáticamente."),
    num("✅ Resultado exitoso: muestra la foto y nombre del usuario con la leyenda \"✓ Acceso Autorizado\" en verde."),
    num("❌ Resultado con error: aparece el mensaje específico del problema (QR inválido, expirado o usuario bloqueado)."),
    num("Haga clic en \"REINICIAR ESCÁNER\" para procesar al siguiente usuario."),
    sp(),

    h2("8.2 Mensajes de Error"),
    tbl(["Error mostrado", "Causa probable", "Solución recomendada"], [
      ["Permiso denegado",            "El navegador bloqueó el acceso a la cámara",   "Active el permiso en la configuración del navegador"],
      ["Hardware no encontrado",      "El dispositivo no tiene cámara disponible",     "Use un dispositivo con cámara integrada"],
      ["Se requiere conexión HTTPS",  "Accede a la app por HTTP en lugar de HTTPS",   "Use la URL oficial HTTPS de la plataforma"],
      ["QR inválido o expirado",      "El QR de invitado venció",                     "Solicite al administrador una nueva invitación"],
    ]),
    pb(),

    // ── 9. ANALÍTICAS ──
    h1("9. Analíticas Avanzadas"),
    noteCaut("Solo disponible para los roles Administrador y Super Admin."),
    sp(),
    p("La sección Analíticas ofrece reportes gráficos para comprender el comportamiento del flujo de accesos y tomar decisiones informadas sobre la seguridad del recinto."),
    sp(),
    ...imgBlock(imgAnalytics, 560, 350, "Figura 8: Analíticas avanzadas con gráficas de tendencias, medios de transporte y censos"),

    h2("9.1 Gráficas Disponibles"),
    tbl(["Gráfica", "Descripción y utilidad"], [
      ["📈 Tendencia Semanal",    "Línea comparativa de accesos totales de los últimos 7 días. Identifica patrones semanales."],
      ["🚗 Medios de Transporte", "Distribución porcentual por tipo: vehículo, motocicleta, bicicleta, peatonal."],
      ["👥 Censos por Rol",       "Cantidad total de usuarios activos clasificados por tipo de rol."],
      ["🕐 Picos por Hora",       "Identificación de los horarios de mayor tráfico en el recinto durante el día."],
    ]),
    pb(),

    // ── 10. PERFIL ──
    h1("10. Mi Perfil"),
    p("Acceda a su perfil personal haciendo clic en su nombre o avatar en la barra superior derecha del dashboard."),

    h2("10.1 Actualizar Datos Personales"),
    num("Haga clic en su nombre de usuario en la barra superior del dashboard."),
    num("Modifique los campos deseados: Nombre, Apellido o Email."),
    num("Presione \"Guardar Cambios\" para aplicar la actualización."),

    h2("10.2 Cambiar Foto de Perfil"),
    num("En el panel de perfil, haga clic en el avatar circular."),
    num("Seleccione una imagen desde su dispositivo (JPG o PNG)."),
    num("La foto se carga y actualiza de inmediato en toda la plataforma."),

    h2("10.3 Activar Autenticación de Dos Factores (MFA)"),
    num("Vaya a su Perfil y luego a la sección \"Seguridad\"."),
    num("Haga clic en \"Activar Autenticación de Dos Factores\"."),
    num("El sistema generará un código QR para vincular su cuenta con la app autenticadora."),
    num("Abra su app autenticadora (Google Authenticator, Authy o Microsoft Authenticator)."),
    num("Use la función \"Escanear código QR\" dentro de la app y apunte al QR en pantalla."),
    num("Ingrese el código de 6 dígitos para confirmar la vinculación exitosa."),
    num("Recibirá un correo de confirmación indicando que el 2FA fue activado."),
    sp(),
    noteCaut("¡Importante! Guarde sus códigos de respaldo en un lugar seguro. Si pierde acceso a su aplicación autenticadora y no tiene los códigos de respaldo, no podrá iniciar sesión."),
    pb(),

    // ── 11. CONFIGURACIÓN ──
    h1("11. Configuración del Sistema"),
    noteCaut("Solo disponible para el rol Administrador."),
    sp(),
    p("Desde \"Configuración\" el administrador puede definir ajustes globales que afectan a toda la sede:"),
    sp(),
    tbl(["Parámetro", "Descripción"], [
      ["Nombre de la sede",         "Nombre de la unidad o empresa visible en reportes y correos del sistema"],
      ["Logo corporativo",          "Imagen del logo que aparece en el encabezado del dashboard y documentos"],
      ["Tiempo de validez QR",      "Duración máxima permitida para los QR generados para invitados externos"],
      ["Política de auto-registro", "Define si los usuarios pueden crear cuentas libremente o requieren aprobación"],
    ]),
    sp(),
    p("Haga clic en \"Guardar Configuración\" para aplicar los cambios de inmediato a todos los usuarios de la sede."),
    pb(),

    // ── 12. NOTIFICACIONES ──
    h1("12. Notificaciones"),
    p("El ícono 🔔 en la barra superior del dashboard muestra notificaciones en tiempo real:"),
    bull("Acceso registrado — Se genera cuando alguien entra o sale del recinto."),
    bull("Nuevo usuario — Se genera al crear una cuenta en la plataforma."),
    bull("Alerta de seguridad — Intentos de login fallidos y activaciones de MFA."),
    bull("QR expirado — Notifica cuando un código de invitado vence su validez."),
    sp(),
    num("Haga clic en el ícono 🔔 para abrir el panel desplegable de notificaciones."),
    num("Haga clic en una notificación individual para marcarla como leída."),
    num("Haga clic en \"Limpiar\" para descartar todas las notificaciones del panel."),
    pb(),

    // ── 13. FAQ ──
    h1("13. Preguntas Frecuentes (FAQ)"),

    h2("¿Por qué no puedo iniciar sesión si mi contraseña es correcta?"),
    p("Verifique que está seleccionando el rol correcto en el menú desplegable. Si su cuenta fue creada como \"Residente\", no podrá ingresar seleccionando \"Administrador\". El rol debe coincidir exactamente con el asignado."),
    sp(),

    h2("¿Cuánto tiempo es válido mi código QR personal?"),
    p("El QR personal es permanente mientras su cuenta esté activa. Los QR de invitados tienen duración limitada (de 4 horas a 1 semana) según lo configurado por el administrador."),
    sp(),

    h2("No recibí el código de recuperación de contraseña."),
    num("Revise su carpeta de Spam o correo no deseado."),
    num("Verifique que escribió correctamente el email en el formulario."),
    num("Espere hasta 5 minutos ya que el envío puede demorar por el servidor de correo."),
    num("Si el problema persiste, contacte al administrador del sistema para asistencia directa."),
    sp(),

    h2("¿Qué hago si pierdo acceso a mi aplicación 2FA?"),
    p("Contacte al administrador de Passly para que deshabilite manualmente el 2FA de su cuenta. Una vez deshabilitado, podrá iniciar sesión solo con email y contraseña, y luego volver a configurar el 2FA."),
    sp(),

    h2("¿El sistema funciona en teléfonos y tabletas?"),
    p("Sí. Passly es 100% responsive y funciona en dispositivos móviles Android e iOS, tabletas de cualquier tamaño y computadoras de escritorio. El diseño se adapta automáticamente a cada tipo de pantalla."),
    sp(),

    h2("¿Por qué el escáner QR no funciona?"),
    bull("El navegador debe tener habilitado el permiso de acceso a la cámara."),
    bull("La conexión debe ser HTTPS; por seguridad del navegador no funciona por HTTP en producción."),
    bull("Debe haber buena iluminación para que la cámara detecte correctamente el código QR."),
    sp(),

    h2("¿Se eliminan datos al desactivar un usuario?"),
    p("No. El sistema usa Soft Delete: el usuario queda inactivo y no puede iniciar sesión, pero todos sus datos históricos y registros de acceso se conservan en la base de datos para fines de auditoría."),
    sp(),

    h2("¿Puedo exportar los registros en Excel?"),
    p("Sí. La opción \"📊 CSV\" del módulo de Accesos genera un archivo que puede abrirse directamente en Microsoft Excel, Google Sheets, LibreOffice Calc o cualquier programa de hojas de cálculo compatible."),
    pb(),

    // ── 14. GLOSARIO ──
    h1("14. Glosario de Términos"),
    tbl(["Término", "Definición"], [
      ["JWT",           "JSON Web Token. Mecanismo de autenticación que identifica al usuario de forma segura en cada petición al servidor."],
      ["MFA / 2FA",     "Autenticación Multi-Factor / Dos Factores. Segundo nivel de verificación que exige un código adicional a la contraseña."],
      ["TOTP",          "Time-based One-Time Password. Código temporal de 6 dígitos generado por una aplicación autenticadora cada 30 segundos."],
      ["QR",            "Quick Response Code. Código de barras 2D que almacena datos para validar accesos de forma rápida y sin contacto."],
      ["Soft Delete",   "Desactivación lógica de un registro sin eliminarlo físicamente. Los datos se conservan para auditoría permanente."],
      ["WebSocket",     "Protocolo de comunicación bidireccional en tiempo real entre servidor y navegador, sin necesidad de recargar la página."],
      ["Dashboard",     "Panel de control principal que centraliza estadísticas, gráficas y accesos a todos los módulos del sistema."],
      ["Glassmorphism", "Tendencia de diseño visual que simula vidrio esmerilado con transparencia, difuminado y bordes suaves."],
      ["Sede",          "Unidad residencial, edificio corporativo o espacio físico administrado mediante Passly."],
      ["CSV",           "Comma-Separated Values. Formato de archivo de texto plano compatible con programas de hojas de cálculo."],
      ["PDF",           "Portable Document Format. Formato estándar para reportes formales con diseño visual preservado."],
      ["CRUD",          "Create, Read, Update, Delete. Las cuatro operaciones básicas de gestión de datos en sistemas de información."],
    ]),
    sp(),

    // PIE FINAL
    new Paragraph({
      children: [new TextRun({ text: "─".repeat(60), color: C.gray, size: 16, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Manual de Usuario — PASSLY v3.0.0 (Cloud Edition)", italics: true, color: C.gray, size: 18, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Node.js · Express · MySQL · Socket.IO · Docker · Vercel · Render · Aiven", italics: true, color: C.gray, size: 16, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "© 2026 Passly — Todos los derechos reservados", italics: true, color: C.gray, size: 16, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
  ];

  // ── DOCUMENTO ──────────────────────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: [{
        reference: "num-list",
        levels: [{
          level:     0,
          format:    "decimal",
          text:      "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top:    convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left:   convertInchesToTwip(1.25),
            right:  convertInchesToTwip(1.25),
          },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "PASSLY ", bold: true, color: C.green, size: 18, font: "Calibri" }),
              new TextRun({ text: "— Manual de Usuario v3.0", color: C.gray, size: 18, font: "Calibri" }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "© 2026 Passly  |  Sistema de Control de Accesos  |  Página ", color: C.gray, size: 16, font: "Calibri" }),
              new TextRun({ children: [PageNumber.CURRENT], color: C.gray, size: 16 }),
              new TextRun({ text: " de ", color: C.gray, size: 16, font: "Calibri" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], color: C.gray, size: 16 }),
            ],
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
          })],
        }),
      },
      children,
    }],
  });

  console.log("\nGenerando documento Word...");
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT_FILE, buf);
  console.log(`\n✅ Manual generado exitosamente!`);
  console.log(`   Archivo: ${OUT_FILE}`);
  console.log(`   Tamaño:  ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(e => {
  console.error("❌ Error al generar el manual:", e.message);
  process.exit(1);
});
