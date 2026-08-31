import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import Alert from '../components/Alert.jsx';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

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

    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contrasenia es requerida';
    } else if (formData.password.length < 4) {
      newErrors.password = 'La contrasenia debe tener al menos 4 caracteres';
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
      await login(formData.email, formData.password);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message || 'Error al iniciar sesión. Verifica tus credenciales.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Iniciar Sesión</h1>
          <p className="text-gray mt-2">
            Accede a tu cuenta para continuar
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
              <Input
                label="Email"
                type="email"
                name="email"
                placeholder="Ingresa tu email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                required
              />

              <Input
                label="Contrasenia"
                type="password"
                name="password"
                placeholder="Ingresa tu contrasenia"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />

              <Button
                type="submit"
                loading={isLoading}
                className="w-full mt-4"
              >
                Iniciar Sesión
              </Button>
            </form>
          </Card.Body>

          <Card.Footer>
            <div className="text-center">
              <p className="text-sm text-gray">
                ¿No tienes una cuenta?{' '}
                <Link
                  to="/register"
                  className="text-primary hover:text-primary-hover font-medium"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>
          </Card.Footer>
        </Card>

        {/* Demo credentials info */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-medium mb-2">Credenciales de prueba:</h3>
          <div className="text-sm text-gray space-y-1">
            <p><strong>Alumno:</strong> alumno@example.com / password123</p>
            <p><strong>Admin:</strong> admin@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
