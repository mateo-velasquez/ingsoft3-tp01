# Decisiones — TP1

## 1. Por qué Git no pudo resolver el conflicto solo

Las dos ramas salieron del mismo commit y las dos cambiaron la misma línea del README: una la dejó
como `# ingsoft3-tp01 - versión A` y la otra como `# ingsoft3-tp01 - versión B`. Como mergeé primero
la A, cuando llegó la B esa línea ya no coincidía.

Git no puede saber si la versión B reemplaza a la A o la corrige, porque eso depende de para qué se
hizo el cambio y no está escrito en ningún lado. Si eligiera solo estaría adivinando, y si adivina
mal borra el trabajo de alguien sin avisar. Por eso frena, marca el archivo y deja que decida una
persona. El resto del README no dio conflicto porque ninguna de las dos ramas lo tocó.

Para que nunca hubiera aparecido, la rama B tendría que haber salido de main después de mergear la
A, o haber tocado otra línea. Es lo mismo que dice la guía sobre las ramas cortas: integrar seguido
no elimina los conflictos, pero los deja chicos.

Aclaración: terminé eligiendo la versión A, así que el merge quedó igual a lo que ya estaba en main
y el commit del PR #3 no cambió ninguna línea. El conflicto pasó igual y se ve en la página del PR.

## 2. Problemas que encontré y cómo los solucioné

Casi todos fueron los que la guía ya avisa: el push directo rechazado, el conflicto fabricado a
propósito y Vim abriéndose al hacer `git commit` sin `-m`.

El único que casi me complica fue la protección de main. En Settings GitHub también te ofrece irte a
Rulesets. Estuve por ir para ese lado, pero en el video no me salían esas configuraciones y me tube que ir a la guía para entender que tenía una versión de Github distinta (salía con otro nombre)

## 3. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para estas cosas: 
- Ayudarme a redactar este archivo (revisando que pusiera lo que yo le pedí/expliqué) y el de evidencias.

Lo que no hice con IA fue crear el repositorio, configurar las protecciones, crear y mergear los
tres pull requests, resolver el conflicto en la web y publicar el tag y la release. Eso lo hice yo
siguiendo la guía. Traté de no correr ningún comando sin entender qué hacía, sobre todo los que
borran cosas.

---
---

# Decisiones — TP2: Contenedores

## 1. Qué app elegí y por qué

**Course Page**, una plataforma de cursos con backend en Go (Gin + GORM), frontend en React + Vite y
base MySQL. Viene de Arquitectura de Software I, así que ya conozco el código.

Contra los criterios de la guía:

- **Buildea y corre hoy**: sí, la probé antes de comprometerme. La única complicación fue levantar
  la base, y ahí decidí correr MySQL en un contenedor en vez de tocar el código para usar algo más
  liviano. Preferí adaptar el entorno y no la aplicación.
- **Se le pueden escribir tests**: el backend está separado en capas (`controller` / `service` /
  `client`), así que hay dónde apoyarlos cuando llegue el TP5.
- **Entiendo el código**: es el punto fuerte de esta elección. El Integrador pide hacer cambios en
  vivo, y sobre código ajeno eso se complica.
- **Tamaño**: un CRUD de cursos con inscripciones, usuarios y categorías. Alcanza sin sobrar.

## 2. Decisiones de contenerización

**Imágenes base.** Backend: `golang:1.26-alpine` para compilar y `alpine:3.21` para ejecutar.
Frontend: `node:22-alpine` para el build y `nginx:alpine` para servir los estáticos. Base:
`mysql:8`. Fijé las versiones en lugar de usar `latest` para que la imagen no cambie sola.

**Multi-stage en los dos servicios.** El backend compila con el toolchain de Go y la etapa final
solo copia el binario: 364 MB contra 60.8 MB. El binario se compila con `CGO_ENABLED=0` porque, sin
eso, se enlaza contra glibc y no arranca en Alpine, que usa musl. El frontend construye con Vite y
la etapa final solo se queda con `dist/`; ahí uso `npm ci` y no `npm install`, para que respete el
`package-lock.json`.

**Qué persiste y qué no.** Persiste la base, en el volumen nombrado `db_data` montado en
`/var/lib/mysql`. No persisten los archivos que suben los usuarios: se escriben en `/app/images` y
`/app/files` del contenedor del backend, sin volumen, así que se pierden al recrearlo. Lo dejé así a
propósito, porque el TP pide persistencia de la base y agregar ese volumen no aportaba a lo que hay
que demostrar, pero es una deuda conocida.

**Ruta relativa en vez de URL absoluta.** El frontend pide a `/api/...` y nginx reenvía a
`http://backend:8080`. La otra opción era dejar la URL absoluta con CORS, pero eso hornea la
dirección del backend dentro de la imagen y obliga a recompilar para cambiar de entorno.

**El `rewrite` de nginx.** La guía propone `proxy_pass` sin barra final, asumiendo que la API vive
bajo `/api`. La mía no: sus rutas son `/courses`, `/users`, `/login`. Así que agregué
`rewrite ^/api/(.*)$ /$1 break;`, que saca el prefijo antes de reenviar. De paso resuelve los
estáticos del backend: `/api/images/x.jpg` llega como `/images/x.jpg`.

**Publiqué también la imagen de la base**, aunque el enunciado solo exige backend y frontend. Mi
imagen de MySQL lleva adentro el schema y los datos de ejemplo, así que sin publicarla el
`docker-compose.registry.yml` no podría levantar el sistema sin el repositorio — que es justamente
lo que esa variante viene a demostrar.

## 3. Problemas encontrados y cómo los resolví

**El backend no construía: `"/go.sum": not found`.** El `.dockerignore` excluía `go.mod` y `go.sum`,
que son justo los dos archivos que el Dockerfile copia primero. Los había tratado como artefactos
compilados, pero son el manifiesto de dependencias y su lockfile — el equivalente de
`package.json` y `package-lock.json`. Los saqué del `.dockerignore`.

**Compose ni siquiera parseaba.** El servicio `backend` tenía `env_file: ./backend/db/.env`, un
archivo que no existe en mi proyecto. Compose corta antes de intentar levantar nada. Lo apunté al
`.env` de la raíz, el mismo que ya usaba la base.

**403 en el login, con los GET funcionando.** El síntoma era raro: la lista de cursos cargaba bien y
el login devolvía 403 con el cuerpo vacío. Ese cuerpo vacío fue la pista: mi controlador devuelve
401 con un JSON, así que la petición no estaba llegando ahí — la cortaba el middleware de CORS
antes. La lista de orígenes permitidos todavía apuntaba a `localhost:5173`, el puerto de Vite,
y en contenedor la app vive en `localhost:3000`. Los GET pasaban porque el navegador solo manda el
header `Origin` en peticiones que no son GET ni HEAD; el POST del login sí lo mandaba. Agregué
`localhost:3000` a la lista.

**Los puertos no coincidían.** El compose publicaba `5173:5173` para el frontend, pero la imagen es
nginx escuchando en el 80, así que la app quedaba inalcanzable con los contenedores sanos. Lo mismo
con la base: `MYSQL_TCP_PORT=3309` hace que mysqld escuche en 3309 dentro del contenedor, y el
mapeo apuntaba al 3306.

**La prueba de persistencia no daba como en la guía.** Después de `down -v` la base volvía con los 47
cursos, y parecía que el volumen no se había borrado. En realidad sí: los scripts de siembra están
horneados en la imagen y MySQL los reejecuta cuando encuentra el directorio de datos vacío. Resolví
la prueba siguiendo un dato creado a mano —una inscripción—, que es el único que no vuelve con la
semilla.

**El push de la imagen de la base falló con un 500 de ghcr** al subir el manifest, con las capas ya
subidas. Reintenté el mismo `docker push` y funcionó.

## 4. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para:

- Orientarme sobre qué instrucciones usar en los Dockerfile y qué hace cada una.
- Revisar los Dockerfile que escribí y compararlos entre versiones antes de quedarme con una.
- Ayuda de redacción en este archivo y en `evidencias.md`.

Seguí los pasos de la guía de la cátedra, y verifiqué cada cosa corriéndola: los builds, el
`docker compose up`, la prueba de persistencia y la descarga desde el registry. Los diagnósticos que
figuran en la sección 3 los confirmé mirando los logs y las salidas, no los di por buenos porque sí.

---
---

