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
| Base de datos | MySQL 8 | 3309 |

## Requisitos

- **Go 1.23 o superior** — `go version`
- **Node 20.19+ o 22.12+** (lo pide Vite 7) — `node --version`
- **MySQL 8**, ya sea como contenedor (opción A) o instalado localmente (opción B)

---

## 1. Base de datos

La carpeta `database/` trae el schema (`create_tables.sql`) y los datos de
ejemplo (`load_data.sql`).

### Opción A — como contenedor (recomendado)

No requiere instalar MySQL: el `Dockerfile` de `database/` ya siembra las dos
cosas al inicializarse.

```powershell
cd course-page
docker build -t course-db ./database
docker run -d --name mysql-tp2 --env-file .env -p 3309:3309 -v mysql_tp2_data:/var/lib/mysql course-db
```

La primera vez tarda hasta un minuto en crear las tablas y cargar los datos.
Esperá a que responda:

```powershell
docker exec mysql-tp2 mysqladmin ping -uroot -p<tu_password>
```

> El `-p 3309:3309` no es un typo: el `.env` define `MYSQL_TCP_PORT=3309`, que le
> cambia el puerto al servidor MySQL **dentro** del contenedor. Por eso los dos
> lados del mapeo son 3309.

Comandos útiles:

```powershell
docker stop mysql-tp2             # apagar (los datos quedan)
docker start mysql-tp2            # volver a prender
docker rm -f mysql-tp2            # borrar el contenedor
docker volume rm mysql_tp2_data   # borrar también los datos
```

### Opción B — MySQL instalado localmente

Si preferís no usar Docker en ningún punto, con un MySQL 8 propio escuchando en
el puerto 3309:

```sql
CREATE DATABASE course_page;
```

Y después cargá los dos scripts, en este orden:

```powershell
mysql -u root -p -P 3309 course_page < database/create_tables.sql
mysql -u root -p -P 3309 course_page < database/load_data.sql
```

> Si tu MySQL escucha en el 3306 (el default), usá ese puerto acá y ajustá
> `DB_PORT` en el paso 2.

---

## 2. Configurar el backend

Creá el archivo **`backend/.env`** (git lo ignora, no se commitea):

```
DB_NAME=course_page
DB_USER=root
DB_PASS=<la contraseña que pusiste en course-page/.env>
DB_HOST=localhost
DB_PORT=3309
```

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
| `No .env file found` seguido de `Access denied for user ''` | Falta `backend/.env`, o lo creaste en otra carpeta. Sin variables, el usuario y la contraseña viajan vacíos |
| `Connection Failed to Open` / `connection refused` | La base todavía no terminó de inicializar, o está apagada. Verificá con el `ping` del paso 1 |
| `Error 1049: Unknown database 'course_page'` | La base existe pero sin el schema: faltó correr `create_tables.sql` |
| El front carga pero sin cursos | El backend no está levantado, o quedó en otro puerto |
| `port is already allocated` al crear el contenedor | Ya tenés algo en el 3309. `docker rm -f mysql-tp2` o cambiá el puerto publicado |
| `npm ci can only install packages when...` | El `package-lock.json` quedó desincronizado. Corré `npm install` y commiteá el lockfile |
