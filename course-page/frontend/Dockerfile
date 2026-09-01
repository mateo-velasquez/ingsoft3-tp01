# ---- Etapa 1: build (imagen con Node) ----
FROM node:22-alpine AS build
WORKDIR /app

# Primero dolo los manifiestos
COPY frontend-lms/package*.json ./
RUN npm ci

# Ahora el código fuente del front.
COPY frontend-lms/ ./
RUN npm run build

# ---- Etapa 2: runtime  ----
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Fuera la página default de nginx.
RUN rm -rf ./*

# Vite emite en dist/.
COPY --from=build /app/dist .

# La config que hace el proxy de /api hacia el backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80