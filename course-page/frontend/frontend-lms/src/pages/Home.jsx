import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import CourseCard from '../components/CourseCard.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';
import courseService from '../services/courseService.js';
import categoryService from '../services/categoryService.js';
import subscriptionService from '../services/subscriptionService.js';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [userSubscriptions, setUserSubscriptions] = useState([]);

  useEffect(() => {
    fetchCourses();
    fetchCategories();
    if (isAuthenticated && user) {
      fetchUserSubscriptions();
    }
  }, [isAuthenticated, user]);

  const fetchCourses = async () => {
    setIsLoading(true);
    try {
      const data = await courseService.getCourses();
      setCourses(data || []);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Error al cargar los cursos' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      setAlert({ type: 'error', message: error.message || 'Error al cargar las categorías' });
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      const data = await subscriptionService.getSubscriptionsByUserId(user.id);
      setUserSubscriptions(data || []);
    } catch (error) {
      console.error('Error loading user subscriptions:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    // Si no hay búsqueda ni categorías seleccionadas, obtener todos los cursos
    if (!searchQuery.trim() && selectedCategories.length === 0) {
      fetchCourses();
      return;
    }

    setIsLoading(true);
    try {
      const data = await courseService.searchCourses(searchQuery, selectedCategories);
      setCourses(data || []);
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Error al buscar cursos' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = async (categoryId) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newCategories);
    
    // Aplicar filtros automáticamente
    if (newCategories.length === 0 && !searchQuery.trim()) {
      fetchCourses();
    } else {
      setIsLoading(true);
      try {
        const data = await courseService.searchCourses(searchQuery, newCategories);
        setCourses(data || []);
      } catch (error) {
        setAlert({ type: 'error', message: error.message || 'Error al filtrar cursos' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEnroll = async (course) => {
    if (!isAuthenticated) {
      setAlert({ type: 'warning', message: 'Debes iniciar sesión para inscribirte' });
      return;
    }

    try {
      await subscriptionService.createSubscription({
        id_course: course.id,
        id_user: user.id,
        course_role: 'student',
      });
      setAlert({ type: 'success', message: `Te has inscrito exitosamente en ${course.course_name}` });
      // Actualizar las suscripciones del usuario
      fetchUserSubscriptions();
    } catch (error) {
      setAlert({ type: 'error', message: error.message || 'Error al inscribirse al curso' });
    }
  };

  const isUserEnrolled = (courseId) => {
    return userSubscriptions.some(sub => sub.id_course === courseId);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    fetchCourses();
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section con gradiente */}
      <div className="hero-gradient py-20 px-4">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 mt-6 leading-tight">
              Conviértete en
              <br />
              <span className="text-gradient">Chef profesional</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Todo lo que necesitas aprender en un sólo lugar
            </p>
          </div>
        </div>
      </div>

      <div className="container py-12">
        {/* Search Section */}
        <div className="glass-card p-8 mb-12">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Input
                  label="Buscar cursos"
                  placeholder="¿Qué quieres aprender hoy?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" loading={isLoading} className="btn-lg">
                  Buscar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearSearch}
                  className="btn-lg"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </form>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4 text-lg">Filtrar por tecnologías:</h3>
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 cursor-pointer bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryChange(category.id)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alert */}
        {alert && (
          <Alert
            type={alert.type}
            onClose={() => setAlert(null)}
            className="mb-8"
          >
            {alert.message}
          </Alert>
        )}

        {/* Courses Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              {searchQuery ? `Resultados para "${searchQuery}"` : 'Cursos Destacados'}
            </h2>
            <span className="text-primary bg-blue-100 px-4 py-2 rounded-full text-sm font-medium">
              {courses.length} {courses.length === 1 ? 'curso' : 'cursos'}
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner mb-4"></div>
              <span className="text-lg text-gray-400">Cargando los mejores cursos...</span>
            </div>
          ) : courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.map((course, index) => (
                <div key={course.id} className={`tech-card floating-element`} style={{animationDelay: `${index * 0.1}s`}}>
                  <CourseCard
                    course={course}
                    onEnroll={handleEnroll}
                    showEnrollButton={isAuthenticated}
                    isEnrolled={isUserEnrolled(course.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🎓</div>
              <h3 className="text-2xl font-semibold mb-4">
                {searchQuery
                  ? 'No encontramos cursos con esa búsqueda'
                  : 'Estamos preparando contenido increíble'}
              </h3>
              <p className="text-gray-400 text-lg max-w-md mx-auto">
                {searchQuery
                  ? 'Prueba con otros términos o explora nuestras categorías'
                  : 'Pronto tendremos los mejores cursos para tu desarrollo profesional'}
              </p>
            </div>
          )}
        </div>

        {/* Feature Section */}
        <div className="py-16 border-t border-gray-200">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">¿Por qué elegir Solaire?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              La plataforma más completa para convertirte en desarrollador profesional
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="tech-card text-center">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Aprende Rápido</h3>
              <p className="text-gray-400">Contenido optimizado para que aprendas de manera eficiente</p>
            </div>
            
            <div className="tech-card text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-semibold mb-3">Proyectos Reales</h3>
              <p className="text-gray-400">Construye aplicaciones que puedes mostrar en tu portafolio</p>
            </div>
            
            <div className="tech-card text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-xl font-semibold mb-3">Comunidad</h3>
              <p className="text-gray-400">Conecta con otros desarrolladores y crece junto a ellos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;