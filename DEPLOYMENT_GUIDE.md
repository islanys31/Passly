# 🚀 Guía de Despliegue Público Passly (Túnel Gratuito)

Esta guía te permitirá poner Passly en internet desde tu propia computadora de forma gratuita y sin usar tarjeta de crédito. Usaremos **Cloudflare Tunnel** como puente seguro.

---

## 🛠️ Paso 1: Crear el Túnel (Gratis)
1. Ve a [Cloudflare Zero Trust](https://one.dash.cloudflare.com/).
2. Regístrate con tu correo (es gratis).
3. En el menú izquierdo ve a: **Networks** -> **Tunnels**.
4. Haz clic en **Create a Tunnel**. Ponle de nombre "Passly-Home".
5. En la sección "Install connector", selecciona **Docker**.
6. Verás un comando largo. **Copia solo el token** (es la cadena larga de letras y números al final después de `--token`).

---

## ⚙️ Paso 2: Configurar Passly
1. Abre tu archivo `.env` en tu computadora.
2. Pega tu token en la línea:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=pega_aqui_tu_token
   ```
3. Guarda el archivo.

---

## 🌐 Paso 3: Configurar la URL Pública
1. En la misma página de Cloudflare donde creaste el túnel, haz clic en **Next**.
2. En **Public Hostname**, configura:
   - **Subdomain:** `passly` (o el nombre que quieras).
   - **Domain:** Selecciona un dominio si tienes uno, o usa el dominio gratuito que te ofrezca Cloudflare.
   - **Service:**
     - **Type:** `HTTP`
     - **URL:** `nginx:80` (Esto es muy importante).
3. Haz clic en **Save Tunnel**.

---

## 🚀 Paso 4: ¡Encender todo!
Abre una terminal en tu carpeta de Passly y ejecuta:
```bash
docker-compose up -d --build
```

---

## ✅ ¿Cómo saber si funcionó?
- Entra a la URL que configuraste en Cloudflare (ej: `https://passly.tu-dominio.com`).
- Verás Passly funcionando con el candadito de seguridad verde, ¡corriendo desde tu Docker local!

> [!TIP]
> **Ventaja 2FA:** Al usar Cloudflare, tienes protección contra ataques de bots e intentos de hackeo antes incluso de que lleguen a tu PC.
