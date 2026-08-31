package model

type Image struct {
	ImageId   int    `gorm:"column:image_id;primaryKey;autoIncrement"`
	ImagePath string `gorm:"column:image_path;type:varchar(300);unique;not null"`
}

type Images []Image
