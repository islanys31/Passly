# 🚀 Instrucciones de Configuración Rápida (MODO DEMO)

Este proyecto ha sido estabilizado para una **Demostración de Emergencia**. Sigue estos pasos para tener el sistema funcionando en cualquier computadora en menos de 1 minuto.

## 📋 Requisitos Previos
*   **Node.js** instalado (versión 16 o superior).
*   **Git** instalado.

## 🛠️ Instalación en 3 Pasos

1.  **Instalar Dependencias**:
    Abre una terminal en la carpeta `backend` y ejecuta:
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno**:
    Copia el archivo `.env.example` y cámbiale el nombre a `.env`:
    *   *Nota: No necesitas configurar una base de datos real para la demo, los datos están inyectados en el código.*

3.  **Iniciar el Servidor**:
    En la carpeta `backend`, ejecuta:
    ```bash
    npm start
    ```

---

## 🪄 Cómo Acceder al Dashboard (SIN LOGIN)
Una vez el servidor esté corriendo, no necesitas escribir correos ni contraseñas. Usa este enlace directo:

👉 **[http://localhost:3000/api/magic](http://localhost:3000/api/magic)**

Este enlace hará lo siguiente:
*   Te autenticará como **Administrador**.
*   Configurará tu sesión automáticamente.
*   Te llevará al Dashboard con **312 entradas**, **125 usuarios** y **gráficas activas**.

## ☢️ Modo Demo Nuclear Activo
*   **Módulos Soportados**: Estadísticas, Usuarios, Hardware, Flota de Vehículos y Logs de Auditoría.
*   **Resiliencia**: Si la base de datos no está conectada o tiene errores, el sistema seguirá mostrando los datos de prueba perfectamente.

---
*Desarrollado con ❤️ para garantizar el éxito de tu presentación.*
