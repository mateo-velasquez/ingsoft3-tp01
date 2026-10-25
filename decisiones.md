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

**Paquetes públicos del registry** (los dos etiquetados con el commit del merge del PR #27, `sha-4c9905ff200e2cb039d8b7d6cdc26be4c7db2633`):

- **Backend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend
- **Frontend:** https://github.com/mateo-velasquez/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend

```bash
docker pull ghcr.io/mateo-velasquez/ingsoft3-tp01-backend:sha-4c9905ff200e2cb039d8b7d6cdc26be4c7db2633
docker pull ghcr.io/mateo-velasquez/ingsoft3-tp01-frontend:sha-4c9905ff200e2cb039d8b7d6cdc26be4c7db2633
```

**La cadena del registry:**

| Qué prueba | Link |
|---|---|
| PR #27 con los tests en verde y «Entrar al registry» **salteado**: sólo `main` publica | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40156283886/job/121058269832 |
| Corrida de `main` donde «Construir y publicar la imagen» es el **último paso**, después de los tests | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40156759176/job/121059675312 |

**URLs de los entornos:**

| Entorno | Frontend | Backend |
|---|---|---|
| **QA** | https://course-page-front-qa.onrender.com | https://course-page-api-qa.onrender.com |
| **PROD** | https://course-page-front-prod.onrender.com | https://course-page-api-prod.onrender.com |

Están en el free tier de Render: si nadie entró en los últimos ~15 minutos, el primer pedido tarda
hasta un minuto en contestar (sección 6). `/health` en cualquiera de las dos api dice qué commit
está corriendo.

**El gate hacia PROD:**

| Qué prueba | Link |
|---|---|
| Rechazo con motivo: QA en verde y `deploy-prod` rechazado | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40220600053 |
| Flujo completo: QA verde → *Waiting for review* → aprobación → PROD desplegado y smoke verde | https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40222464413 |

### 1. Por qué el artefacto se publica sólo con la verificación en verde

Hasta el TP5 el pipeline verificaba y no dejaba nada: la imagen se construía adentro del runner y desaparecía con él. Ahora cada job de build termina publicando su imagen en `ghcr.io`, etiquetada con el commit que la produjo (`sha-<commit>`).

Que en el registry sólo haya imágenes verificadas no depende de un control nuevo, sino de encadenar tres cosas:

1. **Nada entra a `main` sin el pipeline en verde:** `build-backend` y `build-frontend` son *required checks* (TP4), y adentro de cada uno corre el umbral de cobertura (TP5).
2. **Sólo lo que entra a `main` se publica:** el paso de publicar tiene `push: ${{ github.event_name == 'push' && github.ref == 'refs/heads/main' }}`, y el login al registry tiene `if: github.event_name == 'push'`. En un PR la imagen se construye pero no se sube. Pongo las dos condiciones y no sólo la del evento porque, si mañana el workflow escucha otra rama, un push a esa rama no publicaría nada sin pasar por un PR.
3. **Publicar es el último paso del mismo job que corre los tests:** moví el build de la imagen final, que en el TP4 estaba antes de los tests, al final del job. Si un test falla, el job muere ahí y el paso de publicar nunca corre. No hay ningún `if` que diga «si los tests pasaron»: la condición está en el orden de los pasos. Por eso los pasos que publican no llevan `!cancelled()` ni `always()`, a diferencia de los del reporte de coverage.

Sin el tercero, los otros dos no alcanzan: un pipeline que publica antes de testear cumple 1 y 2, y el registry se llena de imágenes rotas. Es también la razón por la que la imagen se publica en el mismo paso que la construye y no en un job aparte: un job aparte tendría que volver a construirla, y lo publicado sería una reconstrucción y no lo verificado.

**Qué dejaría de significar el registry si se publicara igual con los tests en rojo:** «estar publicado» dejaría de querer decir «pasó la verificación». El registry pasaría a ser un depósito de cosas que alguien construyó alguna vez, y no se podría desplegar nada de ahí sin volver a verificarlo.

**Qué no garantiza la cadena:** que todo lo que hay en el registry venga del pipeline. Con permisos sobre el paquete, cualquiera puede subir una imagen a mano con `docker push`. La cadena garantiza lo que publica **el pipeline**; por eso la garantía es «nada llega por accidente sin verificar», no «nada puede llegar».

**Permisos:** `packages: write` está declarado **por job** y no a nivel del workflow, por mínimo privilegio. `contents: read` va junto porque lo que no se lista queda sin permiso, y sin él el checkout no puede leer el código. La credencial es el `GITHUB_TOKEN` que GitHub le da a cada corrida: no hizo falta ningún secret nuevo.

**La imagen de la base de datos no se publica.** `course-page/database/Dockerfile` es la imagen oficial de Postgres más mis scripts de inicialización; no tiene tests ni la construye el pipeline. Los artefactos del TP son las dos imágenes de la app: backend y frontend.

### 2. Dos entornos reales

**Dónde corre cada cosa.** Los dos entornos son iguales y no comparten nada salvo el código:

| | QA | PROD |
|---|---|---|
| Frontend (Render, Docker) | `course-page-front-qa` | `course-page-front-prod` |
| Backend (Render, Docker) | `course-page-api-qa` | `course-page-api-prod` |
| Base (Neon, Postgres 17) | `app_qa` | `app_prod` |

Los cuatro servicios tienen **Auto-Deploy en Off**: Render no despliega solo cuando cambia `main`,
sólo cuando lo llama el pipeline por el deploy hook (sección 4).

**Por qué migré de MySQL a Postgres.** El free tier que propone la guía para la base es Neon, que es
sólo Postgres. Mi app venía con MySQL, y tenía dos caminos: buscar un MySQL gratis o migrar. Elegí
migrar porque el cambio era chico y quedaba acotado: GORM v1 tiene el dialecto de Postgres, así que
en el código cambió la conexión (`db/db.go`) y las búsquedas, que pasaron de `LIKE` a `ILIKE` para
seguir sin distinguir mayúsculas. El trabajo grande fue el schema (`create_tables.sql`): los `ENUM`
pasaron a `CHECK`, el `AUTO_INCREMENT` a `IDENTITY`, y el trigger que recalcula el rating del curso
lo reescribí en PL/pgSQL. Además agregué un trigger que reemplaza el `id = 0` por el siguiente de la
secuencia, porque GORM v1 manda el 0 en los inserts y MySQL lo interpretaba como «generalo vos»;
Postgres lo guardaría literal.

El schema se carga a mano en cada base desde el SQL Editor de Neon, antes del primer deploy. No lo
crea la app: el `AutoMigrate` de GORM v1 no entiende las etiquetas `primaryKey` y `autoIncrement` de
los modelos (son de GORM v2), así que la fuente de verdad del schema es el `.sql`.

**No usé el Postgres de Render** porque su base gratuita vence a los 30 días de creada, y el TP tiene
que seguir vivo hasta la defensa. La de Neon es permanente, con límites de uso.

**Qué quedó por variable y qué quedó adentro de la imagen.** El criterio fue: adentro de la imagen
va lo que es igual en todos los entornos, y por variable lo que cambia de un entorno a otro.

| Servicio | Por variable de entorno | Adentro de la imagen |
|---|---|---|
| Frontend (nginx) | `BACKEND_URL` (a qué api reenvía `/api`), `DNS_RESOLVER`, `PORT` | Los estáticos compilados por Vite y la plantilla de nginx |
| Backend (Go) | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SSLMODE`, `ALLOWED_ORIGINS` (el front del mismo entorno), `PORT` | El binario |

La dirección del backend no está en el código del front: el front siempre pide a `/api/...` (una ruta
relativa), y es nginx el que reenvía. La plantilla `default.conf.template` tiene
`set $backend_api ${BACKEND_URL};`, y la imagen oficial de nginx reemplaza la variable al arrancar.
Por eso la misma imagen sirve en compose (donde `BACKEND_URL` es `http://backend:8080`, el default
del Dockerfile) y en Render (donde es la URL https de la api de ese entorno). Lo mismo con
`DNS_RESOLVER`: en compose es el DNS interno de Docker (`127.0.0.11`) y en Render uno público.

