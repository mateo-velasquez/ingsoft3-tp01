import { Link } from 'react-router-dom';
import Card from './Card.jsx';
import Button from './Button.jsx';

const CourseCard = ({ course, onEnroll, showEnrollButton = true, isEnrolled = false }) => {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('⭐');
    }
    if (hasHalfStar) {
      stars.push('⭐');
    }
    
    return stars.join('');
  };

  return (
    <Card className="h-full flex flex-col">
      <Card.Body className="flex-1 flex gap-4">
        {course.image_url && (
          <div className="w-32 h-32 flex-shrink-0 overflow-hidden rounded-lg">
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
        <div className="flex-1 mb-4">
          <h3 className="text-xl font-semibold mb-2">
            <Link
              to={`/course/${course.id}`}
              className="text-primary hover:text-primary-hover transition-all"
            >
              {course.course_name}
            </Link>
          </h3>
          
          <p className="text-gray text-sm mb-3 line-clamp-3">
            {course.description}
          </p>

          <div className="flex items-center gap-4 text-sm text-gray mb-3">
            <span>Duración: {course.duration}</span>
            <span>Inicio: {formatDate(course.init_date)}</span>
          </div>

          {course.categories && course.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {course.categories.map((category, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-100 text-white text-xs rounded-md"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{renderStars(course.rating)}</span>
              <span className="text-sm text-gray">
                ({course.rating.toFixed(1)})
              </span>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatPrice(course.price)}
            </div>
          </div>
        </div>
      </Card.Body>

      <Card.Footer>
        <div className="flex gap-2">
          <Link
            to={`/course/${course.id}`}
            className="btn btn-outline flex-1"
          >
            Ver Detalles
          </Link>
          {showEnrollButton && onEnroll && (
            isEnrolled ? (
              <button
                disabled
                className="px-4 py-2 rounded-lg text-white font-medium cursor-not-allowed flex-1"
                style={{ backgroundColor: 'var(--color-gray-300)' }}
              >
                Ya te has inscripto a este curso
              </button>
            ) : (
              <Button
                onClick={() => onEnroll(course)}
                variant="primary"
                className="flex-1"
              >
                Inscribirse
              </Button>
            )
          )}
        </div>
      </Card.Footer>
    </Card>
  );
};

export default CourseCard;
