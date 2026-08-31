import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './styles/variables.css';
import './styles/utilities.css';

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
