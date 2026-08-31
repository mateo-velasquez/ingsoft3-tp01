package client

import (
	"project/model"

	log "github.com/sirupsen/logrus"
)

func InsertImage(image model.Image) model.Image {

	result := Db.Create(&image)

	if result.Error != nil {
		log.Error("Failed to insert image")
		return image
	}

	log.Debug("Image created:", image.ImageId)
	return image
}

func GetImageById(id int) model.Image {
	var image model.Image

	Db.Where("image_id = ?", id).First(&image)
	log.Debug("Image: ", image)

	return image
}

func GetImages() model.Images {
	var images model.Images
	Db.Find(&images)

	log.Debug("Images: ", images)

	return images
}

func GetIdMayor() int {
	var maxID int
	result := Db.Table("images").Select("MAX(image_id)").Scan(&maxID)

	if result.Error != nil {
		log.Error("Failed to retrieve maximum ID")
		return 0
	}

	log.Debug("Maximum ID: ", maxID)
	return maxID
}
