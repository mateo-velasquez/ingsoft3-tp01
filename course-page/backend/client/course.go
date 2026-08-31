package client

import (
	"project/model"

	log "github.com/sirupsen/logrus"
)

func GetCourseById(id int) model.Course {
	var course model.Course

	result := Db.Where("course_id = ?", id).First(&course)

	if result.Error != nil {
		log.Error("Failed to get course: id out of range")
		course.IDCourse = -1
		return course
	}

	// Aparentemente GORM está generando un JOIN sin la condición ON. Eso rompe completamente la consulta.
	//Db.Where("course_id = ?", id).Preload("Categories").First(&course)
	var categories model.Categories
	Db.Table("categories").
		Joins("JOIN course_categories ON course_categories.category_id = categories.category_id").
		Where("course_categories.course_id = ?", id).
		Scan(&categories)

	course.Categories = categories

	log.Debug("Course: ", course)

	return course
}

func GetCourses() model.Courses {
	var courses model.Courses
	Db.Find(&courses)

	for i := range courses {
		var categories model.Categories
		Db.Table("categories").
			Joins("JOIN course_categories ON course_categories.category_id = categories.category_id").
			Where("course_categories.course_id = ?", courses[i].IDCourse).
			Scan(&categories)
		courses[i].Categories = categories
	}

	log.Debug("Courses: ", courses)

	return courses
}

func GetCourseByName(name string) model.Course {
	var course model.Course

	Db.Debug().Where("course_name = ?", name).First(&course)

	var categories model.Categories
	Db.Table("categories").
		Joins("JOIN course_categories ON course_categories.category_id = categories.category_id").
		Where("course_categories.course_id = ?", course.IDCourse).
		Scan(&categories)
	course.Categories = categories

	log.Debug("Courses: ", course)

	return course
}

func SearchCourses(query string, categoryIDs []int) model.Courses {
	var courses model.Courses

	// I visualize the parameters to see if the data reaches the client correctly.
	log.Debug("Search query: ", query)
	log.Debug("Search category IDs: ", categoryIDs)

	// I initialize the query
	queryDB := Db

	// I check if they are searching by name
	if query != "" {
		queryDB = queryDB.Where("course_name LIKE ?", "%"+query+"%")
	}

	if len(categoryIDs) > 0 {
		queryDB = queryDB.
			Joins("JOIN course_categories cc ON cc.course_id = courses.course_id").
			Where("cc.category_id IN (?)", categoryIDs).
			Group("courses.course_id").
			Having("COUNT(DISTINCT cc.category_id) = ?", len(categoryIDs))
	}

	if err := queryDB.Find(&courses).Error; err != nil {
		log.Error("Error fetching courses: ", err)
		return nil
	}

	for i := range courses {
		var courseCategories model.Categories
		if err := Db.Table("categories").
			Joins("JOIN course_categories ON course_categories.category_id = categories.category_id").
			Where("course_categories.course_id = ?", courses[i].IDCourse).
			Scan(&courseCategories).Error; err != nil {
			log.Error("Error fetching categories for course ", courses[i].IDCourse, ": ", err)
		}
		courses[i].Categories = courseCategories
	}

	log.Debug("Courses: ", courses)
	return courses
}

func InsertCourse(course model.Course) model.Course {
	var courseAuxiliar model.Course
	Db.Debug().Where("course_name LIKE ?", "%"+course.CourseName+"%").First(&courseAuxiliar)

	if courseAuxiliar.IDCourse != 0 {
		log.Error("There is already a course with this name")
		course.IDCourse = -1
		return course
	}

	result := Db.Create(&course)

	if result.Error != nil {
		log.Error("Failed to insert course.")
		return course
	}

	var courseAUX model.Course
	Db.Where("course_name LIKE ?", "%"+course.CourseName+"%").First(&courseAUX)
	course.IDCourse = courseAUX.IDCourse

	//Now we are gonna create the relations coursecategories:
	for _, category := range course.Categories {
		var categoryAUX model.Category
		var courseCategories model.CourseCategories
		categoryAUX = GetCategoryByName(category.CategoryName)
		courseCategories.IDCourse = course.IDCourse
		courseCategories.IDCategory = categoryAUX.IDCategory
		result := InsertCourseCategories(courseCategories)

		if result.IDCourse < 0 {
			log.Error("Failed to insert relation: (", result.IDCourse, result.IDCategory, ")")
			course.IDCourse = -1
			return course
		}
	}

	log.Debug("Course created:", course.IDCourse)
	return course
}

func PutCourseById(course model.Course, newCategories model.Categories) model.Course {
	// We verify that the ID we pass is correct.
	log.Debugf("Intentando actualizar el curso con ID: %d", course.IDCourse)

	tx := Db.Begin()

	// we force GORM to do an update ("save" doesn't necessarily do it)
	if err := tx.Model(&model.Course{}).Where("course_id = ?", course.IDCourse).Updates(course).Error; err != nil {
		tx.Rollback()
		log.Error("Failed to update course:", err)
		course.IDCourse = -1
		return course
	}

	// old relationships between courses and categories are deleted
	if err := tx.Debug().Where("course_id = ?", course.IDCourse).Delete(&model.CourseCategories{}).Error; err != nil {
		tx.Rollback()
		log.Error("Failed to delete old relations:", err)
		course.IDCourse = -1
		return course
	}

	// New course and category relationships are created
	for _, category := range newCategories {
		categoryAUX := GetCategoryByName(category.CategoryName)
		relation := model.CourseCategories{
			IDCourse:   course.IDCourse,
			IDCategory: categoryAUX.IDCategory,
		}
		if err := tx.Debug().Create(&relation).Error; err != nil {
			tx.Rollback()
			log.Error("Failed to insert relation:", err)
			course.IDCourse = -1
			return course
		}
	}

	tx.Commit()
	log.Debug("Updated course and relations:", course.IDCourse)
	return course
}

func DeleteCourseById(course model.Course) error {
	err := Db.Where("course_id = ?", course.IDCourse).Delete(&course).Error

	if err != nil {
		log.Debug("Failed to delete course")
	} else {
		log.Debug("Course deleted: ", course.IDCourse)
	}
	return err
}
