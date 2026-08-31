package controller

import (
	"net/http"
	"project/dto"
	"project/service"

	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func InsertFile(c *gin.Context) {
	
	subscription_id, er := strconv.Atoi(c.Param("id"))

	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get subscription_id"})
		return
	}

	// Obtiene el formulario enviado
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get multipart form"})
		return
	}

	// Obtiene el archivo bajo la clave "files"
	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Selecciona el primer archivo (solo se permite uno)
	file := files[0]

	// Genera el nombre del archivo con la extensión original
	fileName := file.Filename

	// Guarda el archivo en el directorio "Files/"
	savePath := filepath.Join("files", fileName)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	var fileDTO dto.FileDTO
	fileDTO.FileName = fileName
	fileDTO.FilePath = savePath
	fileDTO.SubscriptionId = subscription_id

	// Inserta la información de la filen en la base de datos
	savedFileDto, err := service.FileService.InsertFile(fileDTO)

	// Comunicar si hubo un problema
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Responde con la información de la filen guardada
	c.JSON(http.StatusOK, savedFileDto)
}

func GetFileById(c *gin.Context) {
	var fileDto dto.FileDTO

	id, er := strconv.Atoi(c.Param("id"))

	if er != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Id enviado de forma incorrecta"})
		return
	}

	fileDto, err := service.FileService.GetFileById(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, fileDto)
}

func GetFiles(c *gin.Context) {
	var filesDto dto.FilesDTO

	filesDto, err := service.FileService.GetFiles()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, filesDto)
}

func GetFilesBySubscriptionId(c *gin.Context) {
	var filesDto dto.FilesDTO

	subscription_id, er := strconv.Atoi(c.Param("id"))

	if er != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Id enviado de forma incorrecta"})
		return
	}

	filesDto, err := service.FileService.GetFilesBySubscriptionId(subscription_id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, filesDto)
}

func GetFilesByCourseId(c *gin.Context) {
	var filesDto dto.FilesDTO

	course_id, er := strconv.Atoi(c.Param("id"))

	if er != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Id enviado de forma incorrecta"})
		return
	}

	filesDto, err := service.FileService.GetFilesBySubscriptionId(course_id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, filesDto)
}
