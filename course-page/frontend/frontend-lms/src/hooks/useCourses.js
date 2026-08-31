import { useState, useEffect } from 'react';
import courseService from '../services/courseService.js';

export const useCourses = () => {
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCourses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await courseService.getCourses();
      setCourses(data || []);
    } catch (err) {
      setError(err.message);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchCourses = async (query, categories = []) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await courseService.searchCourses(query, categories);
      setCourses(data || []);
    } catch (err) {
      setError(err.message);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  return {
    courses,
    isLoading,
    error,
    fetchCourses,
    searchCourses,
  };
};

export default useCourses;
