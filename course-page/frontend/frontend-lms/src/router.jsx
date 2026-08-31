import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import MyCourses from './pages/MyCourses.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Register from './pages/Register.jsx';
import CreateCourse from './pages/CreateCourse.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import TeacherRoute from './components/TeacherRoute.jsx';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'course/:id',
        element: <CourseDetail />,
      },
      {
        path: 'my-courses',
        element: (
          <ProtectedRoute>
            <MyCourses />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create-course',
        element: (
          <TeacherRoute>
            <CreateCourse />
          </TeacherRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export default router;
