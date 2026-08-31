package dto

import (
	"time"
)

type CourseDTO struct {
	IDCourse    int       `json:"id"`
	IDImage     int       `json:"id_image"`
	ImageURL    string    `json:"image_url,omitempty"`
	CourseName  string    `json:"course_name"`
	Price       float64   `json:"price"`
	InitDate    time.Time `json:"init_date"`
	Description string    `json:"description"`
	Duration    string    `json:"duration"`
	Rating      float64   `json:"rating"`
	Categories  []string  `json:"categories,omitempty"`
}

type CoursesDTO []CourseDTO