`PORT` también va por variable porque Render le dice a cada servicio en qué puerto escuchar. El
backend cae en 8080 y el front en 80 si no está seteado, que es lo que usa compose.

Esto es lo que hace posible el TP7: para desplegar **una misma imagen** en los dos entornos, nada de
lo que distingue a QA de PROD puede estar horneado adentro.

**Cómo comprobé que las bases están separadas de verdad.** Desde el SQL Editor de Neon inserté una
categoría «SOY PROD» sólo en `app_prod`. La api de PROD devuelve 51 categorías con «SOY PROD»
incluida; la de QA devuelve 50 y no la tiene. Si las dos api apuntaran a la misma base, el dato
aparecería en las dos.

**Lo que no persiste.** Las imágenes y archivos que suben los usuarios se guardan en el disco del
contenedor del backend (`/app/images` y `/app/files`), y en el free tier de Render ese disco se
borra en cada deploy. Además las imágenes de los datos de ejemplo no están en la imagen (el
Dockerfile sólo crea las carpetas vacías), así que en Render los cursos de la semilla se ven sin
foto: el front pide `/api/images/Image-N.jpg` y la api responde 404. La solución real sería guardar
los archivos en un almacenamiento externo (un bucket), y no entra en este TP.

### 3. Continuous Delivery, no Continuous Deployment

