@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   PASLLY - INSTALADOR AUTOMATICO (Setup)
echo ============================================================
echo.

echo [1/5] Verificando archivos de configuracion...
if not exist backend\.env (
    if exist backend\.env.example (
        copy backend\.env.example backend\.env
        echo    - Archivo .env creado desde .env.example
    ) else (
        echo    - ERROR: No se encuentra .env.example en la carpeta backend.
        pause
        exit /b 1
    )
) else (
    echo    - Archivo .env ya existe.
)

echo.
echo [2/5] Instalando dependencias del Backend...
cd backend
call npm install
if !errorlevel! neq 0 (
    echo    - ERROR en npm install de backend.
    pause
    exit /b 1
)

echo.
echo [3/5] Poblando Base de Datos (Seeding)...
echo Asegurate de que MySQL este corriendo y la DB 'passly' este creada.
call npm run seed
if !errorlevel! neq 0 (
    echo    - ADVERTENCIA: No se pudo poblar la DB. Verifica tu config en backend/.env
)

echo.
echo [4/5] Instalando dependencias del Frontend (Frontend)...
cd ..\frontend
if exist package.json (
    call npm install
)

echo.
echo [5/5] Finalizando...
echo ============================================================
echo   INSTALACION COMPLETADA
echo ============================================================
echo.
echo Para iniciar el sistema en modo desarrollo:
echo    cd backend
echo    npm run dev
echo.
echo Accede a: http://localhost:3000
echo.
pause
