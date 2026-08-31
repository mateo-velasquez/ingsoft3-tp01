package model

import (
	"time"
)

type File struct {
	FileId         int       `gorm:"column:file_id;primaryKey"`
	SubscriptionId int       `gorm:"column:subscription_id;not null"`
	FileName       string    `gorm:"column:file_name;type:varchar(300);not null"`
	FilePath       string    `gorm:"column:file_path;type:varchar(255); not null"`
	CreateDate     time.Time `gorm:"column:create_date;not null;default:CURRENT_TIMESTAMP"`
	LastUpdateDate time.Time `gorm:"column:lastupdate_date;not null;default:CURRENT_TIMESTAMP"`
}

type Files []File