Implementé **Continuous Delivery**: cada merge a `main` llega solo hasta QA, y para llegar a PROD
alguien tiene que aprobar. En Continuous Deployment el mismo merge llegaría a PROD sin intervención.

Corresponde a mi contexto porque la verificación automática que tengo no alcanza para confiarle PROD
sin mirar:

- Los tests son unitarios sobre la lógica (TP5). No hay tests de integración contra una base real ni
  tests end-to-end (eso es el TP7). Un cambio en el schema o en una consulta pasa el pipeline en
  verde.
- El smoke test comprueba que el entorno contesta, no que la app funciona (sección 8).
- No tengo observabilidad en PROD: ni métricas de errores ni alertas. Si un deploy rompe algo que el
  smoke no mira, me entero cuando alguien lo usa.

Con eso, desplegar solo a PROD sería apostar a que lo que no se verifica no se rompe. El gate humano
compra un momento para mirar QA funcionando con el cambio antes de decidir. Pasaría a Continuous
Deployment cuando el pipeline verificara lo que hoy miro a mano: tests end-to-end contra QA y una
forma de detectar y revertir un deploy malo sin que alguien lo note primero.

### 4. Diseño de la cadena y alcance de los secrets

La cadena completa está en un solo workflow (`.github/workflows/ci.yml`), y cada eslabón depende del
anterior:

```
build-backend ─┐
               ├─► deploy-qa ──► ⏸ aprobación ──► deploy-prod
build-frontend ┘
```

- **`needs: [build-backend, build-frontend]`** en `deploy-qa`: si un test falla, el build no termina
  y no hay deploy. Es la misma garantía de la sección 1 (sin verificación no hay artefacto) llevada un
  paso más.
- **`if: github.ref == 'refs/heads/main'`** en `deploy-qa`: los PRs verifican, sólo `main` despliega.
  En un PR, `deploy-qa` aparece como salteado.
- **`needs: [deploy-qa]`** en `deploy-prod`: a PROD sólo llega un commit que ya está corriendo en QA
  y pasó el smoke. No le puse un `if` propio porque no le hace falta: si `deploy-qa` se saltea, todo lo
  que depende de él también.
- **`environment: production`** en `deploy-prod`: el environment tiene un *required reviewer* (yo),
  así que el job se pausa en *Waiting for review* hasta que alguien aprueba o rechaza. *Prevent
  self-review* está desactivado: si no, no podría aprobar mis propios deploys.
