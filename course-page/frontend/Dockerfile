# ---- Etapa 1: build (imagen con Node) ----
FROM node:22-alpine AS build
WORKDIR /app

# Primero dolo los manifiestos
COPY frontend-lms/package*.json ./
RUN npm ci

# Ahora el código fuente del front.
COPY frontend-lms/ ./
RUN npm run build

# ---- Etapa 2: tests (parte del build: ya tiene Node y las dependencias) ----
FROM build AS test
ENTRYPOINT ["npm", "run", "test:ci"]

# ---- Etapa 3: runtime  ----
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Fuera la página default de nginx.
RUN rm -rf ./*

# Vite emite en dist/.
COPY --from=build /app/dist .

# La plantilla que hace el proxy de /api hacia el backend. Va en templates/ y no en
# conf.d/: nginx leería conf.d/ tal cual, con los ${…} sin reemplazar, y no arrancaría.
COPY default.conf.template /etc/nginx/templates/default.conf.template

# Valores por defecto = los de compose. Render los pisa con las variables del servicio.
ENV PORT=80 \
    BACKEND_URL=http://backend:8080 \
    DNS_RESOLVER=127.0.0.11

EXPOSE 80