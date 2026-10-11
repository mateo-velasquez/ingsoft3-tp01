package service

import (
	"errors"
	"project/dto"
	"project/model"
)

type categoryService struct{ repo CategoryRepository }

type categoryServiceInterface interface {
	InsertCategory(categoryDTO dto.CategoryDTO) (dto.CategoryDTO, error)
	GetCategoryById(id int) (dto.CategoryDTO, error)
	GetCategories() (dto.CategoriesDTO, error)
}

var CategoryService categoryServiceInterface

func init() {
	CategoryService = &categoryService{repo: clientCategoryRepository{}}
}

func (s *categoryService) InsertCategory(categoryDTO dto.CategoryDTO) (dto.CategoryDTO, error) {
	var category model.Category

	category.CategoryName = categoryDTO.CategoryName

	category = s.repo.InsertCategory(category)
	if category.CategoryName == "" {
		return categoryDTO, errors.New("category almost exist")
	}

	return categoryDTO, nil
}

func (s *categoryService) GetCategoryById(id int) (dto.CategoryDTO, error) {
	var category model.Category
	var categoryDTO dto.CategoryDTO

	if id <= 0 {
		return categoryDTO, errors.New("ID not found")
	}

	category = s.repo.GetCategoryById(id)

	if category.IDCategory == 0 {
		return categoryDTO, errors.New("category not found")
	}

	categoryDTO.IDCategory = category.IDCategory
	categoryDTO.CategoryName = category.CategoryName

	return categoryDTO, nil
}

func (s *categoryService) GetCategories() (dto.CategoriesDTO, error) {
	var categories model.Categories = s.repo.GetCategories()
	var categoriesDTO dto.CategoriesDTO
	var categoryDTO dto.CategoryDTO

	for _, category := range categories {
		categoryDTO.IDCategory = category.IDCategory
		categoryDTO.CategoryName = category.CategoryName

		categoriesDTO = append(categoriesDTO, categoryDTO)
	}

	return categoriesDTO, nil
}
