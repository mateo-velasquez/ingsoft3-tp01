package service

import (
	"errors"
	"project/client"
	"project/dto"
	"project/model"
)

type fileService struct{}

type fileServiceInterface interface {
	InsertFile(fileDTO dto.FileDTO) (dto.FileDTO, error)
	GetFileById(id int) (dto.FileDTO, error)
	GetFiles() (dto.FilesDTO, error)
	GetFilesBySubscriptionId(subscription_id int) (dto.FilesDTO, error)
	GetFilesByCourseId(course_id int) (dto.FilesDTO, error)
}

var FileService fileServiceInterface

func init() {
	FileService = &fileService{}
}

func (s *fileService) InsertFile(fileDTO dto.FileDTO) (dto.FileDTO, error) {
	var file model.File

	// asigno los parámetros que estoy pasando
	file.FilePath = fileDTO.FilePath
	file.FileName = fileDTO.FileName
	file.SubscriptionId = fileDTO.SubscriptionId

	// llamo al client para que lo cargue y traiga el resto de los datos
	file = client.InsertFile(file)

	if file.FileId < 0 {
		return fileDTO, errors.New("could not insert file")
	}

	fileDTO.FileId = file.FileId
	fileDTO.CreateDate = file.CreateDate
	fileDTO.LastUpdateDate = file.LastUpdateDate

	return fileDTO, nil
}

func (s *fileService) GetFileById(id int) (dto.FileDTO, error) {
	var file model.File
	var fileDTO dto.FileDTO

	if id < 0 {
		return fileDTO, errors.New("wrong ID")
	}

	file = client.GetFileById(id)

	if file.FileId == 0 {
		return fileDTO, errors.New("file not found")
	}

	if file.FileId < 0 {
		return fileDTO, errors.New("wrong ID")
	}

	fileDTO.FileId = file.FileId
	fileDTO.SubscriptionId = file.SubscriptionId
	fileDTO.FileName = file.FileName
	fileDTO.FilePath = "/" + file.FilePath
	fileDTO.CreateDate = file.CreateDate
	fileDTO.LastUpdateDate = file.LastUpdateDate

	return fileDTO, nil
}

func (s *fileService) GetFiles() (dto.FilesDTO, error) {
	var files model.Files = client.GetFiles()
	var filesDTO dto.FilesDTO

	for _, file := range files {
		var fileDTO dto.FileDTO

		fileDTO.FileId = file.FileId
		fileDTO.SubscriptionId = file.SubscriptionId
		fileDTO.FileName = file.FileName
		fileDTO.FilePath = "/" + file.FilePath
		fileDTO.CreateDate = file.CreateDate
		fileDTO.LastUpdateDate = file.LastUpdateDate

		filesDTO = append(filesDTO, fileDTO)
	}

	return filesDTO, nil
}

func (s *fileService) GetFilesBySubscriptionId(subscription_id int) (dto.FilesDTO, error) {
	var files model.Files
	var filesDTO dto.FilesDTO

	if subscription_id < 0 {
		return filesDTO, errors.New("wrong ID for subscriptions")
	}

	files = client.GetFilesBySubscriptionId(subscription_id)

	for _, file := range files {
		var fileDTO dto.FileDTO

		fileDTO.FileId = file.FileId
		fileDTO.SubscriptionId = file.SubscriptionId
		fileDTO.FileName = file.FileName
		fileDTO.FilePath = "/" + file.FilePath
		fileDTO.CreateDate = file.CreateDate
		fileDTO.LastUpdateDate = file.LastUpdateDate

		filesDTO = append(filesDTO, fileDTO)
	}

	return filesDTO, nil
}

func (s *fileService) GetFilesByCourseId(course_id int) (dto.FilesDTO, error) {
	var files model.Files
	var filesDTO dto.FilesDTO

	if course_id < 0 {
		return filesDTO, errors.New("wrong ID for course")
	}

	files = client.GetFilesByCourseId(course_id)

	for _, file := range files {
		var fileDTO dto.FileDTO

		fileDTO.FileId = file.FileId
		fileDTO.SubscriptionId = file.SubscriptionId
		fileDTO.FileName = file.FileName
		fileDTO.FilePath = "/" + file.FilePath
		fileDTO.CreateDate = file.CreateDate
		fileDTO.LastUpdateDate = file.LastUpdateDate

		filesDTO = append(filesDTO, fileDTO)
	}

	return filesDTO, nil
}
