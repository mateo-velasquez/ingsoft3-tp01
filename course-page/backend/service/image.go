package service

import (
	"errors"
	"project/dto"
	"project/model"
)

type imageService struct{ repo ImageRepository }

type imageServiceInterface interface {
	InsertImage(imageDTO dto.ImageDTO) (dto.ImageDTO, error)
	GetImageById(id int) (dto.ImageDTO, error)
	GetIdMayor() (id int)
	GetImages() (dto.ImagesDTO, error)
}

var ImageService imageServiceInterface

func init() {
	ImageService = &imageService{repo: clientImageRepository{}}
}

func (s *imageService) InsertImage(imageDTO dto.ImageDTO) (dto.ImageDTO, error) {

	var image model.Image

	image.ImagePath = imageDTO.ImagePath

	image = s.repo.InsertImage(image)

	if image.ImageId < 0 {
		return imageDTO, errors.New("could not insert image")
	}

	return imageDTO, nil
}

func (s *imageService) GetImageById(id int) (dto.ImageDTO, error) {
	var image model.Image
	var imageDTO dto.ImageDTO

	image = s.repo.GetImageById(id)

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
	return s.repo.GetIdMayor()
}

func (s *imageService) GetImages() (dto.ImagesDTO, error) {
	var images model.Images = s.repo.GetImages()
	var imagesDTO dto.ImagesDTO

	for _, image := range images {
		var imageDTO dto.ImageDTO

		imageDTO.ImageId = image.ImageId
		imageDTO.ImagePath = "/" + image.ImagePath

		imagesDTO = append(imagesDTO, imageDTO)
	}

	return imagesDTO, nil
}
