package model

type Category struct {
	IDCategory   int    `gorm:"column:category_id;primaryKey;autoIncrement"`
	CategoryName string `gorm:"column:category_name;type:varchar(100);unique;not null"`
}

type Categories []Category
