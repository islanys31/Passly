/**
 * PASSLY - Generador de Manual de Usuario en Word (.docx)
 * Ejecutar: node generate_manual.cjs
 */

const {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  ShadingType, convertInchesToTwip, Header, Footer, PageNumber, PageBreak
} = require("docx");
const fs   = require("fs");
const path = require("path");

const IMG_DIR  = "C:\\Users\\Personal\\.gemini\\antigravity\\brain\\c4875efc-b21e-4bbd-b889-a9ad9dea7f85";
const OUT_FILE = path.join(__dirname, "MANUAL_DE_USUARIO_PASSLY.docx");

function loadImg(name) {
  const p = path.join(IMG_DIR, name);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

const C = {
  green:  "1B8F5E",
  blue:   "2356D4",
  accent: "00C77F",
  gray:   "6B6B8A",
  text:   "1F1F2E",
};

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

function noteBox(label, body, borderColor, bgColor) {
  const nb = { style: BorderStyle.NONE };
  return new Table({
    width:   { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 2,  color: borderColor },
      bottom:  { style: BorderStyle.SINGLE, size: 2,  color: borderColor },
      left:    { style: BorderStyle.SINGLE, size: 18, color: borderColor },
      right:   nb, insideH: nb, insideV: nb,
    },
    rows: [new TableRow({ children: [new TableCell({
      shading:  { fill: bgColor, type: ShadingType.CLEAR },
      margins:  { top: 80, bottom: 80, left: 160, right: 80 },
      borders:  { top: nb, bottom: nb, left: nb, right: nb },
      children: [
        new Paragraph({ children: [new TextRun({ text: label, bold: true, color: borderColor, size: 20, font: "Calibri" })], spacing: { after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: body,  italics: true, color: C.text, size: 20, font: "Calibri" })], spacing: { after: 0 } }),
      ],
    })] })],
  });
}

const noteInfo = (t) => noteBox("NOTA",       t, "1B8F5E", "E8F5E9");
const noteWarn = (t) => noteBox("IMPORTANTE", t, "E65100", "FFF8E1");
const noteCaut = (t) => noteBox("SEGURIDAD",  t, "C62828", "FFEBEE");
const noteTip  = (t) => noteBox("CONSEJO",    t, "2356D4", "E3F2FD");

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
      children:  [new TextRun({ text: "Version 3.0.0  -  Cloud Edition  -  Abril 2026", size: 24, color: C.gray, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing:   { after: 1000 },
    }),
    tbl(["Campo", "Detalle"], [
      ["Version",          "1.0"],
      ["Fecha",            "Abril 2026"],
      ["URL de produccion","https://passly3106.vercel.app"],
      ["Soporte tecnico",  "catira3132@mail.com"],
      ["Tecnologias",      "Node.js - Express - MySQL - Socket.IO - Docker"],
    ]),
    pb(),
  ];
}

