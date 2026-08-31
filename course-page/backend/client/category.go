package client

import (
	"project/model"

	log "github.com/sirupsen/logrus"
)

func InsertCategory(category model.Category) model.Category {
	var categoryaux model.Category

	Db.Where("category_name = ?", category.CategoryName).First(&categoryaux)

	if categoryaux.IDCategory != 0 {
		log.Error("This category already exists")
		categoryaux.CategoryName = ""
		return categoryaux
	}

	result := Db.Create(&category)

	if result.Error != nil {
		log.Error("Failed to create category")
		return category
	}

	log.Debug("Category, created: ", category.IDCategory)
	return category
}

func GetCategoryById(id int) model.Category {
	var category model.Category

	Db.Where("category_id = ?", id).First(&category)
	log.Debug("Category: ", category)

	return category
}

func GetCategoryByName(name string) model.Category {
	var category model.Category

	Db.Where("category_name = ?", name).First(&category)
	log.Debug("Category: ", category)

	return category
}

func GetCategories() model.Categories {
	var categories model.Categories
	Db.Find(&categories)

	log.Debug("Categories: ", categories)

	return categories
}
