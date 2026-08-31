import { useState, useEffect } from 'react';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import courseService from '../services/courseService.js';
import categoryService from '../services/categoryService.js';
import userService from '../services/userService.js';
import subscriptionService from '../services/subscriptionService.js';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('courses');
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  
  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    course_name: '',
    description: '',
    price: '',
    duration: '',
    init_date: '',
    id_image: 1, // Default image ID
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [coursesData, categoriesData, usersData, subscriptionsData] = await Promise.all([
        courseService.getCourses(),
        categoryService.getCategories(),
        userService.getUsers(),
        subscriptionService.getSubscriptions(),
      ]);
      
      setCourses(coursesData || []);
      setCategories(categoriesData || []);
      setUsers(usersData || []);
      setSubscriptions(subscriptionsData || []);
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al cargar los datos' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const courseData = {
        ...courseForm,
        price: parseFloat(courseForm.price),
        init_date: new Date(courseForm.init_date).toISOString(),
      };

      if (editingCourse) {
        await courseService.updateCourse(editingCourse.id, courseData);
        setAlert({ type: 'success', message: 'Curso actualizado exitosamente' });
      } else {
        await courseService.createCourse(courseData);
        setAlert({ type: 'success', message: 'Curso creado exitosamente' });
      }
      
      setShowCourseModal(false);
      setEditingCourse(null);
      setCourseForm({
        course_name: '',
        description: '',
        price: '',
        duration: '',
        init_date: '',
        id_image: 1,
      });
      fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al guardar el curso' });
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    
    try {
      await categoryService.createCategory(categoryForm);
      setAlert({ type: 'success', message: 'Categoría creada exitosamente' });
      setShowCategoryModal(false);
      setCategoryForm({ name: '' });
      fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al crear la categoría' });
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este curso?')) {
      return;
    }
    
    try {
      await courseService.deleteCourse(courseId);
      setAlert({ type: 'success', message: 'Curso eliminado exitosamente' });
      fetchData();
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al eliminar el curso' });
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      course_name: course.course_name,
      description: course.description,
      price: course.price.toString(),
      duration: course.duration,
      init_date: course.init_date.split('T')[0], // Format for date input
      id_image: course.id_image || 1,
    });
    setShowCourseModal(true);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getStats = () => {
    return {
      totalCourses: courses.length,
      totalUsers: users.length,
      totalSubscriptions: subscriptions.length,
      totalRevenue: subscriptions.reduce((sum, sub) => {
        const course = courses.find(c => c.id === sub.id_course);
        return sum + (course ? course.price : 0);
      }, 0),
    };
  };

  const stats = getStats();

  const tabs = [
    { id: 'courses', label: 'Cursos', count: courses.length },
    { id: 'categories', label: 'Categorías', count: categories.length },
    { id: 'users', label: 'Usuarios', count: users.length },
    { id: 'subscriptions', label: 'Inscripciones', count: subscriptions.length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
        <span className="ml-3">Cargando panel de administración...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Panel de Administración</h1>
          <p className="text-gray">Gestiona cursos, usuarios y contenido de la plataforma</p>
        </div>

        {alert && (
          <Alert
            type={alert.type}
            onClose={() => setAlert(null)}
            className="mb-6"
          >
            {alert.message}
          </Alert>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <Card.Body className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalCourses}</div>
              <div className="text-sm text-gray">Total Cursos</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="text-center">
              <div className="text-2xl font-bold text-success">{stats.totalUsers}</div>
              <div className="text-sm text-gray">Total Usuarios</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="text-center">
              <div className="text-2xl font-bold text-warning">{stats.totalSubscriptions}</div>
              <div className="text-sm text-gray">Total Inscripciones</div>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="text-center">
              <div className="text-2xl font-bold text-danger">{formatPrice(stats.totalRevenue)}</div>
              <div className="text-sm text-gray">Ingresos Totales</div>
            </Card.Body>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray hover:text-primary'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'courses' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Gestión de Cursos</h2>
              <Button onClick={() => setShowCourseModal(true)}>
                Crear Nuevo Curso
              </Button>
            </div>

            <div className="grid gap-4">
              {courses.map((course) => (
                <Card key={course.id}>
                  <Card.Body>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">{course.course_name}</h3>
                        <p className="text-gray text-sm mb-2">{course.description}</p>
                        <div className="flex gap-4 text-sm text-gray">
                          <span>Precio: {formatPrice(course.price)}</span>
                          <span>Duración: {course.duration}</span>
                          <span>Inicio: {formatDate(course.init_date)}</span>
                          <span>Rating: {course.rating.toFixed(1)}⭐</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCourse(course)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Gestión de Categorías</h2>
              <Button onClick={() => setShowCategoryModal(true)}>
                Crear Nueva Categoría
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <Card.Body>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-gray">ID: {category.id}</p>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Gestión de Usuarios</h2>
            <div className="grid gap-4">
              {users.map((user) => (
                <Card key={user.id}>
                  <Card.Body>
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">
                          {user.first_name} {user.last_name}
                        </h3>
                        <p className="text-sm text-gray">{user.email}</p>
                        <p className="text-sm text-gray">DNI: {user.dni}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.accesslevel === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.accesslevel}
                        </span>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Gestión de Inscripciones</h2>
            <div className="grid gap-4">
              {subscriptions.map((subscription) => {
                const course = courses.find(c => c.id === subscription.id_course);
                const user = users.find(u => u.id === subscription.id_user);
                return (
                  <Card key={subscription.id}>
                    <Card.Body>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {course?.course_name || `Curso ID: ${subscription.id_course}`}
                          </h3>
                          <p className="text-sm text-gray">
                            Usuario: {user ? `${user.first_name} ${user.last_name}` : `ID: ${subscription.id_user}`}
                          </p>
                          <p className="text-sm text-gray">
                            Fecha: {formatDate(subscription.create_date)}
                          </p>
                          {subscription.individual_rating > 0 && (
                            <p className="text-sm text-gray">
                              Valoración: {subscription.individual_rating}⭐
                            </p>
                          )}
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {subscription.course_role}
                        </span>
                      </div>
                      {subscription.comment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                          <strong>Comentario:</strong> {subscription.comment}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Course Modal */}
        <Modal
          isOpen={showCourseModal}
          onClose={() => {
            setShowCourseModal(false);
            setEditingCourse(null);
            setCourseForm({
              course_name: '',
              description: '',
              price: '',
              duration: '',
              init_date: '',
              id_image: 1,
            });
          }}
          title={editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
        >
          <form onSubmit={handleCourseSubmit}>
            <Input
              label="Nombre del Curso"
              value={courseForm.course_name}
              onChange={(e) => setCourseForm(prev => ({ ...prev, course_name: e.target.value }))}
              required
            />
            
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-input form-textarea"
                value={courseForm.description}
                onChange={(e) => setCourseForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio"
                type="number"
                step="0.01"
                value={courseForm.price}
                onChange={(e) => setCourseForm(prev => ({ ...prev, price: e.target.value }))}
                required
              />
              
              <Input
                label="Duración"
                value={courseForm.duration}
                onChange={(e) => setCourseForm(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="ej: 8 semanas"
                required
              />
            </div>
            
            <Input
              label="Fecha de Inicio"
              type="date"
              value={courseForm.init_date}
              onChange={(e) => setCourseForm(prev => ({ ...prev, init_date: e.target.value }))}
              required
            />
            
            <div className="flex gap-3 mt-6">
              <Button type="submit" className="flex-1">
                {editingCourse ? 'Actualizar' : 'Crear'} Curso
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCourseModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>

        {/* Category Modal */}
        <Modal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setCategoryForm({ name: '' });
          }}
          title="Crear Nueva Categoría"
        >
          <form onSubmit={handleCategorySubmit}>
            <Input
              label="Nombre de la Categoría"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <div className="flex gap-3 mt-6">
              <Button type="submit" className="flex-1">
                Crear Categoría
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default AdminDashboard;
