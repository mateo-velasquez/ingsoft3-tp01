import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';
import userService from '../services/userService.js';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    dni: '',
    email: '',
    userpassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.first_name) {
      newErrors.first_name = 'El nombre es requerido';
    }

    if (!formData.last_name) {
      newErrors.last_name = 'El apellido es requerido';
    }

    if (!formData.dni) {
      newErrors.dni = 'El DNI es requerido';
    } else if (!/^\d{7,8}$/.test(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
    }

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.userpassword) {
      newErrors.userpassword = 'La contrasenia es requerida';
    } else if (formData.userpassword.length < 4) {
      newErrors.userpassword = 'La contrasenia debe tener al menos 4 caracteres';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirma tu contrasenia';
    } else if (formData.userpassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contrasenias no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setAlert(null);

    try {
      const userData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        dni: formData.dni,
        email: formData.email,
        userpassword: formData.userpassword,
        accesslevel: 'student', // Default access level
      };

      await userService.createUser(userData);
      
      setAlert({
        type: 'success',
        message: 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.',
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message || 'Error al crear la cuenta. Intenta nuevamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Crear Cuenta</h1>
          <p className="text-gray mt-2">
            Regístrate para acceder a nuestros cursos
          </p>
        </div>

        <Card>
          <Card.Body>
            {alert && (
              <Alert
                type={alert.type}
                onClose={() => setAlert(null)}
                className="mb-6"
              >
                {alert.message}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombre"
                  name="first_name"
                  placeholder="Tu nombre"
                  value={formData.first_name}
                  onChange={handleChange}
                  error={errors.first_name}
                  required
                />

                <Input
                  label="Apellido"
                  name="last_name"
                  placeholder="Tu apellido"
                  value={formData.last_name}
                  onChange={handleChange}
                  error={errors.last_name}
                  required
                />
              </div>

              <Input
                label="DNI"
                name="dni"
                placeholder="12345678"
                value={formData.dni}
                onChange={handleChange}
                error={errors.dni}
                required
              />

              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />

              <Input
                label="Contrasenia"
                type="password"
                name="userpassword"
                placeholder="Mínimo 6 caracteres"
                value={formData.userpassword}
                onChange={handleChange}
                error={errors.userpassword}
                required
              />

              <Input
                label="Confirmar Contrasenia"
                type="password"
                name="confirmPassword"
                placeholder="Repite tu contrasenia"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />

              <Button
                type="submit"
                loading={isLoading}
                className="w-full mt-4"
              >
                Crear Cuenta
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <div className="text-center">
              <p className="text-sm text-gray">
                ¿Ya tienes una cuenta?{' '}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary-hover font-medium"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </Card.Footer>
        </Card>
      </div>
    </div>
  );
};

export default Register;
