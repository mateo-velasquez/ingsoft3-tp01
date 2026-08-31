import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import CourseCard from '../components/CourseCard.jsx';
import Alert from '../components/Alert.jsx';
import subscriptionService from '../services/subscriptionService.js';
import courseService from '../services/courseService.js';

const MyCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (user) {
      fetchMyCourses();
    }
  }, [user]);

  const fetchMyCourses = async () => {
    setIsLoading(true);
    try {
      const userSubscriptions = await subscriptionService.getSubscriptionsByUserId(user.id);
      setSubscriptions(userSubscriptions || []);

      // Fetch course details for each subscription
      const coursePromises = userSubscriptions.map(subscription =>
        courseService.getCourseById(subscription.id_course)
      );
      
      const courseDetails = await Promise.all(coursePromises);
      setCourses(courseDetails || []);
    } catch (error) {
      setAlert({ type: 'error', message: 'Error al cargar tus cursos' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const getSubscriptionForCourse = (courseId) => {
    return subscriptions.find(sub => sub.id_course === courseId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
        <span className="ml-3">Cargando tus cursos...</span>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mis Cursos</h1>
          <p className="text-gray">
            Aquí tienes todos los cursos en los que estás inscrito
          </p>
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

        {courses.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const subscription = getSubscriptionForCourse(course.id);
                return (
                  <div key={course.id} className="relative">
                    <CourseCard
                      course={course}
                      showEnrollButton={false}
                    />
                    
                    {/* Subscription info overlay */}
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-md text-xs">
                      Inscrito
                    </div>
                    
                    {/* Subscription details */}
                    {subscription && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Fecha de inscripción:</span>
                          <span>{formatDate(subscription.create_date)}</span>
                        </div>
                        
                        {subscription.individual_rating > 0 && (
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Tu valoración:</span>
                            <div className="flex items-center gap-1">
                              {'⭐'.repeat(subscription.individual_rating)}
                              <span>({subscription.individual_rating}/5)</span>
                            </div>
                          </div>
                        )}
                        
                        {subscription.comment && (
                          <div>
                            <span className="font-medium">Tu comentario:</span>
                            <p className="text-gray-600 mt-1 text-xs italic">
                              "{subscription.comment}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Statistics */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Total de Cursos</h3>
                <p className="text-3xl font-bold text-primary">{courses.length}</p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Cursos Valorados</h3>
                <p className="text-3xl font-bold text-success">
                  {subscriptions.filter(sub => sub.individual_rating > 0).length}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-2">Comentarios</h3>
                <p className="text-3xl font-bold text-warning">
                  {subscriptions.filter(sub => sub.comment && sub.comment.trim()).length}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-semibold mb-4">
              Aún no estás inscrito en ningún curso
            </h2>
            <p className="text-gray mb-6">
              Explora nuestro catálogo y encuentra el curso perfecto para ti
            </p>
            <a
              href="/"
              className="btn btn-primary"
            >
              Explorar Cursos
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCourses;
