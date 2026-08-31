import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseService } from '../services/courseService.js';
import { categoryService } from '../services/categoryService.js';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';

const CreateCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    course_name: '',
    duration: '',
    init_date: '',
    categories: [],
    description: '',
    price: '',
    id_image: 1, // Default image
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await categoryService.getCategories();
      console.log('Categorías recibidas del servidor:', data);
      console.log('Número de categorías:', data?.length || 0);
      setCategories(data || []);
    } catch (err) {
      setError('Error al cargar las categorías');
      console.error('Error cargando categorías:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData((prev) => ({
      ...prev,
      categories: selectedOptions,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate form
      if (!formData.course_name || !formData.duration || !formData.init_date || 
          !formData.description || !formData.price) {
        setError('Por favor, complete todos los campos obligatorios');
        setLoading(false);
        return;
      }

      if (formData.categories.length === 0) {
        setError('Por favor, seleccione al menos una categoría');
        setLoading(false);
        return;
      }

      // Prepare data for API
      const courseData = {
        course_name: formData.course_name,
        duration: formData.duration,
        init_date: formData.init_date + 'T00:00:00Z',
        description: formData.description,
        price: parseFloat(formData.price),
        categories: formData.categories,
        id_image: formData.id_image,
        rating: 0,
      };

      console.log('Datos del curso a enviar:', courseData);
      await courseService.createCourse(courseData);
      setSuccess('¡Curso creado exitosamente!');
      
      // Reset form
      setFormData({
        course_name: '',
        duration: '',
        init_date: '',
        categories: [],
        description: '',
        price: '',
        id_image: 1,
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error al crear el curso');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-gradient">
          Crear Nuevo Curso
        </h1>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Course Name */}
            <div>
              <label htmlFor="course_name" className="block text-sm font-medium mb-2">
                Nombre del Curso *
              </label>
              <Input
                id="course_name"
                name="course_name"
                type="text"
                value={formData.course_name}
                onChange={handleChange}
                placeholder="Ej: Pastas Avanzado"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration" className="block text-sm font-medium mb-2">
                Duración *
              </label>
              <Input
                id="duration"
                name="duration"
                type="text"
                value={formData.duration}
                onChange={handleChange}
                placeholder="Ej: 3 meses"
                required
              />
            </div>

            {/* Init Date */}
            <div>
              <label htmlFor="init_date" className="block text-sm font-medium mb-2">
                Fecha de Inicio *
              </label>
              <Input
                id="init_date"
                name="init_date"
                type="date"
                value={formData.init_date}
                onChange={handleChange}
                required
              />
            </div>

            {/* Categories */}
            <div>
              <label htmlFor="categories" className="block text-sm font-medium mb-2">
                Categorías * (mantén presionado Ctrl/Cmd para seleccionar múltiples)
              </label>
              <select
                id="categories"
                name="categories"
                multiple
                value={formData.categories}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white min-h-[120px] transition-all"
                required
              >
                {categories.length === 0 ? (
                  <option disabled>Cargando categorías...</option>
                ) : (
                  categories.map((category) => (
                    <option 
                      key={category.id} 
                      value={category.name}
                      style={{ backgroundColor: '#1e293b', color: 'white', padding: '8px' }}
                    >
                      {category.name}
                    </option>
                  ))
                )}
              </select>
              <p className="text-sm text-gray-400 mt-1">
                {categories.length === 0 ? (
                  <span className="text-warning">⚠️ No hay categorías disponibles. Categorías cargadas: {categories.length}</span>
                ) : (
                  `Seleccionadas: ${formData.categories.length > 0 ? formData.categories.join(', ') : 'Ninguna'}`
                )}
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Descripción del Curso *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe el contenido y objetivos del curso..."
                rows="5"
                className="w-full px-4 py-2 bg-gray-100 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white resize-none transition-all"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-2">
                Precio *
              </label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                placeholder="Ej: 81.91"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creando...' : 'Crear Curso'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCourse;
