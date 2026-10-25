# Course Page — arranque en modo manual (sin Docker Compose)

Guía para levantar la aplicación corriendo cada servicio de forma nativa en tu
máquina. Es el modo de desarrollo: útil para trabajar en el código, para depurar
y para entender qué hace cada pieza antes de contenerizarla.

> Para levantar todo el sistema con un solo comando, ver el arranque con
> `docker compose` en el README de la raíz del repositorio.

## Stack

| Servicio | Tecnología | Puerto |
|---|---|---|
| Backend | Go + Gin + GORM | 8080 |
| Frontend | React 19 + Vite 7 | 5173 |
| Base de datos | PostgreSQL 17 | 5432 |

## Requisitos

- **Go 1.23 o superior** — `go version`
- **Node 20.19+ o 22.12+** (lo pide Vite 7) — `node --version`
- **PostgreSQL 17**, ya sea como contenedor (opción A) o instalado localmente (opción B)

---

## 1. Base de datos

La carpeta `database/` trae el schema (`create_tables.sql`) y los datos de
ejemplo (`load_data.sql`).

### Opción A — como contenedor (recomendado)

No requiere instalar PostgreSQL: el `Dockerfile` de `database/` ya siembra las
dos cosas al inicializarse.

```powershell
cd course-page
docker build -t course-db ./database
docker run -d --name postgres-tp2 --env-file .env -p 5432:5432 -v postgres_tp2_data:/var/lib/postgresql/data course-db
```

La primera vez tarda unos segundos en crear las tablas y cargar los datos.
Esperá a que responda:

```powershell
docker exec postgres-tp2 pg_isready -h 127.0.0.1 -U postgres
```

Comandos útiles:

```powershell
docker stop postgres-tp2             # apagar (los datos quedan)
docker start postgres-tp2            # volver a prender
docker rm -f postgres-tp2            # borrar el contenedor
docker volume rm postgres_tp2_data   # borrar también los datos
```

### Opción B — PostgreSQL instalado localmente

Si preferís no usar Docker en ningún punto, con un PostgreSQL 17 propio
escuchando en el puerto 5432:

```sql
CREATE DATABASE course_page;
```

Y después cargá los dos scripts, en este orden:

```powershell
psql -U postgres -p 5432 -d course_page -f database/create_tables.sql
psql -U postgres -p 5432 -d course_page -f database/load_data.sql
```

> El schema lo crea `create_tables.sql`, no el `AutoMigrate` del backend: es el
> que define las PK autoincrementales y los triggers. Para Neon es el mismo
> script, pegado en el SQL Editor.

---

## 2. Configurar el backend

Creá el archivo **`backend/.env`** (git lo ignora, no se commitea):

```
DB_NAME=course_page
DB_USER=postgres
DB_PASS=<la contraseña que pusiste en course-page/.env>
DB_HOST=localhost
DB_PORT=5432
DB_SSLMODE=disable
```

> `DB_SSLMODE` vale `disable` en local (y es el default si no está). Contra Neon
> va `require`, porque Neon sólo acepta conexiones con TLS.

> ⚠️ **Este archivo va en `backend/`, no en `course-page/`.** El código hace
> `godotenv.Load()` sin ruta, así que busca el `.env` en el directorio desde el
> que ejecutás el programa.
>
> ⚠️ **`DB_HOST=localhost`, no `database`.** El `course-page/.env` usa
> `DB_HOST=database` porque ése es el nombre del servicio en la red de
> `docker compose`, y ese nombre no resuelve fuera de esa red.

---

## 3. Backend — terminal 1

```powershell
cd course-page\backend
go mod init project    # solo la primera vez
go mod tidy            # solo la primera vez
go run .
```

> El módulo tiene que llamarse **`project`**: los imports del código son
> `project/app` y `project/db`.

Tiene que loguear `Connection Established` y después `Starting server`.
Queda escuchando en **http://localhost:8080**.

---

## 4. Frontend — terminal 2

```powershell
cd course-page\frontend\frontend-lms
npm install
npm run dev
```

Queda en **http://localhost:5173**.

---

## 5. Verificar

```powershell
curl.exe -s http://localhost:8080/courses
curl.exe -s "http://localhost:8080/course/search?q=Cocina"
```

Y en el navegador, `http://localhost:5173`: se tienen que ver los cursos
traídos desde la base.

En modo manual el navegador le pega directo al backend en el puerto 8080. Eso
funciona porque `app/router.go` habilita CORS para `http://localhost:5173`.

---

## Problemas frecuentes

| Síntoma | Causa |
|---|---|
| `No .env file found` seguido de `password authentication failed` | Falta `backend/.env`, o lo creaste en otra carpeta. Sin variables, el usuario y la contraseña viajan vacíos |
| `Connection Failed to Open` / `connection refused` | La base todavía no terminó de inicializar, o está apagada. Verificá con el `pg_isready` del paso 1 |
| `database "course_page" does not exist` | Falta crear la base (`CREATE DATABASE course_page;`) |
| `relation "courses" does not exist` | La base existe pero sin el schema: faltó correr `create_tables.sql` |
| El front carga pero sin cursos | El backend no está levantado, o quedó en otro puerto |
| `port is already allocated` al crear el contenedor | Ya tenés algo en el 5432 (por ejemplo un PostgreSQL instalado). `docker rm -f postgres-tp2` o cambiá el puerto publicado |
| `npm ci can only install packages when...` | El `package-lock.json` quedó desincronizado. Corré `npm install` y commiteá el lockfile |
