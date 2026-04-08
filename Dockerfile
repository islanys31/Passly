# Dockerfile para despliegue en Render (Root Level)
FROM node:18-slim

# Directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY backend/package*.json ./

# Instalamos dependencias de producción
RUN npm install --omit=dev

# Copiamos el resto del código del backend
COPY backend/ .

# Exponemos el puerto que usa Passly
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "server.js"]
