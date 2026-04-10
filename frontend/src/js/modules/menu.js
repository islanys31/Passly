/**
 * @file menu.js
 * @description Configuración centralizada de menús dinámicos por rol para Passly Pro.
 */

const adminConfig = [
  { "section": "OPERACIONES", "views": [
    { "id": "overview", "icon": "layout-dashboard", "text": "Resumen" },
    { "id": "usuarios", "icon": "users", "text": "Identidades" },
    { "id": "dispositivos", "icon": "monitor", "text": "Hardware" },
    { "id": "vehiculos", "icon": "truck", "text": "Flota" },
    { "id": "accesos", "icon": "lock", "text": "Logs Colectivos" }
  ]},
  { "section": "SEGURIDAD FÍSICA", "views": [
    { "id": "scanner", "icon": "qr-code", "text": "Terminal QR", "external": "scanner.html" }
  ]},
  { "section": "AJUSTES", "views": [
    { "id": "logs", "icon": "clipboard-list", "text": "Auditoría" },
    { "id": "perfil", "icon": "user-cog", "text": "Mi Perfil" },
    { "id": "security", "icon": "shield-check", "text": "Escudo 2FA" }
  ]}
];

const superAdminConfig = [
  { "section": "ADMINISTRACIÓN GLOBAL", "views": [
    { "id": "overview", "icon": "globe", "text": "Estado Global" },
    { "id": "sedes", "icon": "building-2", "text": "Gestión de Sedes" }
  ]},
  { "section": "VISIÓN DE SEDE SELECCIONADA", "views": [
    { "id": "usuarios", "icon": "users", "text": "Identidades" },
    { "id": "dispositivos", "icon": "monitor", "text": "Hardware" },
    { "id": "vehiculos", "icon": "truck", "text": "Flota" },
    { "id": "accesos", "icon": "lock", "text": "Historial" }
  ]},
  { "section": "SISTEMA", "views": [
    { "id": "logs", "icon": "clipboard-list", "text": "Auditoría Maestra" },
    { "id": "perfil", "icon": "user-cog", "text": "Mi Perfil" }
  ]}
];

const securityConfig = [
  { "section": "VIGILANCIA EN VIVO", "views": [
    { "id": "overview", "icon": "layout-dashboard", "text": "Resumen" },
    { "id": "accesos", "icon": "lock", "text": "Últimos Cruces" },
    { "id": "usuarios", "icon": "users", "text": "Identidades (Búsqueda)" }
  ]},
  { "section": "OPERACIONES", "views": [
    { "id": "scanner", "icon": "qr-code", "text": "Cámara Escáner", "external": "scanner.html" }
  ]}
];

const residentConfig = [
  { "section": "MI PANEL", "views": [
    { "id": "overview", "icon": "layout-dashboard", "text": "Resumen Personal" },
    { "id": "dispositivos", "icon": "monitor", "text": "Mis Equipos Tech" },
    { "id": "vehiculos", "icon": "truck", "text": "Mis Vehículos" },
    { "id": "accesos", "icon": "lock", "text": "Mi Historial" }
  ]},
  { "section": "IDENTIDAD", "views": [
    { "id": "perfil", "icon": "user-cog", "text": "Mi Perfil" },
    { "id": "security", "icon": "shield-check", "text": "Seguridad" }
  ]}
];

/**
 * Retorna la configuración de menú según el ID de rol.
 */
export function getMenuConfig(roleId) {
  switch (roleId) {
    case 4: return superAdminConfig;
    case 1: return adminConfig;
    case 3: return securityConfig;
    case 2: return residentConfig;
    default: return residentConfig;
  }
}
