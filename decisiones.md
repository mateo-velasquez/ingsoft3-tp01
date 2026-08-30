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
