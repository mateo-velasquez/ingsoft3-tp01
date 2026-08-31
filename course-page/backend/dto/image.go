package dto

type ImageDTO struct {
	ImageId   int    `json:"id"`
	ImagePath string `json:"path"`
}

type ImagesDTO []ImageDTO
