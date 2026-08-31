import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';
import Input from '../components/Input.jsx';

import courseService from '../services/courseService.js';
import subscriptionService from '../services/subscriptionService.js';
import fileService from '../services/fileService.js'; // 👈 servicio de archivos

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isAuthenticated, user, isAdmin } = useAuth();
  const isAdminUser = isAdmin ? isAdmin() : false;

  const [course, setCourse] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [alert, setAlert] = useState(null);

  // Comentario y rating
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5.0);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // 🔹 Archivos
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // ==========================
  //   CARGA DE DATOS
  // ==========================

  const fetchCourseDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await courseService.getCourseById(id);
      setCourse(data);
    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'Error al cargar el curso' });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const [courseSubscriptions, userSubscriptions] = await Promise.all([
        subscriptionService.getSubscriptionsByCourseId(id),
        user ? subscriptionService.getSubscriptionsByUserId(user.id) : Promise.resolve([])
      ]);

      setSubscriptions(courseSubscriptions || []);

      if (userSubscriptions && userSubscriptions.length > 0) {
        const currentUserSub = userSubscriptions.find(
          (sub) => sub.id_course === parseInt(id)
        );
        setUserSubscription(currentUserSub || null);

        if (currentUserSub) {
          setComment(currentUserSub.comment || '');
          setRating(currentUserSub.individual_rating || 5.0);
        }
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    }
  }, [id, user]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  useEffect(() => {
    if (course && isAuthenticated) {
      fetchSubscriptions();
    }
  }, [course, isAuthenticated, fetchSubscriptions]);

  // 🔹 Cargar archivos según rol
  useEffect(() => {
    const loadFiles = async () => {
      try {
        // Admin: ve archivos del CURSO (todos los de las suscripciones de ese curso)
        if (isAdminUser) {
          const courseFiles = await fileService.getFilesByCourse(id);
          setFiles(courseFiles || []);
        } 
        // Alumno inscripto: ve sus archivos asociados a SU subscription
        else if (userSubscription) {
          const subFiles = await fileService.getFilesBySubscription(
            userSubscription.id
          );
          setFiles(subFiles || []);
        }
      } catch (error) {
        console.error('Error al cargar archivos:', error);
      }
    };

    if (isAuthenticated && (isAdminUser || userSubscription)) {
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [id, isAuthenticated, isAdminUser, userSubscription]);

  // ==========================
  //   ACCIONES
  // ==========================

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      setAlert({ type: 'warning', message: 'Debes iniciar sesión para inscribirte' });
      return;
    }

    setIsEnrolling(true);
    try {
      await subscriptionService.createSubscription({
        id_course: parseInt(id),
        id_user: user.id,
        course_role: 'student',
      });

      setAlert({ type: 'success', message: 'Te has inscrito exitosamente al curso' });
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'Error al inscribirse al curso' });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    
    if (!userSubscription) {
      setAlert({ type: 'warning', message: 'Debes estar inscrito para dejar comentarios' });
      return;
    }

    if (isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      await Promise.all([
        subscriptionService.updateComment(userSubscription.id, comment),
        subscriptionService.updateRating(userSubscription.id, rating)
      ]);

      setAlert({ type: 'success', message: 'Tu comentario y valoración han sido guardados' });

      setUserSubscription({
        ...userSubscription,
        comment,
        individual_rating: rating
      });

      setSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === userSubscription.id
            ? { ...sub, comment, individual_rating: rating }
            : sub
        )
      );
    } catch (error) {
      console.error(error);
      setAlert({ type: 'error', message: 'Error al guardar tu comentario' });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // 🔹 SUBIDA DE ARCHIVOS (solo alumno)
  const handleUploadFile = async (e) => {
    e.preventDefault();

    if (isAdminUser) {
      setAlert({
        type: 'info',
        message: 'Los administradores solo pueden visualizar archivos, no subirlos.'
      });
      return;
    }

    if (!userSubscription) {
      setAlert({
        type: 'warning',
        message: 'Debes estar inscrito en este curso para subir archivos.'
      });
      return;
    }

    if (!selectedFile) {
      setAlert({ type: 'warning', message: 'Selecciona un archivo primero.' });
      return;
    }

    try {
      setIsUploading(true);

      await fileService.uploadFileForSubscription(userSubscription.id, selectedFile);

      setAlert({ type: 'success', message: 'Archivo subido correctamente.' });
      setSelectedFile(null);

      // Recargar la lista de archivos del alumno
      const subFiles = await fileService.getFilesBySubscription(userSubscription.id);
      setFiles(subFiles || []);
    } catch (error) {
      console.error('Error al subir archivo:', error);
      setAlert({ type: 'error', message: 'Error al subir el archivo.' });
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================
  //   HELPERS VISUALES
  // ==========================

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const renderStars = (ratingValue) => {
    const stars = [];
    for (let i = 1; i <= ratingValue; i++) {
      stars.push(
        <span key={i} className="text-yellow-500">
          ⭐
        </span>
      );
    }
    return stars;
  };

  const getCommentsWithRatings = () => {
    return subscriptions.filter(sub => sub.comment && sub.comment.trim() !== '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
        <span className="ml-3">Cargando curso...</span>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-8">
        <Alert type="error">Curso no encontrado</Alert>
      </div>
    );
  }

  const commentsWithRatings = getCommentsWithRatings();

  // ==========================
  //   RENDER
  // ==========================

  return (
    <div className="py-8">
      <div className="container">
        {alert && (
          <Alert
            type={alert.type}
            onClose={() => setAlert(null)}
            className="mb-6"
          >
            {alert.message}
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna principal (info curso, comentarios, archivos) */}
          <div className="lg:col-span-2">
            {/* Info del curso */}
            <Card>
              {course.image_url && (
                <div className="w-full h-64 overflow-hidden rounded-t-lg">
                  <img
                    src={`http://localhost:8090${course.image_url}`}
                    alt={course.course_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <Card.Body>
                <h1 className="text-3xl font-bold mb-4">{course.course_name}</h1>
                
                <div className="flex items-center gap-6 mb-6 text-sm text-gray">
                  <span>Duración: {course.duration}</span>
                  <span>Inicio: {formatDate(course.init_date)}</span>
                  <div className="flex items-center gap-1">
                    {renderStars(Math.round(course.rating))}
                    <span className="ml-2">({course.rating.toFixed(1)})</span>
                  </div>
                </div>

                {course.categories && course.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {course.categories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-white text-sm rounded-full"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                )}

                <div className="prose max-w-none">
                  <h3>Descripción del curso</h3>
                  <p className="text-gray whitespace-pre-line">
                    {course.description}
                  </p>
                </div>
              </Card.Body>
            </Card>

            {/* Comentarios y valoraciones */}
            {commentsWithRatings.length > 0 && (
              <Card className="mt-6">
                <Card.Header>
                  <h3 className="text-xl font-semibold">
                    Comentarios y Valoraciones ({commentsWithRatings.length})
                  </h3>
                </Card.Header>
                <Card.Body>
                  <div className="space-y-4">
                    {commentsWithRatings.map((subscription) => (
                      <div key={subscription.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {renderStars(subscription.individual_rating)}
                          </div>
                          <span className="text-sm text-gray">
                            {formatDate(subscription.last_update_date || subscription.create_date)}
                          </span>
                        </div>
                        <p className="text-white">{subscription.comment}</p>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* 🔹 Sección de archivos */}
            {isAuthenticated && (isAdminUser || userSubscription) && (
              <Card className="mt-6">
                <Card.Header>
                  <h3 className="text-xl font-semibold">
                    Archivos del curso
                  </h3>
                </Card.Header>
                <Card.Body>
                  {/* Formulario de subida SOLO para alumno inscripto */}
                  {!isAdminUser && userSubscription && (
                    <form
                      onSubmit={handleUploadFile}
                      className="mb-4 space-y-3"
                    >
                      <Input
                        label="Subir archivo"
                        type="file"
                        onChange={(e) =>
                          setSelectedFile(
                            e.target.files && e.target.files[0]
                              ? e.target.files[0]
                              : null
                          )
                        }
                      />
                      <Button
                        type="submit"
                        loading={isUploading}
                        className="w-full"
                      >
                        Subir archivo
                      </Button>
                      <p className="text-xs text-gray">
                        Puedes subir tareas, fotos, PDFs, etc.
                      </p>
                    </form>
                  )}

                  {/* Lista de archivos */}
                  {files.length === 0 ? (
                    <p className="text-sm text-gray">
                      No hay archivos disponibles para este curso todavía.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {files.map((file) => (
                        <li
                          key={file.id}
                          className="flex items-center justify-between bg-surface p-2 rounded"
                        >
                          <div>
                            <p className="font-medium text-sm">
                              {file.file_name}
                            </p>
                            <p className="text-xs text-gray">
                              Subido el{' '}
                              {formatDate(
                                file.create_date
                              )}
                            </p>
                          </div>
                          <a
                            href={`http://localhost:8090${
                              file.file_path
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm underline"
                          >
                            Visualizar
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Body>
              </Card>
            )}
          </div>

          {/* Sidebar derecha (precio, inscripción, valoración propia) */}
          <div>
            {/* Precio e inscripción */}
            <Card className="mb-6">
              <Card.Body>
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {formatPrice(course.price)}
                  </div>
                  <p className="text-sm text-gray">Precio del curso</p>
                </div>

                {isAuthenticated ? (
                  userSubscription ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 rounded-lg text-white font-medium cursor-not-allowed"
                      style={{ backgroundColor: 'var(--color-gray-300)' }}
                    >
                      Ya te has inscripto a este curso
                    </button>
                  ) : (
                    <Button
                      onClick={handleEnroll}
                      loading={isEnrolling}
                      className="w-full"
                    >
                      Inscribirse al Curso
                    </Button>
                  )
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray mb-4">
                      Inicia sesión para inscribirte
                    </p>
                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full"
                    >
                      Iniciar Sesión
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Valoración propia */}
            {userSubscription && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-semibold">Tu Valoración</h3>
                </Card.Header>
                <Card.Body>
                  <form onSubmit={handleSubmitFeedback}>
                    <div className="form-group mb-4">
                      <label className="form-label">Valoración</label>
                      <select
                        value={rating}
                        onChange={(e) =>
                          setRating(parseFloat(e.target.value))
                        }
                        className="form-select"
                      >
                        {[1, 2, 3, 4, 5].map((num) => (
                          <option key={num} value={num}>
                            {num} estrella{num > 1 ? 's' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 mt-2">
                        {renderStars(rating)}
                      </div>
                    </div>

                    <Input
                      label="Comentario"
                      type="textarea"
                      placeholder="Comparte tu experiencia con este curso..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="form-textarea"
                    />

                    <Button
                      type="submit"
                      loading={isSubmittingFeedback}
                      className="w-full"
                    >
                      Guardar Valoración
                    </Button>
                  </form>
                </Card.Body>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
