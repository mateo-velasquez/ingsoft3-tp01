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
