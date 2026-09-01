# ingsoft3-tp01

Repositorio de Ingeniería de Software III. Contiene la aplicación **Course Page** —una plataforma de
cursos— y la documentación de los trabajos prácticos de la materia.

| | |
|---|---|
| Backend | Go + Gin + GORM |
| Frontend | React 19 + Vite 7, servido por nginx |
| Base de datos | MySQL 8 |

- [`decisiones.md`](decisiones.md) — decisiones tomadas y su justificación
- [`evidencias.md`](evidencias.md) — capturas y salidas de cada TP
- [`course-page/README.md`](course-page/README.md) — arranque en modo manual, sin Docker

---

## Levantar el sistema

Requisito único: **Docker** con Docker Compose.

```bash
git clone https://github.com/mateo-velasquez/ingsoft3-tp01.git
cd ingsoft3-tp01/course-page
cp .env.example .env
docker compose up -d
```

Son **dos** comandos, no uno: el `.env` no se versiona, así que hay que crearlo a partir de la
plantilla antes de levantar. Si te lo salteás, compose reemplaza las variables faltantes por vacío y
la base se niega a arrancar.

> En PowerShell, `cp .env.example .env` funciona igual (`cp` es alias de `Copy-Item`).

Editá el `.env` si querés cambiar la contraseña de la base. El valor que trae la plantilla es de
ejemplo.

### Verificar

```bash
docker compose ps          # esperá "healthy" en database
```

| Servicio | URL |
|---|---|
| Aplicación | http://localhost:3000 |
| API | http://localhost:8080 |
| Base de datos | localhost:3309 |

El primer arranque tarda unos minutos: construye las tres imágenes y la base ejecuta los scripts de
schema y datos de ejemplo. Las siguientes veces son segundos.

### Apagar

```bash
docker compose down       # apaga y conserva los datos
docker compose down -v    # apaga y borra el volumen de la base
```

---

## Levantar desde las imágenes publicadas

Las imágenes están en GitHub Container Registry, públicas. Esta variante las **descarga** en vez de
construirlas, así que no necesita el código fuente:

```bash
cp .env.example .env
docker compose -f docker-compose.registry.yml up -d
```

- `ghcr.io/mateo-velasquez/course-page-backend:v0.1.0`
- `ghcr.io/mateo-velasquez/course-page-frontend:v0.1.0`
- `ghcr.io/mateo-velasquez/course-page-database:v0.1.0`

---

## Estructura

```
course-page/
├── backend/                 Go + Gin — Dockerfile multi-stage
├── frontend/
│   ├── Dockerfile           multi-stage: build con Node, sirve nginx
│   ├── nginx.conf           estáticos + proxy /api hacia el backend
│   └── frontend-lms/        código React
├── database/                MySQL + scripts de schema y datos
├── docker-compose.yml       construye las imágenes desde el código
├── docker-compose.registry.yml   las descarga del registry
└── .env.example             plantilla de variables (el .env real no se versiona)
```
