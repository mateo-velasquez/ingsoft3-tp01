package client

import (
	"project/model"

	log "github.com/sirupsen/logrus"
)

func InsertFile(file model.File) model.File {

	result := Db.Debug().Create(&file)

	if result.Error != nil {
		log.Error("Failed to insert file")
		file.FileId = -1
		return file
	}

	log.Debug("File created:", file.FileId)
	return file
}

func GetFileById(id int) model.File {
	var file model.File

	Db.Where("file_id = ?", id).First(&file)
	log.Debug("File: ", file)

	return file
}

func GetFiles() model.Files {
	var files model.Files
	Db.Find(&files)

	log.Debug("Files: ", files)

	return files
}

func GetFilesBySubscriptionId(subscription_id int) model.Files {
	var files model.Files

	// I initialize the query

	Db.Table("files").Where("subscription_id = ?", subscription_id).
		Find(&files)

	log.Debug("Files: ", files)

	return files
}

func GetFilesByCourseId(course_id int) model.Files {
	var files model.Files

	Db.Table("files f").
		Joins("JOIN subscriptions s ON s.subscription_id = f.subscription_id").
		Where("s.course_id = ?", course_id).
		Find(&files)

	log.Debug("Files by course: ", files)

	return files
}
