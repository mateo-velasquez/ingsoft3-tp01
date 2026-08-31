import { apiRequest } from './api.js';

export const fileService = {
  // Para alumno/profesor: subir archivo ligado a una suscripción
  uploadFileForSubscription: async (subscriptionId, file) => {
    const formData = new FormData();
    formData.append('files', file);

    return await apiRequest(`/course/subscription/${subscriptionId}/files`, {
      method: 'POST',
      body: formData,
    });
  },

  // Para admin: subir archivo directo al curso
  //uploadFileForCourse: async (courseId, file) => {
  //  const formData = new FormData();
  //  formData.append('files', file);
//
  //  return await apiRequest(`/course/${courseId}/files`, {
  //    method: 'POST',
  //    body: formData,
  //  });
  //},

  // Listar archivos por suscripción
  getFilesBySubscription: async (subscriptionId) => {
    return await apiRequest(`/subscription/${subscriptionId}/files`);
  },

  // Listar archivos por curso
  getFilesByCourse: async (courseId) => {
    return await apiRequest(`/course/${courseId}/files`);
  },
};

export default fileService;
