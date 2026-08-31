package client

import (
	"project/model"

	log "github.com/sirupsen/logrus"
)

func InsertCourseCategories(relation model.CourseCategories) model.CourseCategories {
	result := Db.Create(&relation)

	if result.Error != nil {
		log.Error("Failed to insert course.")
		relation.IDCourse = -1
		return relation
	}

	log.Debug("Relation created:", relation.IDCourse, relation.IDCategory)
	return relation
}

func DeleteRelationsByCourseID(course model.Course) error {
	var courseCategories model.CourseCategories

	err := Db.Where("course_id = ?", course.IDCourse).Delete(&courseCategories).Error

	if err != nil {
		log.Debug("Failed to delete relation course_categories")
	} else {
		log.Debug("relation course_categories deleted: (", course.IDCourse, ",x)")
	}

	return err
}