# Decisiones — TP3: Planificación y trazabilidad

## 1. Duración del sprint

Elegí **una semana**. El motivo principal es alinear la iteración con el calendario de la materia:
Las entregas van a ese ritmo, y quiero poder llevar la materia al día, así que me gustaría cumplir con ese compromiso, por eso creo que avanzar semana a semana es la mejor opción para mí.

El segundo motivo es el tamaño del trabajo. Las dos tareas de esta historia son de horas, no de días. Por lo tanto, escribir el esqueleto del workflow y publicar el reporte de tests como artefacto entran cómodas en una semana.

## 2. Límite de trabajo en progreso

Puse **3** en la columna *In Progress*.

La regla de arranque es la cantidad de personas más uno, que trabajando solo da dos. Elegí tres porque en la práctica las esperas que me frenan son dos, no una: 
- Un pull request esperando que termine el workflow de CI. 
- La documentación esperando que ese PR mergee para poder describir lo que efectivamente quedó. 
- El extra es por si necesito margen


## 3. Diagnóstico de la historia mal escrita

La historia del ejercicio es una tarea técnica disfrazada de historia. El rol es el propio equipo, no alguien a quien le importe el resultado; la capacidad describe el cómo en vez del qué; y el beneficio es la definición de lo que hace una tabla, no
un valor observable por nadie. 

**Cómo la reescribiría:** subiendo al valor que la tabla habilita, que en mi app es el registro de alumnos: *«Como visitante quiero registrarme con mi email y contraseña para poder inscribirme a un curso»*, con criterios de aceptación verificables (el alta rechaza emails repetidos; después de registrarme puedo iniciar sesión; una vez logueado puedo inscribirme a un curso y aparece en mi listado). Crear la tabla `usuarios` pasa entonces a ser una **tarea** de esa historia, que es el nivel donde corresponde.

## 4. Problemas encontrados y cómo los resolví

**`gh` no estaba instalado.** La guía arranca con `gh auth status` y en mi máquina el comando no existe. Antes de instalarlo revisé qué partes del práctico lo necesitaban de verdad, y resultó que ninguna: la vista de tablero, el campo Iteration, el límite de la columna y los workflows del Project **sólo existen en la web**, y crear el proyecto desde la web además deja configurado el auto-add que por comando hay que armar aparte. Hice todo por la interfaz y no instalé nada.

**El auto-add no es retroactivo.** Creé el proyecto sin dejar tildada la casilla *Import items from repository*, así que los issues no aparecían solos en el tablero. Encenderlo después no arrastra lo que ya existía: lo activé en `⋯` → *Workflows* → *Auto-add to project* apuntando a este repo y sumé los cinco actuales a mano con *Add item*.

## 5. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para:
- Aclarar una duda de arranque: si el TP3 necesitaba un repositorio nuevo o iba sobre el mismo del
  TP1 y el TP2. La respuesta la confirmé leyendo la sección de entregables de la guía, que lo dice explícitamente.
- Ordenar la guía en una secuencia de pasos y advertirme las trampas conocidas (el número que va en `Closes` es el de la tarea y no el de la historia; `Closes` sólo cierra si el PR apunta a la rama por defecto; las task-lists no cuentan como jerarquía navegable).
- Redactar los cuerpos de los issues (la historia con sus criterios de aceptación y el bug de mi app) y ayuda de redacción en este archivo.
- Redacción de Documentos: De nuevo, los documentos en su contenido son supervisados por mi persona y garantizo que cumplan con lo que piden, y que yo entienda lo que estoy haciendo. Pero la IA fue utilizada para escribir la mayoría de las explicaciones (redacta mucho mejor que yo).

---
---

## TP4 – CI: Pipelines as Code

### 1. Estructura elegida del pipeline

El workflow (`.github/workflows/ci.yml`) se dispara con dos eventos:

- `pull_request` hacia `main`: es el que hace el trabajo. Verifica ANTES del merge, sobre el resultado propuesto, y es el que alimenta el gate.
- `push` a `main`: deja constancia de cómo quedó `main` después de cada merge. Es la corrida que lee el badge, y además la que deja el cache que después reutiliza cualquier PR nuevo desde su primera corrida.

Tiene dos jobs, `build-backend` y `build-frontend`, que corren **en paralelo** porque no dependen uno del otro: son dos imágenes independientes, y no tiene sentido que el frontend espere al backend. Cada job corre en su propia máquina limpia y no comparten nada. Si un job necesitara algo del otro habría que declararlo con `needs:` o pasarlo como artefacto.

**Por qué no hay un tercer job para la base de datos.** Mi `docker-compose.yml` levanta tres servicios, y el de la base también tiene su Dockerfile. Pero ese Dockerfile es `FROM mysql:8` más dos `ADD` de archivos `.sql`: no compila ni empaqueta nada. Un job para él sólo detectaría que los `.sql` no viajaron al repo. Preferí no sumarlo y dejar el punto ciego explicitado acá antes que inflar el pipeline.


### 2. Qué cachea el pipeline

Lo que se cachea son **las capas de las imágenes Docker**, no dependencias sueltas. Se guardan en el cache de GitHub Actions (`type=gha`), con `mode=max` para conservar también las capas intermedias, y con un `scope` distinto por job (`backend` y `frontend`). El `scope` separado no es opcional: sin él los dos jobs comparten estante y se pisan el cache, y termina reutilizando sólo el último que corrió.

Hizo falta agregar `docker/setup-buildx-action` en los dos jobs, porque el constructor de fábrica de Docker guarda las capas en el disco de la máquina y no sabe exportarlas a un almacén externo.

**Qué se reutiliza en mi caso**: en el backend, la capa de `COPY go.mod go.sum` y la de `RUN go mod download`, porque dependen sólo de esos dos archivos. En el frontend, la de `npm ci`, que depende sólo de `package*.json`. Eso es consecuencia directa de cómo está escrito el Dockerfile del TP2: primero se copian los manifiestos de dependencias y recién después el código. Las capas de `COPY . .` y del compilado se rehacen cada vez
que cambia el código, que es lo esperable.

**Qué pasa si el cache desaparece**: nada, salvo que el build tarda más. La plataforma puede desalojarlo cuando quiera y tiene límite de tamaño, así que el pipeline tiene que funcionar igual sin él.

### 3. Por qué el pipeline construye con mi Dockerfile

Porque mi app ya se construye de una manera —el Dockerfile del TP2— y el pipeline usa ésa. Si el workflow compilara por su cuenta con `go build` y `npm run build`, tendría **dos definiciones de build** que tarde o temprano divergen, y estaría verificando una compilación distinta de la que después despliego.

El efecto lateral es que el workflow no tiene una sola línea de Go ni de Node: no sabe qué hay adentro de la imagen. El mismo archivo le sirve a cualquier stack.

### 4. Problemas encontrados y cómo los resolví

**`go.mod` y `go.sum` estaban en `.gitignore` y nunca se habían commiteado.** El primer PR falló en el paso del build, en el `COPY go.mod go.sum ./` del Dockerfile. En mi máquina el `docker build` andaba porque los archivos están en el disco; el runner clona el repo, y en el repo no estaban. Los tenía clasificados en `course-page/.gitignore` como "archivos binarios compilados localmente", que es una categoría equivocada: son el manifiesto de dependencias y su lockfile, el equivalente de `package.json` y `package-lock.json`, que en mi frontend sí estaban versionados. Saqué esas dos líneas del `.gitignore` y los commiteé.

### 5. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para:

- Ordenar la guía en una secuencia de pasos.
- Diagnosticar por qué falló el primer build. Lo verifiqué yo con `git ls-files`, que confirmó que `go.mod` y `go.sum` no estaban versionados, y con el log del runner, que señalaba el `COPY` que fallaba.
- Adaptar los ejemplos de la guía (escritos sobre .NET y una app sin subcarpeta) a mi stack Go + React y a mi estructura, donde la app vive en `course-page/`.
- Ayuda de redacción en este archivo. El contenido lo superviso y lo entiendo; puedo explicar cada decisión.

---
---

## TP5 – Testing y Calidad

### 1. Qué lógica elegí testear y por qué

**Backend (Go):** la capa de servicios (`service/`: `category`, `course`, `subscription`, `user`, `file` e `image`). Es donde viven las reglas de negocio: validación de IDs, búsqueda sin criterios, hash y verificación de contraseñas, rol por defecto de una suscripción, rango del rating, detección de duplicados y categoría inexistente al crear un curso.

