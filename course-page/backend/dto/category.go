package dto

type CategoryDTO struct {
	IDCategory   int    `json:"id"`
	CategoryName string `json:"name"`
}

type CategoriesDTO []CategoryDTO
