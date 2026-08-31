# 📘 Documentación de Desarrollo del Frontend (LMS)

## 🛠️ Tecnologías a utilizar

* **React**: Librería principal para la construcción de la interfaz.
* **JavaScript (ES6+)**: Lenguaje de programación base.
* **CSS Puro**: Para los estilos iniciales, estructurados de forma modular y fácilmente migrables a **TailwindCSS** en el futuro.
* **Vite**: Herramienta de build y servidor de desarrollo rápido.
* **Fetch API**: Para la comunicación con el backend en Golang.
* **Babel**: Para asegurar compatibilidad de JS en distintos navegadores.

---

## 📂 Estructura de carpetas

```
frontend-lms/
├── public/                  # Archivos estáticos
├── src/
│   ├── assets/              # Imágenes, íconos, fuentes
│   ├── components/          # Componentes reutilizables (Botones, Inputs, Cards)
│   ├── pages/               # Vistas principales (Home, Login, Curso, Mis Cursos)
│   ├── services/            # Llamadas a la API con Fetch
│   ├── hooks/               # Custom hooks (ej. autenticación, cursos)
│   ├── styles/              # Estilos globales y variables CSS
│   ├── App.jsx              # Punto de entrada de React
│   ├── main.jsx             # Renderizado principal con ReactDOM
│   └── router.jsx           # Configuración de rutas con React Router
├── index.html               # HTML base
├── package.json             # Dependencias
├── vite.config.js           # Configuración de Vite
└── .babelrc                 # Configuración de Babel
```

---

## 🎨 Estilos (CSS)

Los estilos se desarrollarán en **CSS puro**, pero con una **estructura utilitaria inspirada en Tailwind**, para que la futura migración sea sencilla.

### Convenciones de clases:

* **Flex y Grid**: `.flex`, `.grid`, `.items-center`, `.justify-between`
* **Espaciado**: `.p-4`, `.m-2`, `.gap-4`
* **Tipografía**: `.text-lg`, `.font-bold`, `.text-gray`
* **Colores**: Definidos en `:root` dentro de `styles/variables.css`
* **Componentes**: Cada página o componente tendrá su propio archivo de estilos en `styles/`

Ejemplo de variables CSS:

```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-bg: #f9fafb;
  --color-text: #111827;
}
```

Ejemplo de clase utilitaria:

```css
.btn-primary {
  background-color: var(--color-primary);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}
```

---

## 🔗 Comunicación con el Backend (Fetch API)

Se creará una capa de servicios en `src/services/` para organizar las peticiones.

Ejemplo de servicio:

```javascript
export async function fetchCursos() {
  const response = await fetch("http://localhost:8080/api/cursos", {
    headers: {
      "Authorization": `Bearer ${localStorage.getItem("token")}`
    }
  });
  if (!response.ok) throw new Error("Error al obtener cursos");
  return await response.json();
}
```

---

## 📋 Funcionalidades del Frontend

### Regularidad (Primera entrega)

✅ Autenticación de usuarios (Login: alumno y administrador)
✅ Home con listado de cursos disponibles
✅ Búsqueda de cursos por palabra clave/categoría
✅ Inscripción a cursos con confirmación

### Examen Final (Entrega completa)

✅ Gestión de cursos (crear, editar, eliminar) por administradores
✅ Seguridad en toda la aplicación (tokens JWT)
✅ Listado de "Mis cursos" para cada usuario
✅ Sistema de comentarios y valoraciones
✅ Subida de archivos por parte de los usuarios
✅ Dockerización del frontend junto con el backend

---

## 📌 Criterios de Evaluación (Frontend)

* [ ] Formulario de login visible y funcional
* [ ] Home con listado y búsqueda de cursos
* [ ] Detalle de curso completo
* [ ] Inscripción con feedback al usuario
* [ ] Página de "Mis cursos"
* [ ] Formulario de comentarios
* [ ] Subida de archivos
* [ ] Gestión de cursos para administradores

---

## 🚀 Ejecución del proyecto

```bash
# 1. Crear proyecto con Vite
npm create vite@latest frontend-lms --template react

# 2. Instalar dependencias
cd frontend-lms
npm install

# 3. Instalar Babel
npm install --save-dev @babel/core @babel/preset-env @babel/preset-react

# 4. Configurar Babel (.babelrc)
{
  "presets": ["@babel/preset-env", "@babel/preset-react"]
}

# 5. Ejecutar en desarrollo
npm run dev
```

---

📖 **Este documento servirá como guía base para el desarrollo del frontend del LMS, alineado con las condiciones del examen final.**
