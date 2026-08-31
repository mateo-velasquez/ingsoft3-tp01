package controller

import (
	"net/http"
	"project/dto"
	"project/service"

	"strconv"

	"github.com/gin-gonic/gin"
	log "github.com/sirupsen/logrus"
)

// COMO YO ELIJO QUE HAYA FOTOS PREDETERMINADAS, NO NECESITO QUE CARGUEN
func InsertCategory(c *gin.Context) {
	var categoryDTO dto.CategoryDTO
	err := c.BindJSON(&categoryDTO)

	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	categoryDTO, er := service.CategoryService.InsertCategory(categoryDTO)

	if er != nil {
		log.Error(er.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": er.Error()})
		return
	}

	c.JSON(http.StatusCreated, categoryDTO)
}

func GetCategoryById(c *gin.Context) {
	var categoryDto dto.CategoryDTO
	id, _ := strconv.Atoi(c.Param("id"))

	er := c.ShouldBindJSON(&categoryDto)

	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": er.Error()})
		return
	}

	categoryDto, err := service.CategoryService.GetCategoryById(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, categoryDto)
}

func GetCategories(c *gin.Context) {
	var categoriesDTO dto.CategoriesDTO

	categoriesDTO, err := service.CategoryService.GetCategories()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, categoriesDTO)
}

/*

	userDto, err := service.UserService.GetUserByEmail(userDto.Email)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, userDto)
*/