**Frontend (React):** los servicios de `src/services/` (`api.js`, `authService.js`, `courseService.js`, `subscriptionService.js` y `fileService.js` y `ratingService.js`). Concentran la lógica que no es visual: cómo se arma cada pedido a la API, el manejo de errores HTTP, el token y la sesión guardada en `localStorage`.

Los componentes React (`.jsx`) no los testeé: son presentación, y testearlos pide `jsdom` y Testing Library, que la guía deja como opcional. La UI completa se verifica end-to-end en el TP7.

Resultado: **69 tests en el backend** y **90 ejecuciones en el frontend** (6 archivos de test).

### 2. Umbral de coverage

| | Métrica del umbral | Umbral | Cobertura hoy |
|---|---|---|---|
| Backend | Sentencias (`go tool cover`) | **80%** | **99.3%** sobre la lógica |
| Frontend | Sentencias, ramas, funciones y líneas (vitest) | **80%** en las cuatro | 99.19% sentencias · **96.72% ramas** · 100% funciones · 99.18% líneas |

**Ramas:** el frontend la mide y la reporta (96.72%). Go no expone cobertura de ramas de forma nativa, así que el umbral del backend es sobre sentencias. Para saber igual cuántas ramas recorren mis tests medí la capa de servicios con `gobco` (herramienta externa, que no forma parte del pipeline): **96 de 104 ramas, 92.3%**. Las 8 sin recorrer son:

- **Caminos de falla que dependen de la base o de bcrypt (4):** `course.IDCourse < 0` tras crear y tras actualizar un curso (`course.go`, la misma situación de la sección 8), y el `err != nil` de `bcrypt.GenerateFromPassword` en `user.go`, que sólo falla con contraseñas de más de 72 bytes.
- **Huecos reales de la suite (4):** el camino feliz de `InsertCategory` (hoy sólo pruebo el caso «ya existe»), la imagen de un curso que no se encuentra al listar y al buscar por ID (`err == nil` en `course.go`, 2 ramas), y las validaciones de nombre vacío y de rating fuera de rango al editar un curso.

El umbral de sentencias no los detecta porque cada una es una o dos sentencias, pero son los candidatos para los próximos tests, empezando por el camino feliz de `InsertCategory`.

**Link de la corrida verde con el resumen y los reportes descargables (backend y frontend):** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/38295165066

**Por qué 80.** Elegí 80% porque es el valor de referencia que más se usa en la industria como piso de cobertura, y porque lo puedo sostener con mi medición real: la lógica de mi app hoy mide 99.3% (backend) y 99.19% (frontend), así que el 80% es alcanzable y deja unos 19 puntos de margen para refactors sin que el gate se rompa por cambios menores. A la vez es lo bastante exigente como para frenar código nuevo sin tests: para llevar el backend de 99.3% a menos de 80% hacen falta unas 210 sentencias sin cubrir, y en el frontend unas 20. Tiene un límite que reconozco: como estoy muy por encima, el umbral no frena una caída chica sino la entrada de código nuevo sin tests en cantidad. Si quisiera hacerlo más sensible lo subiría a ~90%, que sigue siendo alcanzable con la suite actual. Para que el número cubra más que la lógica tendría que testear `client/` y `controller/`, que son tests de integración con una base real, y eso queda para el TP7.

**Cómo frena.** En el frontend, `coverage.thresholds` de vitest: si baja de 80, `vitest` sale con error. En el backend, el script `course-page/backend/scripts/coverage.sh` calcula el total con `go tool cover -func` y hace `exit 1` si queda por debajo. Los dos corren **adentro del contenedor, en una etapa `test` de cada Dockerfile**, así que el job se pone en rojo y el *required check* del TP4 bloquea el merge.

### 3. Qué dejé afuera de la cuenta de cobertura

**Backend** (lista de exclusión en `scripts/coverage.sh`; se mide todo el proyecto con `-coverpkg=./...` y se sacan estas rutas del perfil de cobertura):

- **`main.go`, `app/` y `db/`:** arranque de la aplicación, rutas y conexión a la base. No tienen reglas de negocio, y si están mal la app no levanta. `db/db.go` lo sumé después: al medirlo bajaba el total de 99.3% a 94.7% sin que hubiera ninguna regla que verificar.
- **`model/` y `dto/`:** structs de datos sin comportamiento.
- **`client/`:** las consultas a la base (GORM). Testearlas pide una base de datos real, o sea tests de integración. Riesgo que dejo anotado: hay una convención que el servicio da por hecha (por ejemplo `InsertCategory` avisa "ya existe" devolviendo el nombre vacío, e `InsertUser` con ID `-1`); si alguien la cambia, ningún test unitario lo detecta.
- **`controller/`:** los handlers HTTP. Revisé que sólo parsean el pedido, llaman al servicio y traducen el error a un código HTTP, sin reglas de negocio. Testearlos pide levantar el servidor completo.
- **`utils/`:** helpers de errores.
- **`service/repository.go`:** adaptadores que sólo delegan en `client`, sin lógica.

La lista es de **exclusión y no de inclusión** a propósito: cualquier archivo o paquete nuevo entra solo a la cuenta, y si no tiene tests el número baja. Con una lista de inclusión, lo que me olvidara de nombrar desaparecería de la medición en silencio.

Medido todo el proyecto sin exclusiones, el total de `go test` da **35.8%**; sobre la lógica da **99.3%**. No son dos mediciones del mismo código: la primera incluye lo que arriba declaré fuera.

**Frontend** (`include` en `vite.config.js`):

- **Componentes `.jsx` y páginas:** presentación.
- **`categoryService.js` y `userService.js`:** wrappers de una línea sobre `apiRequest`, sin ramas ni reglas.
- **`fileService.js` lo dejé adentro** porque arma un `FormData`, que es lógica real.

### 4. Por qué coverage alto no garantiza calidad

La cobertura mide **ejecución, no verificación**. Ejemplo con mi app: `InsertUser` (el alta de usuario) guarda la contraseña hasheada con bcrypt. Un test que sólo llamara a `svc.InsertUser(...)` y comprobara que no devuelve error dejaría la función en ~98% de cobertura. Pero si un día alguien guardara la contraseña en texto plano, ese test seguiría en verde.

Por eso mi test de `InsertUser` verifica **qué se guardó**: que el valor guardado no es el texto plano, que `bcrypt.CompareHashAndPassword` lo valida contra la contraseña original, y que el nivel de acceso queda en `"User"` aunque el pedido pida `admin`. Lo mismo con los dobles: los asserts comprueban la interacción (por ejemplo, que ante una categoría inexistente **no** se llamó a insertar el curso), no sólo el valor devuelto.

### 5. Refactorización para poder mockear

Los servicios llamaban directo a funciones del paquete `client`, que usan una variable global de GORM (`client.Db`). Así no había forma de testearlos sin una base real.

Qué cambié: en `service/repository.go` definí una **interfaz de repositorio por servicio** (`CategoryRepository`, `CourseRepository`, `SubscriptionRepository`, `UserRepository`, `FileRepository`, `ImageRepository`) y una implementación real que **sólo delega en `client`**, sin lógica. Cada servicio recibe su repositorio como campo (`repo`), y `init()` le pasa la implementación real. Cambié `client.X(...)` por `s.repo.X(...)` y nada más: la lógica sigue adentro del servicio y la app se comporta igual. En los tests, la dependencia se reemplaza por un doble (fake escrito a mano) que devuelve datos inventados y cuenta las llamadas.

En el frontend no hizo falta refactorizar: `apiRequest` ya está separado en `api.js` y los demás servicios lo importan, así que `vi.mock('./api.js')` lo reemplaza.

### 6. Reglas de negocio agregadas

La app ya tenía lógica real (validaciones, hash de contraseñas, roles, rating), así que no agregué reglas para tener qué testear.

Para la demostración del freno agregué dos funcionalidades chicas en el frontend, ambas con la lógica pura de un servicio, una por cada Pull Request:

