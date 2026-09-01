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
