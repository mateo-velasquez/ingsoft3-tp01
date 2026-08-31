package service

import (
	"errors"
	"project/client"
	"project/dto"
	"project/model"
)

type imageService struct{}

type imageServiceInterface interface {
	InsertImage(imageDTO dto.ImageDTO) (dto.ImageDTO, error)
	GetImageById(id int) (dto.ImageDTO, error)
	GetIdMayor() (id int)
	GetImages() (dto.ImagesDTO, error)
}

var ImageService imageServiceInterface

func init() {
	ImageService = &imageService{}
}

func (s *imageService) InsertImage(imageDTO dto.ImageDTO) (dto.ImageDTO, error) {

	var image model.Image

	image.ImagePath = imageDTO.ImagePath

	image = client.InsertImage(image)

	if image.ImageId < 0 {
		return imageDTO, errors.New("could not insert image")
	}

	return imageDTO, nil
}

func (s *imageService) GetImageById(id int) (dto.ImageDTO, error) {
	var image model.Image
	var imageDTO dto.ImageDTO

	image = client.GetImageById(id)

	if image.ImageId == 0 {
		return imageDTO, errors.New("image not found")
	}

	if image.ImageId < 0 {
		return imageDTO, errors.New("wrong ID")
	}

	imageDTO.ImageId = image.ImageId
	imageDTO.ImagePath = "/" + image.ImagePath

	return imageDTO, nil
}

func (s *imageService) GetIdMayor() (id int) {
	return client.GetIdMayor()
}

func (s *imageService) GetImages() (dto.ImagesDTO, error) {
	var images model.Images = client.GetImages()
	var imagesDTO dto.ImagesDTO

	for _, image := range images {
		var imageDTO dto.ImageDTO

		imageDTO.ImageId = image.ImageId
		imageDTO.ImagePath = "/" + image.ImagePath

		imagesDTO = append(imagesDTO, imageDTO)
	}

	return imagesDTO, nil
}
