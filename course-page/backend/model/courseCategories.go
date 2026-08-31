package model

type CourseCategories struct {
	IDCourse   int `gorm:"column:course_id;primaryKey;autoIncrement"`
	IDCategory int `gorm:"column:category_id;primaryKey;autoIncrement"`
}