- **`ratingService.js` (PR #24):** resumen de las valoraciones de un curso. Valida que un rating esté entre 1 y 5 (un 0 significa «sin calificar»), calcula el promedio redondeado a un decimal, cuenta las valoraciones por estrella, asigna una etiqueta («Excelente», «Muy bueno», etc.) y sólo muestra el resumen si hay al menos 3 valoraciones.
- **`courseFilterService.js` (PR #25):** filtra los cursos por categoría, texto y rango de precio, los ordena y los pagina.

Las dos se sumaron a `coverage.include` de `vite.config.js`, porque con una lista de inclusión un archivo nuevo no entra a la medición solo. Se agregaron sin tests a propósito, para que el código compile y los tests existentes sigan en verde y aun así la cobertura baje del umbral.

### 7. Stack utilizado (Go + vitest)

| Qué hace falta | En .NET (cátedra) | En mi app |
|---|---|---|
| Test parametrizado | `[Theory]` + `[InlineData]` | *Table-driven tests*: un `[]struct{...}` recorrido con `t.Run()`; en el frontend, `it.each` |
| Doble (mock) | Moq | Fakes escritos a mano que cuentan las llamadas (sin librería); en el frontend, `vi.fn()` y `vi.mock()` |
| Medidor de cobertura | `coverlet` | `go test -coverpkg=./... -coverprofile` + `go tool cover`; en el frontend, `@vitest/coverage-v8` |
| Umbral que frena el build | `/p:Threshold=70` | Script `coverage.sh` con `awk` que hace `exit 1`; en el frontend, `coverage.thresholds` |
| Filtro de qué entra en la cuenta | `/p:Exclude=…` | `grep -Ev` sobre el perfil de cobertura (lista de exclusión); en el frontend, `coverage.include` |
| Herramientas de test en la etapa del Dockerfile | El SDK ya las trae | El SDK de Go ya las trae (`FROM build`); en el frontend, `npm ci` sin `--omit=dev` instala vitest |

### 8. El ejercicio del camino sin cubrir

Abrí el reporte HTML (`coverage.html`) y encontré una línea en rojo en `service/course.go`:

- **Qué línea es:** línea 219, el `return courseDTO, errors.New("error updating course")` dentro del `if course.IDCourse < 0` de `PutCourseById`. Ese `if` se evalúa justo después de llamar al repositorio y en todos mis tests da falso, porque el doble siempre devuelve el curso con su ID original.
- **Qué entrada la recorrería:** que el repositorio devuelva el curso con `IDCourse = -1`. En la app real es lo que hace `client.PutCourseById` cuando falla cualquier paso de la actualización (la edición, el borrado de las relaciones viejas o la inserción de una nueva).
- **Qué decidí:** **no agregar el test.** Lo dejo documentado como deuda técnica, por estas razones:
  1. **No cambia el resultado del gate.** Esa línea es 1 de las 871 sentencias medidas (el 0.1%): con el test el backend pasaría de 99.3% a 99.4%, muy lejos del umbral de 80%. El número no es el motivo de un test, pero tampoco es una urgencia.
  2. **El camino depende de un fallo real de la base.** El `-1` lo devuelve `client.PutCourseById` cuando se cae la transacción (la edición, el borrado de las relaciones viejas o la inserción de una nueva). Con un doble sólo podría comprobar que el servicio reacciona a un valor que yo mismo le configuré; no estaría probando que la actualización falla bien contra una base de datos de verdad. Esa verificación corresponde a un test de integración, que dejo para el TP7.
  3. **Elegí gastar los tests donde un bug duele más.** Los tests de esta suite protegen reglas de negocio con riesgo concreto (la autenticación, el rol de la suscripción, los duplicados, las validaciones de entrada). El caso de error de una actualización es un camino de falla poco frecuente que además ya está acotado: el servicio no devuelve un éxito falso, devuelve un error.
  4. **Es el primer test que agregaría si subo el umbral o si sumo tests de integración**, porque es la rama más clara que quedó sin recorrer.

  Decidir no agregarlo no es dejarlo sin criterio: abrí el reporte, identifiqué la línea, entendí qué la dispara y evalué el costo y el beneficio de cubrirla.

### 9. Pull Request bloqueado

En el **PR #24** agregué `ratingService.js` sin tests. El código compilaba, el lint pasaba y los 53 tests existentes estaban en verde, pero el job **`build-frontend` se puso en rojo** por cobertura y, al ser un *required check*, el botón de merge quedó deshabilitado. `build-backend` siguió en verde.

El log de vitest lo dice con el número exacto, métrica por métrica (el archivo nuevo medía 0%):

| Métrica | Cobertura | Umbral |
|---|---|---|
| Líneas | 66.39% | 80% |
| Sentencias | 65.32% | 80% |
| Funciones | 70.58% | 80% |
| Ramas | 59.01% | 80% |

Las cuatro fallaron, con mensajes del tipo `ERROR: Coverage for lines (66.39%) does not meet global threshold (80%)`.

Para arreglarlo escribí `ratingService.test.js` y no toqué el umbral ni la lista de archivos medidos. Cubre `isValidRating` y `getRatingLabel` con `it.each`, el promedio con valores inválidos mezclados, el resumen completo y vacío, y `getCourseRatingSummary` con un doble de `subscriptionService` (`vi.mock`), incluido el caso en que la petición falla. Con eso el frontend volvió a 99.19% de sentencias y 96.72% de ramas, el job quedó en verde y mergeé el PR.

El **PR #25** repite el problema a propósito y no se arregla: agrega `courseFilterService.js` sin tests y la cobertura del frontend baja a 71.59% de líneas, 71.09% de sentencias, 75.55% de funciones y 59% de ramas. Queda **abierto y en rojo** hasta la defensa, con el merge bloqueado por el check requerido.

### 10. Links que prueban cada decisión

| Qué prueba | Link |
|---|---|
| Resumen de cobertura y reporte descargable (backend y frontend) | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/38295165066 |
| Corrida roja por umbral, con el número en el log | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/38278531972 |
| Secuencia rojo → tests → verde → merge (PR mergeado) | https://github.com/mateo-velasquez/ingsoft3-tp01/pull/24 |
| Freno vigente, en rojo (PR abierto) | https://github.com/mateo-velasquez/ingsoft3-tp01/pull/25 |

### 11. Problemas encontrados y cómo los resolví

- **Node no estaba instalado** en mi máquina, así que no podía instalar vitest ni correr el frontend. Instalé Node (v24 en mi máquina; el Dockerfile y el CI usan Node 22, que para estos tests de JavaScript puro no cambia nada).
- **`db/db.go` bajaba el total del backend de 99.3% a 94.7%** cuando pasé a medir todos los paquetes con `-coverpkg=./...`. Es la conexión a la base (arranque); la sumé a la lista de exclusión y comprobé que el total volvía a 99.3%.
- **El script de cobertura se rompería en Windows por los finales de línea:** con `core.autocrlf` los `.sh` pasan a CRLF y dentro de un contenedor Linux fallan. Agregué un `.gitattributes` que fuerza LF en `*.sh`.
- **`go test ./...` con cobertura falló una vez en mi Windows** con `go tool covdata: The process cannot access the file because it is being used by another process`: un bloqueo transitorio del sistema de archivos. Volvió a andar solo al repetirlo.

### 12. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) como asistente. **Supervisé todo el trabajo en cada paso: nada de este práctico lo hizo la IA por su cuenta ni lo acepté sin revisarlo.** Para cada tarea yo pedía una propuesta, la leía, y decidía qué se hacía y qué no.

Dónde usé la IA:

- Leer la guía y ordenar las tareas en una secuencia de Pull Requests.
- Analizar los servicios del backend y proponer qué reglas testear.
- Escribir el refactor (interfaces de repositorio), los tests, el script de cobertura, las etapas de tests de los Dockerfiles y los pasos nuevos del `ci.yml`.
- Ayuda de redacción en este archivo.

Qué decidí yo, y no la IA:

- Qué se testea y qué queda afuera de la cuenta de cobertura: elegí testear también `user.go`, `file.go` e `image.go` y no esconderlos de la medición, y revisé las exclusiones contra la lista de otro equipo y contra la guía.
- El umbral de 80%, y que la demostración del freno se hace en un Pull Request aparte.
- Cómo se organiza el trabajo: la división en ramas y Pull Requests, y la estructura de este archivo.
- Las convenciones del código: pedí que los nombres de los tests y los comentarios estén en inglés, como el resto del backend; y que los commits los hago yo, con los comandos que me da la IA.
- Qué entra y qué no entra en este documento: revisé el texto y pedí sacar lo que no correspondía.

Cómo lo verifiqué: corrí las suites de los dos lados y comprobé que pasan; abrí los reportes de cobertura (el HTML del backend y la tabla de vitest) y contrasté los números contra mis propias mediciones; probé que el umbral frena de verdad, ejecutando el script con un umbral de 100 y viendo que termina con error. Puedo explicar qué verifica cada test y qué casos quedan sin cubrir (secciones 3 y 8).

---
---

## TP6 – CD: environments, aprobaciones y deployment patterns

### Enlaces de este TP

**Paquetes públicos del registry** (etiquetados con el commit del merge del PR #27):
- **Backend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend
- **Frontend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend

**Cadena del registry:**
- **PR con «Entrar al registry» salteado:** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40156283886/job/121058269832
- **Corrida de `main` con la publicación como último paso:** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40156759176/job/121059675312

**URLs de los entornos:**

| Entorno | Frontend | Backend |
|---|---|---|
| **QA** | https://course-page-front-qa.onrender.com | https://course-page-api-qa.onrender.com |
| **PROD** | https://course-page-front-prod.onrender.com | https://course-page-api-prod.onrender.com |

**Gate hacia PROD:**
- **Rechazo con motivo:** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40220600053
- **Aprobación y deploy a PROD:** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40222464413

### 1. Por qué el artefacto se publica sólo con la verificación en verde

Que en el registry sólo haya imágenes verificadas sale de encadenar tres cosas:

1. Nada entra a `main` sin el pipeline en verde: `build-backend` y `build-frontend` son *required checks* (TP4) y adentro corre el umbral de cobertura (TP5).
2. Sólo `main` publica: el paso de publicar tiene `push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}`. En un PR la imagen se construye pero no se sube.
3. Publicar es el último paso del mismo job que corre los tests: si un test falla, el job muere antes y nunca llega a publicar.

Si se publicara con los tests en rojo, «estar en el registry» dejaría de querer decir «pasó la verificación», y no se podría desplegar nada de ahí sin volver a verificarlo. Lo que la cadena no garantiza es que nadie suba una imagen a mano con `docker push`: garantiza lo que publica el pipeline.

### 2. Dos entornos y qué quedó por variable

Cada entorno tiene su front y su api en Render y su base en Neon (`app_qa` y `app_prod`). Los cuatro servicios tienen **Auto-Deploy en Off**: sólo despliegan cuando los llama el pipeline.

Migré de MySQL a Postgres porque Neon sólo ofrece Postgres, y no usé el Postgres de Render porque su base gratuita vence a los 30 días.

| Servicio | Por variable de entorno | Adentro de la imagen |
|---|---|---|
| Frontend | `BACKEND_URL`, `DNS_RESOLVER`, `PORT` | Los estáticos y la plantilla de nginx |
| Backend | `DB_*`, `ALLOWED_ORIGINS`, `PORT` | El binario |

El front siempre pide a `/api/...` y nginx reenvía a `${BACKEND_URL}`, que se reemplaza al arrancar el contenedor. Por eso la misma imagen sirve en compose, en QA y en PROD, que es lo que necesita el TP7.

Para probar que las bases están separadas inserté la categoría «SOY PROD» sólo en `app_prod`: la api de PROD la devuelve y la de QA no.

### 3. Continuous Delivery vs. Continuous Deployment

Implementé **Continuous Delivery**: cada merge llega solo hasta QA, y a PROD sólo con aprobación manual.

Corresponde a mi contexto porque la verificación automática no alcanza para confiarle PROD: los tests son unitarios, no hay tests end-to-end (eso es el TP7), el smoke sólo comprueba que el entorno contesta, y no tengo métricas ni alertas en PROD. El gate da un momento para mirar QA con el cambio antes de decidir.

### 4. Diseño de la cadena y alcance de los secrets

```
build-backend ──┐
                ├──► deploy-qa ──► ⏸ aprobación ──► deploy-prod
build-frontend ─┘
```

- **`deploy-qa`**: `needs: [build-backend, build-frontend]` (sin CI verde no hay deploy) e `if: github.ref == 'refs/heads/main'` (los PRs no despliegan).
- **`deploy-prod`**: `needs: [deploy-qa]` (sólo llega a PROD lo que ya corre en QA) y `environment: production`, que tiene un *required reviewer* y pausa el job hasta que alguien aprueba o rechaza.
- **`&ref=$GITHUB_SHA`** en los deploy hooks: Render despliega el commit de la corrida y no la punta de `main`. En PROD importa más, porque entre la pausa y la aprobación pueden entrar otros merges.
- **`concurrency`** en los dos deploys: si entran dos merges seguidos, el segundo espera al primero.

Los secrets son los cuatro deploy hooks de Render. Los de QA viven en el environment `qa` y los de PROD en `production`, así que sólo los lee un job que declara ese environment. Los de PROD, además, recién después de la aprobación. Las credenciales de la base no pasan por GitHub: están en las variables de cada servicio en Render.

### 5. Qué mira el aprobador antes de aprobar

1. Qué cambia el merge: si toca el schema o la configuración, lo miro con más cuidado, porque el smoke no lo cubre.
2. Que `/health` de QA diga el commit de la corrida, y cuántos intentos tardó el smoke.
3. Que QA funcione: entro al front y pruebo el login y lo que toca el cambio.
4. Qué hay en PROD hoy: si está varios commits atrás, el deploy sube todos esos cambios juntos.

El rechazo de la corrida 40220600053 fue de la primera vez que el pipeline iba a llamar a los hooks de PROD, con PROD dos commits atrás. El motivo quedó escrito en la corrida.

### 6. La letra chica del free tier y cómo la maneja el pipeline

- **Render duerme** los servicios a los ~15 min sin tráfico, y el primer pedido tarda hasta ~1 min. El smoke reintenta 30 veces cada 20 s, con `--max-time 10` en cada `curl`.
- **El deploy de Render es asincrónico**: el hook responde al instante y Render sigue sirviendo la versión vieja mientras construye. Por eso el smoke espera a que `/health` diga el commit nuevo.
- **750 horas de instancia por mes por workspace**, compartidas entre los cuatro servicios. Alcanzan porque duermen cuando no se usan, y los PRs no despliegan.
- **Neon** suspende el cómputo a los ~5 min sin uso y limita el almacenamiento a 0.5 GB. El mismo reintento cubre la demora, y los datos entran de sobra.

### 7. Qué garantía pierdo porque Render reconstruye desde el repo

El pipeline publica la imagen verificada en `ghcr.io`, pero Render no la usa: clona el commit y construye su propia imagen. Lo que corre no es exactamente lo que se verificó. El build de Render no corre los tests, las imágenes base (`nginx:alpine`, `alpine:3.21`) pueden cambiar entre un build y otro, y QA y PROD son dos builds separados del mismo commit. El `&ref` asegura el mismo **código**, no el mismo **artefacto**. Se resuelve desplegando la imagen de `ghcr.io`, que es el TP7.

### 8. Qué prueba el smoke test y qué no

**Prueba:** que `/health` de la api devuelve el commit de la corrida (la versión nueva está corriendo), que `/courses` responde (la api llega a la base), que el front sirve `/`, y que `/api/health` del front llega a la api de su entorno.

**No prueba:**
- Que la app funcione: son cuatro GET, sin login ni escrituras.
- El CORS: el smoke no manda `Origin`, así que un `ALLOWED_ORIGINS` mal cargado pasa en verde (me pasó, sección 10).
- Que el front sea la versión nueva: el commit sólo se compara en la api.

### 9. Deployment pattern y plan de rollback

**Pattern: blue-green.** Dos copias de PROD: la nueva se levanta y se verifica sin usuarios, y recién después se mueve el tráfico. Si sale mal, se vuelve a la vieja, que sigue levantada.

- **Por qué ése:** la app es chica y corre en una sola instancia por servicio, así que duplicarla durante el cambio cuesta poco, y el rollback es instantáneo. Canary necesita un balanceador por porcentaje y métricas por versión que no tengo; rolling necesita varias instancias.
- **Riesgo:** las dos versiones comparten la base, así que los cambios de schema tienen que ser compatibles hacia atrás.
- **Observabilidad que me falta:** métricas de errores y latencia para comparar blue y green, y alertas.

**Rollback actual, probado una vez en PROD** (de `d3edad5` a `a9fa061` y de vuelta), con el botón **Rollback** de Render en *Deploys*:

1. Render → `course-page-api-prod` → *Deploys* → **Rollback** en el último deploy bueno.
2. Lo mismo en `course-page-front-prod`.
3. Verificar que `/health` de PROD diga el commit anterior y que el login funcione.
4. Revertir el commit malo en `main` con un PR, porque el rollback no toca el repo y el próximo deploy lo volvería a subir.

**Tiempo medido** (columna *Duration* de *Deploys* en Render): **10.9 s** la api y **10.8 s** el front. Es rápido porque reusa la imagen ya construida; un deploy del pipeline tardó 24 s. A eso se suma el tiempo de entrar y tocar los botones, y el de darse cuenta del problema.

**Lo que el rollback no deshace:** los datos. Lo que la versión mala escribió en la base se queda, y si cambió el schema la versión vieja puede no entenderlo. Para eso haría falta un backup de antes del deploy.

### 10. Problemas encontrados y cómo los resolví

- **El login de QA daba 403** y los GET andaban. Era CORS: en `ALLOWED_ORIGINS` había puesto la URL de la api de QA en vez de la del front.
- **El schema no lo crea la app:** el `AutoMigrate` de GORM v1 no entiende las etiquetas de los modelos, así que cargué `create_tables.sql` a mano en las dos bases de Neon.
- **GORM v1 manda `id = 0`** en los inserts, que MySQL interpretaba como «generalo vos». En Postgres lo resolví con un trigger que lo reemplaza por el siguiente de la secuencia.
- **Las fotos de los cursos dan 404 en Render**, porque las imágenes de la semilla no están en la imagen del backend. Queda como deuda.

### 11. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para ordenar la guía, escribir la migración a Postgres, los cambios de configuración por entorno y los jobs `deploy-qa` y `deploy-prod`, guiarme en las pantallas de Neon, Render y GitHub, y ayudarme a redactar este archivo.

Yo configuré las plataformas y los secrets (que nunca pasaron por la IA), hice los commits y merges, decidí el rechazo y la aprobación del gate, e hice el rollback.

Lo verifiqué probando el login en los dos fronts, con el dato «SOY PROD», siguiendo cada corrida en *Actions* y comprobando en `/health` qué commit corría en cada entorno después de cada deploy y del rollback.

---
---

## TP7 – Contenedores en el pipeline + integración y e2e

### Enlaces de este TP

**Paquetes públicos del registry** (cada versión con su etiqueta `sha-<commit>`):
- **Backend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend
- **Frontend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend

**Corrida con la integración en verde y la e2e en rojo, que frenó la promoción:**
- **Commit que rompió la app** (el botón «Iniciar Sesión» pasó a decir «Entrar»): https://github.com/mateo-velasquez/ingsoft3-tp01/commit/bbe6febd882be6ca91a6ce97f6dfb24a21551426
- **Corrida:** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40248705885
- **Reporte de integración (verde):** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40248705885/artifacts/12619217858
- **Reporte e2e (rojo):** https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40248705885/artifacts/12619218601

**Corrida completa en verde, con aprobación, hasta PROD** (el arreglo): https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40250945481

**Release:** https://github.com/mateo-velasquez/ingsoft3-tp01/releases/tag/v7.0.0

**URLs de los entornos:**

| Entorno | Frontend | Backend |
|---|---|---|
| **QA** | https://course-page-front-qa.onrender.com | https://course-page-api-qa.onrender.com |
| **PROD** | https://course-page-front-prod.onrender.com | https://course-page-api-prod.onrender.com |

### 1. Build once, deploy many

En el TP6 Render clonaba el commit y construía su propia imagen, una vez para QA y otra para PROD. El código era el mismo, pero los builds eran dos: `nginx:alpine` y `alpine:3.21` se resuelven en el momento del build, así que QA podía probar una imagen y PROD correr otra. Además, el build de Render no corría los tests.

Ahora el pipeline construye y verifica la imagen **una sola vez**, la publica en `ghcr.io` como `sha-<commit>`, y los cuatro servicios la ejecutan. Lo que pasó las pruebas en QA es, bit a bit, lo que se aprueba para PROD: en el log de `deploy-qa` y de `deploy-prod` de una misma corrida se lee el mismo `imgURL`.

### 2. Etiquetas, Render y release

- **`sha-<commit>`** (registry): de qué commit salió la imagen. Es la que uso para promover, porque el pipeline la arma sola con `github.sha`, y QA y PROD reciben la misma.
- **`v7.0.0`** (git): el nombre de la versión que anduvo en PROD. Apunta a un commit, no a una imagen.
- **No publico `latest`**: se movería con cada merge, así que «¿qué hay en PROD?» dejaría de tener respuesta, y un deploy de `latest` podría levantar una imagen que todavía no pasó por QA ni por la aprobación.
- **Ninguna etiqueta es inmutable.** Si alguien vuelve a publicar `sha-<commit>`, por ejemplo volviendo a correr una corrida vieja, el nombre queda igual pero el contenido cambia, y un redeploy de esa etiqueta llevaría a PROD algo que nadie verificó. Por eso no se re-corren corridas viejas para desplegar. Lo único que no se mueve es el digest (`@sha256:…`), que el hook también acepta.

**La imagen configurada en Render no es la que corre.** A los cuatro servicios existentes les cambié la fuente a *Existing Image* (son los mismos servicios, con las mismas URLs). Render pide una imagen para guardar esa configuración, y le puse `sha-38640c6…`, la del merge del PR #35. Pero cada deploy del pipeline le pasa `imgURL` con el `sha-` de su corrida, y eso es lo que se ejecuta. El valor del panel es sólo el punto de partida.

**De la release a la imagen, en un paso:** `git rev-list -n1 v7.0.0` da el commit, y `ghcr.io/mateo-velasquez/ingsoft3-tp01-{backend,frontend}:sha-<ese commit>` son las dos imágenes. El tag va sobre el commit que *Deployments* muestra en `production`, no sobre el último de `main`: un merge que todavía no aprobé nunca corrió en PROD.

### 3. Cómo se comprueba desde afuera qué imagen corre

- En los *Events* de cada servicio de Render, el deploy dice «Triggered via Deploy Hook» y nombra la imagen `sha-<commit>` de la corrida. Los *Events* no se pueden linkear, así que los muestro en vivo. Un deploy a mano desde el panel no dice «Deploy Hook» y no tiene una corrida que lo respalde.
- Esa misma etiqueta está en el paquete, y `docker pull` por `sha-<commit>` funciona sin credenciales.

**El smoke ya no puede decir qué versión corre.** En el TP6 comparaba el commit de `/health`, que salía de `RENDER_GIT_COMMIT`, pero un servicio *Existing Image* no recibe esa variable. Ahora sólo prueba que QA responde: api, base, front y el proxy del front. Que responda no dice que sea la imagen nueva ni que la app funcione. Lo primero lo muestran los *Events* y lo segundo, las dos suites.

### 4. Qué pruebo en cada suite y qué dejé afuera

**Integración** (`e2e/api.spec.js`: el fixture `request` contra la api de QA, sin navegador):
1. Alta → aparece en `GET /courses` → `DELETE` → ya no aparece.
2. Curso con nombre vacío → `400`, y la cantidad de cursos no cambia.
3. *(elegida)* Login: con la contraseña correcta da `200` y token, y con una incorrecta da `401`. Es lo primero que hace cualquier usuario: si se rompe, nadie entra y me escriben todos. Depende de la base de verdad (el hash guardado).

**e2e** (`e2e/cursos.spec.js`: Chromium contra el front de QA):
1. **Creación:** el admin crea un curso desde el panel, lo ve en la lista, lo elimina y ya no está.
2. **Error:** login con contraseña incorrecta → se ve el error, sigue en `/login` y no hay sesión (no aparece «Salir»).
3. *(elegido)* **Inscribirse a un curso** y ver la confirmación. Es el flujo de todos los días de la plataforma: si falla, me escriben los alumnos. Además toca la base.

Las pruebas que crean datos usan un nombre con la hora (`e2e <Date.now()>`) y borran lo que crearon, comprobando que se fue. El curso arrastra su inscripción por `ON DELETE CASCADE`. Así una corrida no ensucia la siguiente, y si pasara lo vería en QA como cursos `e2e …` sueltos.

**Lo que no puse (pirámide):** las reglas de negocio una por una (nombre vacío en el servicio, roles, `isAdmin`) están en los unitarios del TP5, que corren en segundos y no dependen de QA. En integración va sólo lo que necesita la base de verdad. En e2e van sólo los flujos que un usuario hace en pantalla, porque cada uno tarda y depende de que QA esté despierto. No hay una e2e por cada validación ni por cada rol.

### 5. Integración vs. e2e: el par verde/rojo

La **integración** prueba que la api y su base hacen lo que dicen (guardan, rechazan, borran), sin pantalla. Ve lo que un unitario con doble no ve: el repositorio falso contesta lo que yo le dije, y la base real tiene sus constraints, las FK con cascade y los nombres reales de las columnas. Por ejemplo, si cambio el nombre de la columna en una etiqueta de GORM, el unitario con el repositorio falso sigue en verde y Postgres lo rechaza.

La **e2e** prueba que una persona puede usar la app: que el front encuentra sus botones, manda lo correcto y muestra la respuesta.

**Mi corrida roja, leída con la tabla de §2.5:** la integración verde dice que la api y la base andan (alta, borrado, login). La e2e roja dice que algo se rompió entre el usuario y la api, o sea, **el front**. El reporte lo confirmó sin abrir el código: la traza muestra el click esperando 60 s un botón «Iniciar Sesión», la página mostrando «Entrar», y en *Network* nunca aparece `/api/login`. Si hubiera roto la api, la integración habría quedado en rojo y la e2e ni siquiera habría corrido (`needs: integracion`).

### 6. Por qué la integración es la amplia

Le habla a la api de QA ya desplegada, con su base en Neon.
- **Gana:** prueba la imagen que va a ir a PROD, con su configuración real (variables, driver de Postgres, schema cargado en Neon).
- **Pierde:** corre tarde, cuando QA ya tiene el cambio. Es más lenta, depende de que QA esté despierto y comparte los datos con la e2e (por eso los nombres únicos y la limpieza).

La estrecha, con un Postgres levantado dentro del job, avisaría antes del deploy, pero probaría otra base y otra configuración, no lo que corre.

### 7. Cold start y tests flaky

- Antes de las suites, el smoke ya despertó QA (reintenta hasta 10 min).
- Timeouts de 60 s por test y de 15 s por `expect`. Las esperas son las de Playwright, que esperan a que aparezca el elemento o el texto, sin `sleep`.
- `retries: 1`: si algo falla por una demora, reintenta una vez, y ese reintento guarda la traza. Un test que pasa recién en el reintento queda marcado como *flaky* en el reporte, así que no se esconde.
- `reducedMotion: 'reduce'`, más una regla CSS, para que la animación de la portada no mueva elementos mientras Playwright clickea.

Un **test flaky** es uno que pasa o falla sin que cambie el código. Es peor que no tenerlo: si a veces falla «porque sí», el equipo aprende a re-correr el rojo, y el día que el rojo es de verdad también lo re-corre. Para no fabricarlos, cada test crea y borra sus propios datos y no depende de lo que ya haya en QA.

### 8. La misma imagen del front en QA y PROD

Es lo que dejé preparado en el TP6. El front se compila pidiendo a `/api/...`, así que la URL de la api no queda en el bundle. nginx reenvía `/api` a `${BACKEND_URL}`, usando `${DNS_RESOLVER}`, y las dos variables se completan al arrancar el contenedor con las de cada servicio en Render. Adentro de la imagen quedan los estáticos y la plantilla de nginx. La api funciona igual: `DB_*` y `ALLOWED_ORIGINS` van por variable.

### 9. Qué bug no ataja el gate

- **La configuración propia de PROD:** las suites corren contra QA, así que un `ALLOWED_ORIGINS` mal cargado en PROD pasa el gate.
- **Lo que las pruebas no miran.** Un caso real que encontré y quedó como deuda: al inscribirse, el front manda `course_role: 'student'`, y el backend guarda «Student» sólo si el rol viene vacío; con cualquier otro valor guarda «Teacher». Los unitarios de cada lado pasan, porque cada uno prueba su mitad. La e2e también pasa, porque afirma el mensaje de confirmación y no el rol guardado.

### 10. Problemas encontrados y cómo los resolví

- **El smoke del TP6 fallaba** esperando el commit en `/health`, que nunca llegaba: los servicios *Existing Image* no reciben `RENDER_GIT_COMMIT`. Lo reduje a «responde», y la imagen se verifica en *Events* (sección 3).
- **El admin no podía entrar al panel:** `isAdmin` comparaba con `'admin'` y la api manda `'Admin'`. El unitario pasaba porque el usuario de prueba lo había escrito yo con minúscula: el doble contesta lo que le dijiste (§2.5). Lo encontró la e2e. Ahora compara sin importar mayúsculas, y el unitario prueba `'Admin'`.
- **Playwright no encontraba los campos por su label:** los `<label>` no tenían `htmlFor` y las alertas no tenían `role="alert"`. Además, el alta mostraba el mensaje en una prop que `Alert` no lee. Lo arreglé en los componentes, no en los tests.
- **El nombre vacío se rechazaba por casualidad** (la búsqueda de repetidos con `ILIKE '%%'` encontraba cualquier curso). Agregué la validación explícita y su unitario.
- **`docker compose` no levantaba**: dos notas sin `#` en el `.env` local rompían el parseo.

### 11. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para ordenar la guía, escribir las dos suites de Playwright, los jobs `integracion` y `e2e`, el cambio de `imgURL` en los deploys y los arreglos del front que encontraron las pruebas, guiarme en las pantallas de Render y GitHub, y ayudarme a redactar este archivo.

Yo cambié la fuente de los servicios en Render, pegué los deploy hooks (que nunca pasaron por la IA), hice los commits, PRs y merges, rompí y arreglé el botón, aprobé PROD y creé el tag y la release.

Lo verifiqué corriendo las seis pruebas contra el compose local antes de subirlas, leyendo qué afirma cada una, mirando los dos reportes y la traza de la corrida roja, y revisando en los *Events* de los cuatro servicios que cada deploy nombrara el `sha-` de su corrida.

---

## TP8 – Infraestructura como código

### Enlaces de este TP

- **Carpeta `infra/`:** https://github.com/mateo-velasquez/ingsoft3-tp01/tree/main/infra
- **PR que la sumó:** https://github.com/mateo-velasquez/ingsoft3-tp01/pull/41
- **Release:** https://github.com/mateo-velasquez/ingsoft3-tp01/releases/tag/v8.0.0

Preprod vive destruido: nace con `terraform apply` y sus direcciones salen de `terraform output`.

### 1. Riel y versiones fijadas

- Riel canónico: **Terraform** (usé 1.16.6) + **Neon** + **Render**.
- `kislerdm/neon` **0.18.0** y `render-oss/render` **1.9.1**, con versión exacta y el `.terraform.lock.hcl` en el repo. La de Neon es la que más importa fijar: su repo está archivado y el provider oficial todavía no salió.
- Las tres claves van como variables de entorno de la terminal, nunca en un archivo del repo. El estado queda en mi máquina y fuera de git (`*.tfstate` en el `.gitignore`), porque tiene la contraseña del rol en texto plano.
- Región `virginia` (QA y PROD están en Ohio): la base de Neon quedó en `us-east-1`, así que la api queda al lado de su base.

### 2. Por qué un entorno nuevo y qué sigue siendo artesanal

Declaré `preprod` en vez de llevar QA o PROD a código: crear algo que no existe no puede romper lo que ya anda, y la cadena del TP7 sigue usando QA y PROD hasta la defensa. Además preprod es desechable, porque su base nace vacía y el backend crea las tablas con `AutoMigrate`. Producción no es desechable.

**Sigue siendo artesanal** todo lo que hice a mano antes de este TP:
- los cuatro servicios de QA y PROD, sus variables y los deploy hooks;
- su proyecto de Neon, con el schema cargado a mano;
- las claves de API.

Ningún `plan` mío ve nada de eso. **Lo que haría distinto:** importar esos recursos a Terraform (`terraform import`), guardar el estado en un backend remoto y poner `prevent_destroy` en la base de producción.

### 3. De dónde sale cada dirección y el orden del destroy

- `DB_HOST`, `DB_NAME`, `DB_USER` y `DB_PASS` (las que lee `db.go`) salen de `neon_project`, `neon_database` y `neon_role`. Al recrear preprod, el host cambió y la api se conectó igual, sin que tocara nada.
- `BACKEND_URL` del front sale de `render_web_service.api.url`.
- `ALLOWED_ORIGINS` de la api no puede salir del front, porque el front ya depende de la api y se formaría un ciclo. Se arma con el nombre del servicio (`https://<nombre>.onrender.com`), y comprobé en el `output` que coincidiera.
- El destroy fue front → api → base → rol → proyecto: el grafo de esas referencias, recorrido al revés. Ese orden no lo escribió nadie.

Al recrearlo, Render devolvió las mismas URLs. La guía no lo había medido.

### 4. Problemas encontrados y cómo los resolví

- **El `#` en la línea `*.tfvars` de la guía:** en `.gitignore`, un `#` en medio de una línea no es un comentario, así que esa línea no ignoraba ningún archivo. Puse el comentario en una línea aparte.
- **Neon rechazó el proyecto con `org_id is required`:** una clave personal (*Account settings*) no sabe en qué organización crearlo. Usé una clave de la organización (*Organization settings → API keys*), sin tocar el HCL.
- **`invalid ownerID: usr-…` en Render:** el id que aparece en la URL del dashboard es el del usuario. El válido (`tea-…`) lo saqué de `GET /v1/owners`.
- **Mi app es Go, no .NET:** en lugar de `ConnectionStrings__Default` van las seis `DB_*` separadas, más `ALLOWED_ORIGINS`. Sin esa última, el login desde el front da 403 por CORS.
- **El e2e contra QA falló después del merge del PR #41**, que no tocaba la app: el panel Admin se quedó más de 60 s en «Cargando…» esperando a la api de QA. Re-corrí el job recién después de comprobar que QA respondía bien y que el mismo código había pasado en la corrida anterior. Pasó en verde hasta PROD.

### 5. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para ordenar la guía paso a paso, escribir el HCL (`main.tf`, `variables.tf`, `outputs.tf`) y el `.gitignore` adaptados a mi app, diagnosticar los errores de Neon, de Render y del e2e, y ayudarme a redactar esta sección.

Yo creé las claves y las cargué en mi terminal, así que nunca pasaron por la IA. También corrí todos los comandos de Terraform, hice el drift a mano en la consola de Neon, y abrí, mergeé y re-corrí el PR.

Lo verifiqué así:
- leí cada plan antes de escribir `yes`;
- miré el orden de las líneas `Destroying…`;
- revisé en las dos consolas que QA y PROD siguieran intactos;
- probé `/health`, `/courses` y el front de preprod.

---

## TP9 – DevSecOps y observabilidad

### Enlaces de este TP

- **`dependabot.yml`:** https://github.com/mateo-velasquez/ingsoft3-tp01/blob/main/.github/dependabot.yml
- **PR de Dependabot mergeado:** https://github.com/mateo-velasquez/ingsoft3-tp01/pull/65 · [corrida del merge hasta PROD](https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40387036348)
- **Sentry en el código:** https://github.com/mateo-velasquez/ingsoft3-tp01/pull/66
- **Tarjeta en el tablero:** https://github.com/mateo-velasquez/ingsoft3-tp01/issues/67
- **Release:** https://github.com/mateo-velasquez/ingsoft3-tp01/releases/tag/v9.0.0

### 1. El PR de Dependabot que mergeé

El **#65** actualiza `react-router-dom` de **7.8.2 a 7.18.4**. Me animé a mergearlo por tres cosas:
- es un **minor** (SemVer del TP6), así que no debería romper la forma de usar la librería;
- el changelog de esas versiones solo trae *Patch Changes*, sin breaking changes;
- el CI estaba en verde sobre el PR (build, tests, coverage y gate), y después del merge la cadena lo pasó por integración y e2e contra QA antes de llegar a PROD. La confianza no viene de leer el código de la librería: viene del pipeline que armé del TP4 al TP7.

No mergeé los **majors**: `eslint` 9 → 10 y `@vitejs/plugin-react` 5 → 6 quedaron en rojo en el CI, y `@babel/core` 7 → 8, `@babel/preset-react` 7 → 8 y `eslint-plugin-react-hooks` 5 → 7 cambian de versión mayor.

### 2. Lo que vi en producción

- **El monitor** (UptimeRobot, `HEAD /health` de PROD cada 5 minutos, aviso por mail): suspendí la api a las 13:26 y el mail de **DOWN llegó a las 13:28, a los 2 minutos**. Sin él me habría enterado cuando un usuario se quejara. Después de reactivarla, el **UP llegó a las 13:43**. El monitor quedó pausado.
- **La operación más usada:** `GET /user/subscriptions/:id`, con 0.0146 pedidos por minuto (el resto, menos de 0.01). En el front, *Navigation*: los cambios de página dentro de la app.
- **La operación más lenta:** `GET /courses`, con **P95 de 3.28 s** (P50 2.75 s). Con tan pocos pedidos, el primero después de que Render despierta el servicio infla el número. Con ese dato abrí la tarjeta #67 para la próxima versión.
- **El error:** *"Falla de prueba del TP9"*, de un endpoint `/falla` que hacía `panic` a propósito. Lo saqué en el [PR #68](https://github.com/mateo-velasquez/ingsoft3-tp01/pull/68).

### 3. Qué no mira cada pieza

| Pieza | Qué mira | Qué **no** mira | Quién cubre el hueco |
|---|---|---|---|
| Dependabot | Versiones nuevas y fallas publicadas de mis dependencias | Mi propio código, y fallas que todavía nadie publicó | CodeQL |
| CodeQL | Patrones inseguros en mi código y en los workflows | Si la app anda en producción, y los errores de lógica | Tests y Sentry |
| Push protection | Secretos con el formato de un proveedor conocido (tokens de GitHub, AWS…) | Una contraseña inventada, como la de la base | Variables de entorno en Render y la review del PR |
| Monitor | Si `/health` contesta | Errores o lentitud en las demás rutas | Sentry |
| Sentry | Los errores y tiempos de los pedidos que llegan | Si el servicio está caído: si no llega nada, no avisa | El monitor |

### 4. Problemas encontrados y cómo los resolví

- **`HEAD /health` daba 404 en PROD:** el plan gratis de UptimeRobot consulta con `HEAD`, y Gin no contesta `HEAD` en una ruta `GET`, así que el monitor la habría visto caída aunque anduviera. Agregué `HEAD` a `/health` en el [PR #61](https://github.com/mateo-velasquez/ingsoft3-tp01/pull/61).
- **CodeQL encontró 4 alertas *"Workflow does not contain permissions"*** en `ci.yml`. Les puse `permissions: contents: read` (mínimo privilegio) en el [PR #60](https://github.com/mateo-velasquez/ingsoft3-tp01/pull/60), y las 4 quedaron cerradas como *fixed*.
- **Cerré los PRs de Dependabot #44 a #59 sin mergear**, creyendo que ya tenía uno mergeado. El único era el mío, el del `dependabot.yml`, que no cuenta. Después analicé y mergeé el #65.
- **El UP no llegaba después de reactivar la api:** Render la había dormido y contestaba 503 mientras arrancaba. Abrí `/health` para despertarla y el UP llegó al minuto.
- **El error llegó a Sentry sin archivo ni línea:** un `panic` con un texto se manda como mensaje, no como excepción. La entrega pide ver un error, así que lo dejé así.
- **Sentry muestra 0 usuarios:** el SDK no manda IPs ni datos personales si no se le pide.
- **En el merge del #65, el e2e se colgó** unos 4 minutos instalando el navegador. Lo cancelé y lo re-corrí, y pasó en verde hasta PROD.

### 5. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) para ordenar la guía paso a paso, escribir el `dependabot.yml`, los `permissions` del CI, el cambio de `/health` y la instalación de Sentry en el back y en el front, analizar los PRs de Dependabot y ayudarme a redactar esta sección.

Yo prendí las protecciones en *Settings*, creé las cuentas de UptimeRobot y Sentry, cargué el DSN del backend como variable `SENTRY_DSN` solo en PROD (nunca pasó por el código), provoqué la caída, y abrí y mergeé los PRs.

Lo verifiqué así:
- vi las 4 alertas de CodeQL cerradas como *fixed* después del merge;
- probé `HEAD /health` en PROD antes y después del cambio;
- recibí los mails de DOWN y UP y miré el incidente en el historial del monitor;
- llamé a `/falla` y vi el error en Sentry, y después comprobé que daba 404;
- miré las tablas de tiempos y uso en Sentry.