async function main() {
  console.log("Cargando imagenes...");
  const imgLanding   = loadImg("landing_page_retry_1776033238795.png");
  const imgLogin     = loadImg("login_modal_1776033277606.png");
  const imgRegister  = loadImg("passly_register_form_1776033657555.png");
  const imgDash      = loadImg("passly_dashboard_overview_1776033549670.png");
  const imgUsers     = loadImg("passly_users_management_1776033572591.png");
  const imgAccess    = loadImg("passly_access_log_1776033588647.png");
  const imgScanner   = loadImg("passly_qr_scanner_1776033600329.png");
  const imgAnalytics = loadImg("passly_analytics_1776033633102.png");

  const all = { imgLanding, imgLogin, imgRegister, imgDash, imgUsers, imgAccess, imgScanner, imgAnalytics };
  for (const [k, v] of Object.entries(all)) console.log(`  ${k}: ${v ? "OK" : "NO ENCONTRADA"}`);

  const children = [
    ...cover(),

    // 1. INTRODUCCION
    h1("1. Introduccion"),
    p("Passly es una plataforma web de gestion y control de accesos disenada para unidades residenciales, edificios corporativos y cualquier espacio que requiera controlar quien entra y sale con precision, seguridad y en tiempo real."),
    sp(),
    bull("Codigos QR personales y temporales para invitados con expiracion automatica."),
    bull("Monitoreo en tiempo real mediante WebSockets sin necesidad de recargar la pagina."),
    bull("Autenticacion de dos factores (MFA/2FA) mediante TOTP para maxima seguridad."),
    bull("Reportes exportables en CSV y PDF con diseno profesional."),
    bull("Gestion completa de usuarios, dispositivos y registros de acceso."),
    bull("Graficas y analiticas del flujo de personas por hora, dia y semana."),
    pb(),

    // 2. ROLES
    h1("2. Roles del Sistema"),
    p("Passly define cuatro niveles de acceso. Cada rol determina que modulos puede ver y usar cada usuario:"),
    sp(),
    tbl(["Rol", "Descripcion", "Permisos Principales"], [
      ["Super Admin",   "Administrador global del sistema",  "Acceso total a todos los modulos y sedes"],
      ["Administrador", "Gestor de una sede o unidad",       "CRUD de usuarios, dispositivos, accesos y configuracion"],
      ["Residente",     "Usuario regular / empleado",         "QR personal, historial propio, actualizar perfil"],
      ["Seguridad",     "Personal de vigilancia",            "Escaner QR, accesos manuales, historial de accesos"],
    ]),
    sp(),
    noteInfo("Al iniciar sesion, debe seleccionar el rol correspondiente a su cuenta. El sistema mostrara unicamente las opciones disponibles para ese rol."),
    pb(),

    // 3. ACCESO
    h1("3. Acceso a la Plataforma"),
    h2("3.1 Pagina de Inicio (Landing Page)"),
    p("Al ingresar a https://passly3106.vercel.app vera la pagina de aterrizaje con la barra de navegacion, el boton 'Ingresar' en la esquina superior derecha y las secciones Inicio, Funciones, Nosotros y Contacto."),
    sp(),
    ...imgBlock(imgLanding, 560, 252, "Figura 1: Pagina de inicio de Passly (Landing Page)"),

    h2("3.2 Iniciar Sesion"),
    p("Haga clic en 'Ingresar' (esquina superior derecha). Aparecera el modal de autenticacion:"),
    sp(),
    ...imgBlock(imgLogin, 420, 336, "Figura 2: Modal de inicio de sesion"),
    num("Ingrese su Correo Corporativo registrado en el sistema."),
    num("Ingrese su Contrasena (minimo 8 caracteres con mayusculas, minusculas, numeros y simbolos)."),
    num("Seleccione su Nivel de Autorizacion (rol) en el menu desplegable."),
    num("Presione el boton 'ENTRAR AL SISTEMA'."),
    sp(),
    noteWarn("Tras 5 intentos fallidos consecutivos el sistema bloquea temporalmente el acceso. Use el enlace de recuperacion de contrasena si olvida sus credenciales."),
    sp(),

    h2("3.3 Crear Cuenta (Registro)"),
    p("En el modal, haga clic en 'Registrate aqui' para mostrar el formulario de creacion de cuenta:"),
    sp(),
    ...imgBlock(imgRegister, 420, 380, "Figura 3: Formulario de registro de nueva cuenta"),
    num("Complete los campos: Nombre, Apellido, Email y Contrasena."),
    num("Seleccione su Rol en el menu desplegable."),
    num("Haga clic en 'REGISTRARME'."),
    num("Recibira un correo de bienvenida automaticamente con instrucciones de acceso."),
    sp(),
    noteTip("La contrasena debe tener entre 8 y 12 caracteres con al menos una mayuscula, una minuscula, un numero y un caracter especial. Ejemplo: Passly@2025*"),
    sp(),

    h2("3.4 Verificacion de Dos Factores (2FA / MFA)"),
    p("Si su cuenta tiene activado el segundo factor, despues de ingresar email y contrasena, el sistema solicita el codigo de 6 digitos de su aplicacion autenticadora (Google Authenticator, Authy o Microsoft Authenticator). El codigo cambia cada 30 segundos."),
    sp(),
    noteWarn("Los codigos TOTP cambian cada 30 segundos. Ingrese el codigo antes de que expire."),
    sp(),

    h2("3.5 Recuperacion de Contrasena"),
    num("Haga clic en 'Olvido su contrasena?' en el modal de login."),
    num("Ingrese su correo electronico y haga clic en 'Enviar Codigo'."),
    num("Recibira un codigo de 6 digitos en su email (valido por 15 minutos)."),
    num("Ingrese el codigo y su nueva contrasena, luego haga clic en 'CAMBIAR CONTRASENA'."),
    sp(),
    noteCaut("Solo se permiten 3 solicitudes de recuperacion por hora por razones de seguridad."),
    pb(),

    // 4. DASHBOARD
    h1("4. Panel de Control (Dashboard)"),
    p("Tras iniciar sesion exitosamente, accedara al Panel de Control. Es el nucleo operativo de Passly con estadisticas en tiempo real y acceso a todos los modulos del sistema."),
    sp(),
    ...imgBlock(imgDash, 560, 336, "Figura 4: Panel de control principal (Dashboard) con estadisticas en tiempo real"),

    h2("4.1 Barra Lateral (Sidebar)"),
    p("La barra lateral izquierda contiene el menu de navegacion. Los modulos visibles dependen del rol:"),
    sp(),
    tbl(["Seccion del Menu", "Administrador", "Residente", "Seguridad"], [
      ["Vista General",   "SI", "SI", "SI"],
      ["Usuarios",        "SI", "NO", "NO"],
      ["Dispositivos",    "SI", "SI", "NO"],
      ["Accesos",         "SI", "SI", "SI"],
      ["Escaner QR",      "SI", "NO", "SI"],
      ["Analiticas",      "SI", "NO", "NO"],
      ["Configuracion",   "SI", "NO", "NO"],
    ]),
    sp(),

    h2("4.2 Estadisticas en Tiempo Real"),
    bull("Usuarios Activos - Total de cuentas activas en el sistema."),
    bull("Accesos del Dia - Total de entradas y salidas registradas hoy."),
    bull("Dispositivos - Cantidad de vehiculos y dispositivos activos vinculados."),
    bull("Alertas - Numero de alertas o anomalias de seguridad pendientes."),
    sp(),

    h2("4.3 Mi Llave QR Personal"),
    num("Localice la seccion 'Mi Llave QR' en el panel principal."),
    num("Haga clic en 'Generar' para crear su codigo QR unico."),
    num("Haga clic en 'Descargar' para guardar el QR como imagen PNG."),
    num("Muestre este QR al personal de seguridad para registrar su entrada o salida."),
    sp(),
    noteInfo("El QR personal es permanente y esta vinculado a su cuenta. No expira mientras su cuenta permanezca activa."),
    pb(),

    // 5. USUARIOS
    h1("5. Gestion de Usuarios"),
    noteCaut("Este modulo esta disponible exclusivamente para los roles Administrador y Super Admin."),
    sp(),
    ...imgBlock(imgUsers, 560, 308, "Figura 5: Modulo de gestion de usuarios con tabla de datos y acciones"),

    h2("5.1 Ver Listado"),
    p("Haga clic en 'Usuarios' en el menu lateral. La tabla muestra foto de perfil, nombre, email, rol y estado. Use el campo de busqueda para filtrar y la paginacion para navegar entre paginas."),

    h2("5.2 Crear Usuario"),
    num("Haga clic en '+ Nuevo Usuario'."),
    num("Complete: Nombre, Apellido, Email, Contrasena temporal y Rol."),
    num("Haga clic en 'Confirmar'."),
    num("El usuario recibira automaticamente un correo de bienvenida."),

    h2("5.3 Editar Usuario"),
    num("Haga clic en el icono de edicion (lapiz) junto al usuario."),
    num("Actualice los campos necesarios en el modal."),
    num("Haga clic en 'Confirmar' para guardar los cambios."),

    h2("5.4 Desactivar Usuario"),
    num("Haga clic en el icono de eliminacion (papelera) junto al usuario."),
    num("Confirme la accion en el dialogo de confirmacion."),
    num("El usuario queda inactivo y no puede iniciar sesion. Sus datos se conservan."),
    sp(),
    noteInfo("Passly usa Soft Delete: los usuarios desactivados conservan todo su historial de accesos para auditoria. No se pierde ningun dato."),
    pb(),

    // 6. DISPOSITIVOS
    h1("6. Gestion de Dispositivos"),
    p("Un dispositivo representa cualquier medio de transporte vinculado a un usuario: vehiculo particular, motocicleta, bicicleta u otro."),

    h2("6.1 Ver Dispositivos"),
    p("Haga clic en 'Dispositivos' en el menu lateral. La tabla muestra el identificador (placa/serial), tipo de transporte, usuario propietario y estado actual."),

    h2("6.2 Agregar Dispositivo"),
    num("Haga clic en '+ Nuevo Dispositivo'."),
    num("Complete: Identificador unico (placa o serial), Tipo (Vehiculo, Motocicleta, Bicicleta, Peatonal), Usuario propietario y Descripcion opcional."),
    num("Haga clic en 'Confirmar'."),

    h2("6.3 Editar Dispositivo"),
    num("Haga clic en el icono de edicion junto al dispositivo."),
    num("Actualice la informacion necesaria."),
    num("Guarde con 'Confirmar'."),

    h2("6.4 Desactivar Dispositivo"),
    num("Haga clic en el icono de eliminacion junto al dispositivo."),
    num("Confirme la desactivacion. Los registros historicos se conservan."),
    pb(),

    // 7. ACCESOS
    h1("7. Control de Accesos"),
    p("El modulo de Accesos registra cada entrada y salida del recinto y permite exportar el historial completo."),
    sp(),
    ...imgBlock(imgAccess, 560, 308, "Figura 6: Historial de accesos con opciones de exportacion CSV y PDF"),

    h2("7.1 Ver Historial"),
    p("Haga clic en 'Accesos' en el menu lateral. La tabla muestra: nombre del usuario, tipo (Entrada/Salida), dispositivo, metodo (Manual o QR), fecha y hora exacta. Use los filtros y la paginacion para navegar el historial."),

    h2("7.2 Registrar Acceso Manual"),
    num("Haga clic en '+ Registro Manual'."),
    num("Seleccione: Usuario, Dispositivo (si aplica), Tipo (Entrada o Salida) y Observaciones."),
    num("Haga clic en 'Confirmar'."),
    num("El registro se guarda y todos los administradores conectados reciben una notificacion en tiempo real."),

    h2("7.3 Invitar a un Huesped (QR Temporal)"),
    num("En 'Accesos' -> '+ Registro Manual' -> pestana 'Nuevo Invitado (QR)'."),
    num("Complete: Nombre del invitado, Email del invitado y Duracion de validez (4h / 24h / 3 dias / 1 semana)."),
    num("Haga clic en 'Generar Invitacion'."),
    num("El sistema envia automaticamente un email al invitado con su codigo QR de acceso."),
    sp(),
    noteInfo("El QR de invitado se invalida automaticamente al vencer el tiempo seleccionado."),

    h2("7.4 Exportar Registros"),
    tbl(["Boton", "Formato", "Uso sugerido"], [
      ["CSV", "Archivo .csv (texto plano)", "Abrir con Excel, Google Sheets o LibreOffice Calc"],
      ["PDF", "Documento .pdf formateado",  "Reporte profesional con logo corporativo y tablas"],
    ]),
    pb(),

    // 8. ESCANER QR
    h1("8. Escaner QR"),
    p("El Escaner QR permite al personal de seguridad registrar accesos usando la camara del dispositivo. Es la herramienta principal de validacion de identidad en tiempo real."),
    sp(),
    ...imgBlock(imgScanner, 360, 460, "Figura 7: Escaner QR mostrando un acceso autorizado con foto del usuario"),
    noteCaut("Disponible para Administrador y Seguridad. Requiere permiso de camara en el navegador y conexion HTTPS."),
    sp(),

    h2("8.1 Como Usar el Escaner"),
    num("Haga clic en 'Escaner QR' en el menu lateral."),
    num("El navegador solicitara permiso para acceder a la camara. Haga clic en 'Permitir'."),
    num("La camara trasera se activara mostrando un cuadro de enfoque."),
    num("Pida al usuario que muestre su codigo QR (desde el dashboard o el email)."),
    num("Apunte la camara al codigo QR; el sistema lo detecta automaticamente."),
    num("Resultado exitoso: muestra la foto y nombre con la leyenda 'Acceso Autorizado' en verde."),
    num("Resultado con error: muestra el mensaje especifico del problema."),
    num("Haga clic en 'REINICIAR ESCANER' para procesar al siguiente usuario."),
    sp(),

    h2("8.2 Mensajes de Error"),
    tbl(["Error mostrado", "Causa probable", "Solucion recomendada"], [
      ["Permiso denegado",           "El navegador bloqueo el acceso a la camara",  "Active el permiso en la configuracion del navegador"],
      ["Hardware no encontrado",     "El dispositivo no tiene camara disponible",   "Use un dispositivo con camara integrada"],
      ["Se requiere conexion HTTPS", "Accede por HTTP en lugar de HTTPS",           "Use la URL oficial HTTPS de la plataforma"],
      ["QR invalido o expirado",     "El QR de invitado vencio",                   "Solicite al administrador una nueva invitacion"],
    ]),
    pb(),

    // 9. ANALITICAS
    h1("9. Analiticas Avanzadas"),
    noteCaut("Solo disponible para los roles Administrador y Super Admin."),
    sp(),
    p("La seccion Analiticas ofrece reportes graficos para comprender el comportamiento del flujo de accesos y tomar decisiones informadas sobre la seguridad del recinto."),
    sp(),
    ...imgBlock(imgAnalytics, 560, 350, "Figura 8: Analiticas avanzadas con graficas de tendencias y distribucion"),

    h2("9.1 Graficas Disponibles"),
    tbl(["Grafica", "Descripcion y utilidad"], [
      ["Tendencia Semanal",    "Linea comparativa de accesos totales de los ultimos 7 dias. Identifica patrones."],
      ["Medios de Transporte", "Distribucion porcentual: vehiculo, motocicleta, bicicleta, peatonal."],
      ["Censos por Rol",       "Cantidad total de usuarios activos clasificados por tipo de rol."],
      ["Picos por Hora",       "Identificacion de horarios de mayor trafico en el recinto."],
    ]),
    pb(),

    // 10. PERFIL
    h1("10. Mi Perfil"),
    p("Acceda a su perfil personal haciendo clic en su nombre o avatar en la barra superior derecha del dashboard."),

    h2("10.1 Actualizar Datos Personales"),
    num("Haga clic en su nombre de usuario en la barra superior."),
    num("Modifique los campos deseados: Nombre, Apellido o Email."),
    num("Presione 'Guardar Cambios' para aplicar la actualizacion."),

    h2("10.2 Cambiar Foto de Perfil"),
    num("En el panel de perfil, haga clic en el avatar circular."),
    num("Seleccione una imagen desde su dispositivo (JPG o PNG)."),
    num("La foto se carga y actualiza de inmediato en toda la plataforma."),

    h2("10.3 Activar Autenticacion de Dos Factores (MFA)"),
    num("Vaya a su Perfil -> seccion 'Seguridad'."),
    num("Haga clic en 'Activar Autenticacion de Dos Factores'."),
    num("El sistema generara un codigo QR para vincular su cuenta con la app autenticadora."),
    num("Abra Google Authenticator, Authy o Microsoft Authenticator."),
    num("Use 'Escanear codigo QR' dentro de la app y apunte al QR en pantalla."),
    num("Ingrese el codigo de 6 digitos para confirmar la vinculacion exitosa."),
    num("Recibira un correo de confirmacion indicando que el 2FA fue activado."),
    sp(),
    noteCaut("Guarde sus codigos de respaldo (backup codes) en un lugar seguro. Si pierde acceso a su aplicacion autenticadora sin ellos, no podra iniciar sesion."),
    pb(),

    // 11. CONFIGURACION
    h1("11. Configuracion del Sistema"),
    noteCaut("Solo disponible para el rol Administrador."),
    sp(),
    tbl(["Parametro", "Descripcion"], [
      ["Nombre de la sede",         "Nombre de la unidad visible en reportes y correos del sistema"],
      ["Logo corporativo",          "Imagen del logo que aparece en el encabezado del dashboard"],
      ["Tiempo de validez QR",      "Duracion maxima permitida para los QR de invitados externos"],
      ["Politica de auto-registro", "Define si los usuarios pueden crear cuentas libremente"],
    ]),
    sp(),
    p("Haga clic en 'Guardar Configuracion' para aplicar los cambios de inmediato a todos los usuarios de la sede."),
    pb(),

    // 12. NOTIFICACIONES
    h1("12. Notificaciones"),
    p("El icono de campana en la barra superior muestra notificaciones en tiempo real:"),
    bull("Acceso registrado - Se genera cuando alguien entra o sale del recinto."),
    bull("Nuevo usuario - Se genera al crear una cuenta en la plataforma."),
    bull("Alerta de seguridad - Intentos de login fallidos y activaciones de MFA."),
    bull("QR expirado - Notifica cuando un codigo de invitado vence su validez."),
    sp(),
    num("Haga clic en el icono de campana para abrir el panel de notificaciones."),
    num("Haga clic en una notificacion individual para marcarla como leida."),
    num("Haga clic en 'Limpiar' para descartar todas las notificaciones."),
    pb(),

    // 13. FAQ
    h1("13. Preguntas Frecuentes (FAQ)"),

    h2("Por que no puedo iniciar sesion si mi contrasena es correcta?"),
    p("Verifique que esta seleccionando el rol correcto en el menu desplegable. Si su cuenta fue creada como 'Residente', no podra ingresar seleccionando 'Administrador'. El rol debe coincidir exactamente con el asignado."),
    sp(),

    h2("Cuanto tiempo es valido mi codigo QR personal?"),
    p("El QR personal es permanente mientras su cuenta este activa. Los QR de invitados tienen duracion limitada (de 4 horas a 1 semana) segun lo configurado por el administrador."),
    sp(),

    h2("No recibi el codigo de recuperacion de contrasena."),
    num("Revise su carpeta de Spam o correo no deseado."),
    num("Verifique que escribio correctamente el email en el formulario."),
    num("Espere hasta 5 minutos ya que el envio puede demorar."),
    num("Si el problema persiste, contacte al administrador del sistema."),
    sp(),

    h2("Que hago si pierdo acceso a mi aplicacion 2FA?"),
    p("Contacte al administrador de Passly para que deshabilite manualmente el 2FA de su cuenta. Una vez deshabilitado, podra iniciar sesion solo con email y contrasena."),
    sp(),

    h2("El sistema funciona en telefonos y tabletas?"),
    p("Si. Passly es 100% responsive y funciona en dispositivos moviles Android e iOS, tabletas y computadoras de escritorio. El diseno se adapta automaticamente a cada pantalla."),
    sp(),

    h2("Por que el escaner QR no funciona?"),
    bull("El navegador debe tener habilitado el permiso de acceso a la camara."),
    bull("La conexion debe ser HTTPS; no funciona por HTTP en produccion."),
    bull("Debe haber buena iluminacion para detectar el codigo QR correctamente."),
    sp(),

    h2("Se eliminan datos al desactivar un usuario?"),
    p("No. El sistema usa Soft Delete: el usuario queda inactivo pero todos sus datos historicos y registros de acceso se conservan en la base de datos para auditoria."),
    sp(),

    h2("Puedo exportar los registros en Excel?"),
    p("Si. La opcion CSV del modulo de Accesos genera un archivo que puede abrirse directamente en Microsoft Excel, Google Sheets o LibreOffice Calc."),
    pb(),

    // 14. GLOSARIO
    h1("14. Glosario de Terminos"),
    tbl(["Termino", "Definicion"], [
      ["JWT",           "JSON Web Token. Mecanismo de autenticacion que identifica al usuario de forma segura en cada peticion al servidor."],
      ["MFA / 2FA",     "Autenticacion Multi-Factor / Dos Factores. Segundo nivel de verificacion con codigo adicional."],
      ["TOTP",          "Time-based One-Time Password. Codigo temporal de 6 digitos generado por una app autenticadora cada 30 segundos."],
      ["QR",            "Quick Response Code. Codigo de barras 2D para validar accesos de forma rapida y sin contacto."],
      ["Soft Delete",   "Desactivacion logica sin eliminar fisicamente. Los datos se conservan para auditoria permanente."],
      ["WebSocket",     "Protocolo de comunicacion en tiempo real entre servidor y navegador sin necesidad de recargar la pagina."],
      ["Dashboard",     "Panel de control principal que centraliza estadisticas y acceso a todos los modulos del sistema."],
      ["Glassmorphism", "Diseno visual que simula vidrio esmerilado con transparencia, difuminado y bordes suaves."],
      ["Sede",          "Unidad residencial, edificio corporativo o espacio fisico administrado mediante Passly."],
      ["CSV",           "Comma-Separated Values. Formato de archivo de texto plano compatible con hojas de calculo."],
      ["PDF",           "Portable Document Format. Formato estandar para reportes formales con diseno preservado."],
      ["CRUD",          "Create, Read, Update, Delete. Las cuatro operaciones basicas de gestion de datos."],
    ]),
    sp(),
    new Paragraph({
      children: [new TextRun({ text: "Manual de Usuario - PASSLY v3.0.0 (Cloud Edition)", italics: true, color: C.gray, size: 18, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Node.js - Express - MySQL - Socket.IO - Docker - Vercel - Render - Aiven", italics: true, color: C.gray, size: 16, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "2026 Passly - Todos los derechos reservados", italics: true, color: C.gray, size: 16, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
  ];

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
              new TextRun({ text: "- Manual de Usuario v3.0", color: C.gray, size: 18, font: "Calibri" }),
            ],
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD" } },
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [
              new TextRun({ text: "2026 Passly  |  Sistema de Control de Accesos  |  Pagina ", color: C.gray, size: 16, font: "Calibri" }),
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
  console.log(`   Tamanio: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(e => {
  console.error("Error al generar el manual:", e.message);
  process.exit(1);
});