- **`&ref=$GITHUB_SHA`** en los dos deploy hooks: Render despliega el commit de esta corrida, no la
  punta de `main`. En PROD es lo que hace que la aprobación signifique algo: entre que el job queda
  esperando y que alguien aprueba pueden pasar horas y entrar otros merges. Sin el `&ref`, se aprueba
  un commit y a PROD sube otro.
- **`concurrency`** en los dos deploys, con `cancel-in-progress: false`: si entran dos merges
  seguidos, el segundo deploy espera a que termine el primero. Si lo cancelara, el smoke del primero
  quedaría esperando un commit que no va a llegar.

**Alcance de los secrets.** Los únicos secrets son los cuatro deploy hooks de Render, que son URLs
con una clave: quien tiene la URL puede desplegar ese servicio. Cada par vive en su environment, no a
nivel del repo:

| Secret | Dónde vive | Quién lo puede leer |
|---|---|---|
| `RENDER_HOOK_API_QA`, `RENDER_HOOK_FRONT_QA` | Environment `qa` | Sólo un job que declara `environment: qa` |
| `RENDER_HOOK_API_PROD`, `RENDER_HOOK_FRONT_PROD` | Environment `production` | Sólo un job que declara `environment: production`, **y recién después de la aprobación** |

Lo segundo es la diferencia importante: mientras el job de PROD está en *Waiting for review* todavía
no arrancó, así que ningún paso tiene acceso a los hooks de PROD. Si estuvieran a nivel del repo,
cualquier job de cualquier workflow los podría leer sin pasar por el gate. Los hooks de PROD
apuntan a los servicios `-prod`: lo comprobé comparando el id del servicio en la URL del hook con el
de la página del servicio en Render.

Las credenciales de la base (`DB_PASS` y compañía) no pasan por GitHub: están cargadas como
variables de entorno de cada servicio en Render, y el pipeline nunca las ve.

### 5. Qué mira el aprobador antes de aprobar

Aprobar no es tocar el botón cuando aparece. Antes de aprobar miro:

1. **Qué cambia el merge.** El PR que lo generó: si toca el schema, la conexión a la base o la
   configuración de los entornos, lo miro con más cuidado que un cambio de texto, porque el smoke no
   lo cubre y en PROD hay datos que no puedo regenerar.
2. **Que QA corra ese commit.** `/health` de QA tiene que decir el mismo commit que la corrida. El
   smoke ya lo comprueba, pero miro cuántos intentos tardó: un smoke que pasa en la última vuelta es
   una señal de que algo anda lento.
3. **Que QA funcione con el cambio.** Entro al front de QA y pruebo lo que el cambio toca, más el
   login, que es el camino que más usa la app.
4. **Qué hay en PROD hoy.** `/health` de PROD: si está varios commits atrás, este deploy sube todos
   esos cambios juntos, y tengo que mirarlos a todos, no sólo el último.
5. **Que no haya otro merge en camino.** Si sé que entra otro cambio en minutos, prefiero esperar y
   aprobar los dos juntos que hacer dos deploys seguidos.

