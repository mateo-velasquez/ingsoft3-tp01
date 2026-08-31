import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const Header = () => {
  const { user, isAuthenticated, logout, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-gray-700 sticky top-0 z-50">
      <div className="container">
        <div className="flex items-center justify-between py-4">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold text-gradient flex items-center gap-2">
            <span className="text-3xl">🔥</span>
            Solaire
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <Link to="/" className="text-white hover:text-white transition-all font-medium">
              Inicio
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/my-courses"
                  className="text-white hover:text-white transition-all font-medium"
                >
                  Mis Cursos
                </Link>

                {isTeacher() && (
                  <Link
                    to="/create-course"
                    className="text-white hover:text-white transition-all font-medium"
                  >
                    Crear Curso
                  </Link>
                )}

                {isAdmin() && (
                  <Link
                    to="/admin"
                    className="text-gray-300 hover:text-white transition-all font-medium"
                  >
                    ⚙️ Admin
                  </Link>
                )}

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Hola, <span className="text-white font-medium">{user?.first_name}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline btn-sm border-gray-500 text-gray-300 hover:text-white hover:border-white"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn btn-outline btn-sm border-gray-500 text-gray-300 hover:text-white hover:border-white">
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Registrarse
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
