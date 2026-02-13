# Usar imagen oficial de Node.js
FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema (incluye mysql-client para backups)
RUN apk add --no-initial-user --no-cache mysql-client

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código del backend
COPY --chown=node:node . .

# Usar usuario no privilegiado
USER node

# Exponer el puerto
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["npm", "start"]