**El rechazo** de la corrida
[40220600053](https://github.com/mateo-velasquez/ingsoft3-tp01/actions/runs/40220600053) salió de
los puntos 1 y 4: era el merge que agregaba el propio job de PROD, o sea la primera vez que el
pipeline iba a llamar a los hooks de producción, y PROD seguía dos commits atrás (en el merge del
PR #30). El motivo quedó escrito en la corrida.

**Qué no puede ver mi aprobador.** Sólo ve lo que yo puedo mirar a mano en QA: no hay métricas, ni
logs centralizados, ni tasa de errores de PROD para comparar antes y después. Tampoco ve si el cambio
funciona con los datos de PROD, que son otros que los de QA. El gate depende de que la persona que
aprueba mire; si aprueba sin mirar, es un trámite.

### 6. La letra chica del free tier, y cómo la maneja el pipeline

| Plataforma | Qué limita | Cómo me afecta | Cómo lo maneja el pipeline |
|---|---|---|---|
| Render | El servicio se duerme a los ~15 min sin tráfico, y el primer pedido lo despierta con un *cold start* de hasta ~1 min | Un curl sin espera daría error aunque el entorno esté bien | El smoke reintenta 30 veces cada 20 s (10 min) y cada curl tiene `--max-time 10`, porque un servicio despertando acepta la conexión y no contesta |
| Render | El hook responde al instante, pero el deploy es asincrónico: construye la imagen y recién después cambia de versión, y mientras tanto sigue sirviendo la vieja | El smoke podría dar verde contra la versión anterior | El smoke espera a que `/health` diga el commit de la corrida (sección 8) |
| Render | 750 horas de instancia por mes **por workspace**, compartidas entre los cuatro servicios, y minutos de build limitados | Cuatro servicios despiertos todo el mes no entran; cada deploy construye dos imágenes por entorno | Los servicios duermen cuando no se usan, y sólo `main` despliega: los PRs construyen en GitHub, no en Render |
| Render | El disco del contenedor no persiste entre deploys | Se pierden los archivos subidos (sección 2) | No lo maneja: queda como deuda |
| Neon | El cómputo se suspende a los ~5 min sin uso, 0.5 GB de almacenamiento y horas de cómputo por mes | La primera consulta después de un rato tarda más | El mismo reintento del smoke lo cubre; los datos son pocos y entran de sobra |

### 7. Qué garantía pierdo porque Render reconstruye desde el repo

El pipeline publica en `ghcr.io` la imagen verificada (sección 1), pero Render **no la usa**: el hook
le dice qué commit desplegar, y Render clona el repo y construye su propia imagen con el Dockerfile.
Lo que corre en QA y en PROD es una reconstrucción del mismo código, no el artefacto que pasó los
tests.

Lo que se pierde es la garantía de que **lo que corre es exactamente lo que se verificó**:

- El build de Render no corre los tests: construye sólo la etapa final del Dockerfile.
- Mis imágenes base tienen tags que se mueven (`nginx:alpine`, `alpine:3.21`, `golang:1.26-alpine`).
  Si entre el build de GitHub y el de Render sale una versión nueva de alguna, el resultado es
  distinto con el mismo código.
- QA y PROD son **dos builds separados** del mismo commit, posiblemente en momentos distintos (el de
  PROD sale después de la aprobación). Lo que aprobé mirando QA no es, bit por bit, lo que llega a
  PROD.

Lo que sí se mantiene es el código: el `&ref=$GITHUB_SHA` asegura que los dos entornos construyen el
commit que pasó la verificación. La garantía pasa de «el mismo artefacto» a «el mismo código fuente».
Para recuperarla, Render tendría que desplegar la imagen de `ghcr.io` por su digest en vez de
construir. Eso es lo que hace el TP7.

### 8. Qué prueba el smoke test y qué no

El smoke corre después de cada deploy y falla el job si en 10 minutos no se cumplen las cuatro
condiciones juntas:

| Pedido | Qué prueba |
|---|---|
| `/health` de la api devuelve el commit de la corrida | El proceso está vivo **y es la versión nueva**. Render deja `RENDER_GIT_COMMIT` en el entorno y `/health` lo devuelve |
| `/courses` de la api | La api llega a la base: las credenciales, el host y el schema están bien |
| `/` del front | nginx está sirviendo los estáticos |
| `/api/health` del front | El proxy del front llega a la api de su entorno: `BACKEND_URL` y `DNS_RESOLVER` están bien |

La guía avisa que un smoke que sólo pide `/health` contesta pero no dice qué versión corre: como
Render sigue sirviendo la versión vieja mientras construye la nueva, daría verde contra el commit
anterior. Por eso mi `/health` devuelve el commit, y el smoke compara. `/health` no toca la base a
propósito: si lo hiciera, una base caída mostraría el proceso como muerto. Para la base está
`/courses`.

**Lo que no prueba:**

- **Que la app funcione.** Son cuatro GET. No prueba el login, ni las inscripciones, ni ningún
  camino que escriba en la base.
- **El CORS.** El smoke no manda `Origin`, así que un `ALLOWED_ORIGINS` mal cargado pasa en verde. Me
  pasó (sección 11): el login daba 403 con el smoke contento.
- **Que el front haya compilado bien.** Que `/` conteste 200 no dice que el JavaScript ande.
- **Que el front sea la versión nueva.** El commit lo comprueba sólo en la api. El front no tiene
  un `/health` propio que devuelva su commit.
- **Que siga andando después.** Es una foto del momento del deploy, no un monitoreo.

### 9. Qué deployment pattern usaría en una producción real

Usaría **blue-green**: dos copias de PROD, una con la versión actual (la que recibe el tráfico) y otra
con la nueva. La nueva se levanta y se verifica sin usuarios, y recién después se mueve todo el tráfico
de una a la otra. Si algo sale mal, se vuelve a mover el tráfico a la vieja, que sigue levantada.

**Por qué ése y no los otros:**

| Pattern | Por qué no (o por qué sí) para esta app |
|---|---|
| **Blue-green** ✅ | La app corre en una sola instancia por servicio y es chica: duplicarla durante el cambio cuesta poco. El rollback es instantáneo porque la versión vieja sigue levantada, y no pide nada que hoy no tenga para decidir: alcanza con verificar la copia nueva antes de mover el tráfico |
| Canary | Manda un porcentaje del tráfico a la versión nueva y compara. Para que sirva hacen falta dos cosas que no tengo: un balanceador que reparta por porcentaje, y métricas de errores y latencia por versión para saber si el canario está peor. Sin métricas, un canary es un blue-green lento |
| Rolling | Reemplaza las instancias de a una. Con una sola instancia por servicio no hay nada que rotar: es un deploy común |
| Feature flags | No reemplazan a ninguno: sirven para apagar una funcionalidad sin desplegar. Los sumaría para los cambios grandes, pero el problema que resuelve el pattern (cómo cambio la versión sin cortar) sigue estando |

En parte Render ya hace algo parecido: levanta la versión nueva, espera que el health check conteste
y recién ahí deja de mandarle tráfico a la vieja. Por eso un deploy no corta el servicio. Lo que no
tengo es la copia vieja **esperando**: después del cambio se apaga, y volver atrás es un deploy nuevo
(sección 10).

**Costo.** Dos copias del backend y del front durante el cambio. Para esta app son instancias chicas,
y la copia vieja se puede apagar cuando la nueva lleva un rato estable.

**Riesgo: la base es una sola.** Blue y green hablan con la misma base, así que durante el cambio las
dos versiones la usan a la vez. Eso obliga a que los cambios de schema sean compatibles hacia atrás:
primero se agrega lo nuevo (una columna, una tabla) sin sacar lo viejo, se despliega la versión que lo
usa, y recién en un deploy posterior se borra lo que ya no se usa. Si no, volver a blue no sirve: la
versión vieja no entiende la base nueva.

**Qué observabilidad me falta para ejecutarlo:**
- Un health check que pruebe más que «el proceso contesta»: por ejemplo, que la base responde y que el
  login funciona, para decidir si green está lista.
- Métricas de errores (5xx) y de latencia, antes y después del cambio, para saber si green está peor
  que blue. Hoy sólo tengo los logs de Render, y los miro a mano.
- Alertas: que algo me avise si después del cambio suben los errores, en vez de enterarme por un
  usuario.

### 10. Plan de rollback actual, con el tiempo medido

**Lo probé de verdad una vez**, en PROD, volviendo del merge del PR #33 (`d3edad5`) al del PR #30
(`a9fa061`), y después volviendo a `d3edad5`. Usé el botón **Rollback** de Render, que vuelve a poner
en marcha la imagen que ya había construido para ese deploy, sin reconstruir.

| Servicio | Deploy | Disparado por | Duración en Render |
|---|---|---|---|
| `course-page-api-prod` | `a9fa061` | **Rollback** | **10.9 s** |
| `course-page-front-prod` | `a9fa061` | **Rollback** | **10.8 s** |
| `course-page-api-prod` | `d3edad5` | Deploy Hook (el pipeline) | 24.1 s |
| `course-page-front-prod` | `d3edad5` | Deploy Hook (el pipeline) | 23.3 s |

Los números salen de *Deploys* de cada servicio en Render. Mientras tanto, consulté `/health` de la
api de PROD cada 5 s: pasó de `d3edad5` a `a9fa061` sin dejar de contestar, y `/api/health` del front
siguió devolviendo 200, salvo un par de pedidos que tardaron más de 10 s. Render no apaga la versión
vieja hasta que la nueva está lista.

El rollback tarda menos de la mitad que un deploy porque no construye. El deploy del pipeline
reconstruye la imagen (sección 7), y si Render no tuviera la cache del build anterior tardaría más:
el primer deploy de la api tardó 1m10s.

**Paso a paso, si un deploy aprobado sale mal:**

1. **Decidir volver.** Lo veo porque el smoke de PROD falla, porque `/health` de PROD no responde, o
   porque probando la app algo no anda. Si dudo, vuelvo: el rollback cuesta 11 segundos y se puede
   deshacer.
2. **Rollback de la api.** Render → `course-page-api-prod` → *Deploys* → en la fila del último deploy
   bueno, **Rollback** → *Rollback to this deploy*. El último deploy bueno es el anterior en la lista,
   y su commit es el de la release anterior.
3. **Rollback del front**, igual, en `course-page-front-prod`.
4. **Verificar.** `/health` de la api de PROD tiene que decir el commit al que volví, y el login tiene
   que funcionar desde el front de PROD.
5. **Arreglar `main`.** El rollback de Render no toca el repo: `main` sigue teniendo el commit malo,
   y el próximo merge aprobado lo volvería a subir junto con lo nuevo. Hay que revertirlo con un PR
   (`git revert`), que pasa por el mismo pipeline y el mismo gate.

**Cuánto tarda:** la parte de Render, unos 11 segundos por servicio, medido. A eso se suma el tiempo
de llegar a la pantalla y tocar los botones de los dos servicios, que en la prueba fue de un par de
minutos. Lo que no está en ese número es el tiempo de **darse cuenta**: sin alertas (sección 9), eso
depende de que alguien mire.

**Plan B, sin el dashboard.** Los mismos deploy hooks de PROD que usa el pipeline, con el commit
anterior: `curl "$HOOK&ref=<sha-anterior>"`. Funciona igual, pero reconstruye la imagen, así que
tarda lo que un deploy (unos 24 s con cache).

**Lo que el rollback no deshace: los datos.** El rollback vuelve el **código** a la versión anterior.
La base sigue igual:

- Lo que la versión mala escribió en la base se queda: filas creadas, modificadas o borradas.
- Si la versión mala cambió el schema (sacó una columna, cambió un tipo), la versión vieja vuelve a una
  base que no entiende, y el rollback la rompe en vez de arreglarla. Por eso los cambios de schema
  tienen que ser compatibles hacia atrás (sección 9).
- Los archivos que los usuarios subieron mientras corría la versión mala se pierden igual con el
  rollback, porque el disco del contenedor no persiste (sección 2).
- Render avisa que el rollback también revierte «ciertos cambios de configuración»: si entre los dos
  deploys cambié una variable de entorno, también vuelve.

Para poder volver atrás los datos haría falta un backup de la base de antes del deploy, o usar la
restauración a un punto en el tiempo de Neon, que en el free tier sólo cubre una ventana corta. Y
aun así, restaurar la base borra lo que los usuarios hicieron de bueno después del deploy, así que no
es un botón de deshacer: es una decisión aparte.

### 11. Problemas encontrados y cómo los resolví

**El login de QA daba 403.** Los GET andaban y el login no. Era la misma pista que en el TP2: el 403
venía del middleware de CORS, porque el navegador manda `Origin` en el POST del login y no en los
GET. Pero esta vez la lista de orígenes salía de `ALLOWED_ORIGINS`, y la variable estaba cargada.
El problema era el valor: le había puesto la URL de la **api** de QA, y tenía que ser la del
**front**, que es desde donde viene el pedido. El smoke no lo detectó porque no manda `Origin`
(sección 8).

**El schema no lo crea la app.** Supuse que el `AutoMigrate` de GORM creaba las tablas al arrancar,
pero los modelos usan etiquetas de GORM v2 (`primaryKey`, `autoIncrement`) y la app usa GORM v1, que
no las entiende. La fuente de verdad del schema es `create_tables.sql`, y lo cargué a mano en
`app_qa` y `app_prod` desde el SQL Editor de Neon antes del primer deploy.

**GORM v1 manda `id = 0` en los inserts.** MySQL lo interpretaba como «generalo vos»; Postgres lo
guardaría como 0, y el segundo insert chocaría con la clave. Lo resolví con un trigger en el schema
que reemplaza el 0 por el siguiente valor de la secuencia.

**nginx no puede leer la dirección del backend de una variable directamente.** La configuración de
nginx es un archivo fijo. Usé la plantilla de la imagen oficial (`/etc/nginx/templates/`), que
reemplaza las `${VARIABLE}` al arrancar. Si se copia a `conf.d/` en vez de `templates/`, nginx lee las
`${…}` literales y no arranca.

**Neon ofrece la conexión con *pooling* por defecto.** La desactivé y usé el host directo (sin
`-pooler`): cada entorno es un solo proceso que ya mantiene su propio pool de conexiones
(`database/sql`), así que el pooler de Neon sería una capa más sin nada que aportar.

**La rama por defecto de Neon se llama «production».** Es el nombre que Neon le pone a la rama
principal del proyecto, y no tiene nada que ver con mi PROD: las dos bases, `app_qa` y `app_prod`,
viven en esa misma rama. Lo que separa los entornos es la base, no la rama de Neon.

**Las fotos de los cursos dan 404 en Render.** Las imágenes de la semilla no están dentro de la
imagen del backend (sección 2). No lo resolví: queda como deuda.

### 12. Declaración de uso de IA

Usé Claude (Claude Code, dentro de VS Code) como asistente. **Supervisé todo el trabajo en cada paso:
nada de este práctico lo hizo la IA por su cuenta ni lo acepté sin revisarlo.**

Dónde usé la IA:

- Leer la guía y ordenar las tareas en una secuencia de Pull Requests.
- Evaluar cuánto costaba migrar de MySQL a Postgres, y escribir la migración (el schema, la conexión y
  las búsquedas).
- Escribir los cambios para que la app se configure por entorno (`/health`, `PORT`,
  `ALLOWED_ORIGINS` y la plantilla de nginx) y los jobs `deploy-qa` y `deploy-prod` del `ci.yml`.
- Guiarme paso a paso en las pantallas de Neon, Render y GitHub.
- Acotar el 403 del login: que la variable se estaba leyendo y el problema era su valor. El valor
  equivocado lo encontré yo.
- Ayuda de redacción en este archivo.

Qué hice yo, y no la IA:

- Toda la configuración de las plataformas: el proyecto y las bases de Neon, los cuatro servicios de
  Render con sus variables, y los environments de GitHub con sus secrets. Los secrets nunca pasaron
  por la IA: los copié directo de Render a GitHub.
- Los commits, los push, las ramas y los merges, con los comandos que me daba la IA.
- Las decisiones del gate: rechazar la primera corrida con mi motivo y aprobar la segunda después de
  revisar QA.
- El rollback en Render y la vuelta a la versión aprobada.

Cómo lo verifiqué: probé el login desde los dos fronts; comprobé que las bases están separadas con el
dato «SOY PROD»; seguí cada corrida en *Actions* (el PR con los deploys salteados, `main` desplegando
a QA, el rechazo y la aprobación); y comprobé en Render y en `/health` qué commit corría en cada
entorno después de cada deploy y del rollback. Puedo explicar qué pasa entre el merge y PROD: cada
`needs`, el gate del environment, qué secret lee cada job y cuándo, y qué espera el smoke test.
