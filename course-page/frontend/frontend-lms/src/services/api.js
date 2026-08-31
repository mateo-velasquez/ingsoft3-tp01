// Detectar si estamos en un contenedor Docker o en el host
const isDocker = window.location.hostname === '172.18.0.4' || window.location.hostname.includes('docker');
const API_BASE_URL = isDocker ? 'http://backend:8090' : 'http://localhost:8090';

export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add authorization token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultOptions.headers['Authorization'] = `Bearer ${token}`;
  }

  // Mezclar opciones
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  };

  // CLAVE: si el body es FormData, sacamos el Content-Type JSON
  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // Si no es JSON válido, crear un mensaje de error genérico
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      throw new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle empty responses
    if (response.status === 204) {
      return null;
    }

    // Try to parse JSON, if fails return the text
    try {
      return await response.json();
    } catch (jsonError) {
      console.warn('Response is not valid JSON:', jsonError);
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text}`);
    }
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

export default apiRequest;
