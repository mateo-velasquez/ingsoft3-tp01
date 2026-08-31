package dto

import (
	"time"
)

type FileDTO struct {
	FileId         int       `json:"id"`
	SubscriptionId int       `json:"subscription_id"`
	FileName       string    `json:"file_name"`
	FilePath       string    `json:"file_path"`
	CreateDate     time.Time `json:"create_date"`
	LastUpdateDate time.Time `json:"lastupdate_date"`
}

type FilesDTO []FileDTO
