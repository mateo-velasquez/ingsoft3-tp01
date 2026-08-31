package model

import (
	"time"
)

type Course struct {
	IDCourse    int       `gorm:"column:course_id;primaryKey;autoIncrement"`
	IDImage     int       `gorm:"column:image_id;not null"`
	CreateDate  time.Time `gorm:"column:create_date;not null;default:CURRENT_TIMESTAMP"`
	LastUpdate  time.Time `gorm:"column:lastupdate_date;not null;default:CURRENT_TIMESTAMP"`
	CourseName  string    `gorm:"column:course_name;type:varchar(300);not null"`
	Price       float64   `gorm:"column:price;type:decimal(10,2);not null"`
	InitDate    time.Time `gorm:"column:init_date;not null"`
	Description string    `gorm:"column:course_description;type:varchar(1000)"`
	Duration    string    `gorm:"column:duration;type:varchar(100);not null"`
	Rating      float64   `gorm:"column:rating;type:decimal(3,2);not null"`
	Categories  Categories
	//Categories  Categories `gorm:"many2many:course_categories"`
}

type Courses []Course
