package dto

type CourseSearchDTO struct {
	CourseName string   `json:"course_name"` // Opcional
	Categories []string `json:"categories"`  // Lista de categorías (nombres)
}
