package controller

import (
	"net/http"
	"project/dto"
	"project/service"

	"fmt"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
)

func InsertImage(c *gin.Context) {
	// Obtiene el formulario enviado
	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get multipart form"})
		return
	}

	// Obtiene el archivo bajo la clave "images"
	files := form.File["images"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image uploaded"})
		return
	}

	// Selecciona el primer archivo (solo se permite uno)
	file := files[0]

	// Obtiene el ID mayor para generar el nombre del archivo
	i := service.ImageService.GetIdMayor()

	// Genera el nombre del archivo con la extensión original
	fileExtension := filepath.Ext(file.Filename)
	fileName := fmt.Sprintf("Image-%d%s", i+1, fileExtension)

	// Guarda el archivo en el directorio "Images/"
	savePath := filepath.Join("Images", fileName)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Crea el DTO para guardar en la base de datos
	imageDto := dto.ImageDTO{
		ImagePath: savePath,
	}

	// Inserta la información de la imagen en la base de datos
	savedImageDto, err := service.ImageService.InsertImage(imageDto)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Responde con la información de la imagen guardada
	c.JSON(http.StatusOK, savedImageDto)
}

func GetImageById(c *gin.Context) {
	var imageDto dto.ImageDTO
	id, _ := strconv.Atoi(c.Param("id"))

	imageDto, err := service.ImageService.GetImageById(id)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, imageDto)
}

func GetImages(c *gin.Context) {
	var imagesDto dto.ImagesDTO

	imagesDto, err := service.ImageService.GetImages()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, imagesDto)
}
