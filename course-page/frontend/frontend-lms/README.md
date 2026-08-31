# LMS Platform Frontend

Frontend para la plataforma de gestión de aprendizaje (LMS) desarrollado en React con Vite.

## 🚀 Tecnologías Utilizadas

- **React 18** - Librería principal para la interfaz de usuario
- **React Router DOM** - Navegación y rutas
- **Vite** - Herramienta de build y servidor de desarrollo
- **CSS Puro** - Estilos con sistema utilitario inspirado en Tailwind
- **Fetch API** - Comunicación con el backend
- **Babel** - Compatibilidad de JavaScript

## 📁 Estructura del Proyecto

```
src/
├── assets/              # Recursos estáticos
├── components/          # Componentes reutilizables
│   ├── Layout.jsx       # Layout principal
│   ├── Header.jsx       # Cabecera
│   ├── Footer.jsx       # Pie de página
│   ├── Button.jsx       # Componente de botón
│   ├── Input.jsx        # Componente de input
│   ├── Card.jsx         # Componente de tarjeta
│   ├── Alert.jsx        # Componente de alerta
│   ├── Modal.jsx        # Componente de modal
│   ├── CourseCard.jsx   # Tarjeta de curso
│   ├── ProtectedRoute.jsx # Ruta protegida
│   └── AdminRoute.jsx   # Ruta de administrador
├── pages/               # Páginas principales
│   ├── Home.jsx         # Página de inicio
│   ├── Login.jsx        # Página de login
│   ├── Register.jsx     # Página de registro
│   ├── CourseDetail.jsx # Detalle del curso
│   ├── MyCourses.jsx    # Mis cursos
│   └── AdminDashboard.jsx # Panel de administración
├── services/            # Servicios API
│   ├── api.js           # Configuración base de API
│   ├── authService.js   # Servicios de autenticación
│   ├── courseService.js # Servicios de cursos
│   ├── userService.js   # Servicios de usuarios
│   ├── subscriptionService.js # Servicios de suscripciones
│   └── categoryService.js # Servicios de categorías
├── hooks/               # Custom hooks
│   ├── useAuth.js       # Hook de autenticación
│   └── useCourses.js    # Hook de cursos
├── styles/              # Archivos de estilos
│   ├── variables.css    # Variables CSS
│   └── utilities.css    # Clases utilitarias
├── App.jsx              # Componente principal
├── main.jsx             # Punto de entrada
└── router.jsx           # Configuración de rutas
```

## ✨ Funcionalidades

### Para Usuarios (Estudiantes)
- ✅ Registro e inicio de sesión
- ✅ Visualización de catálogo de cursos
- ✅ Búsqueda y filtrado por categorías
- ✅ Inscripción a cursos
- ✅ Gestión de "Mis Cursos"
- ✅ Sistema de comentarios y valoraciones
- ✅ Visualización de detalles de curso

### Para Administradores
- ✅ Panel de administración
- ✅ Gestión completa de cursos (CRUD)
- ✅ Gestión de categorías
- ✅ Visualización de usuarios y suscripciones
- ✅ Estadísticas del sistema

## 🔧 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Navegar al directorio del frontend**
   ```bash
   cd courses-page/frontend/frontend-lms
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   El frontend está configurado para conectarse al backend en `http://localhost:8080`. 
   Si necesitas cambiar esta URL, modifica la constante `API_BASE_URL` en `src/services/api.js`.

4. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

   El servidor se ejecutará en `http://localhost:5173`

5. **Construir para producción**
   ```bash
   npm run build
   ```

## 🔐 Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación. Los tokens se almacenan en localStorage y se incluyen automáticamente en las peticiones a la API.

### Credenciales de Prueba

- **Estudiante**: `alumno@example.com` / `password123`
- **Administrador**: `admin@example.com` / `password123`

## 🎨 Sistema de Estilos

El proyecto utiliza CSS puro con un sistema de clases utilitarias inspirado en Tailwind CSS con variables CSS personalizadas.

## 🌐 Integración con API

El frontend se comunica con el backend Go a través de endpoints REST para gestionar usuarios, cursos, suscripciones y categorías.

## 📱 Disenio Responsivo

Completamente optimizado para desktop, tablet y dispositivos móviles.

---

**LMS Platform** - Transformando la educación a través de la tecnología 🎓+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
