package controller

import (
	"net/http"
	"project/dto"
	"project/service"

	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	log "github.com/sirupsen/logrus"
)

func InsertUser(c *gin.Context) {
	var userDto dto.UserDTO
	err := c.BindJSON(&userDto)

	// Si la deserialización falla (faltan campos o algo en el body) entonces que tire un badrequest
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	} //devolvemos un objeto JSON con un campo error que contiene el mensaje de error.

	userDto, er := service.UserService.InsertUser(userDto)

	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": er.Error()})
		return
	}

	c.JSON(http.StatusCreated, userDto) // Si está todo bien devuelve un 201 y el userDto
}

func GetUsers(c *gin.Context) {
	var usersDto dto.UsersDTO

	usersDto, err := service.UserService.GetUsers()

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, usersDto)
}

func GetUserById(c *gin.Context) {

	//Primero necesito saber el id, así que lo transformo de un string a un entero
	id, _ := strconv.Atoi(c.Param("id"))
	var userDto dto.UserDTO

	userDto, err := service.UserService.GetUserById(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, userDto)
}

func IsUserTeacher(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))

	isTeacher, err := service.UserService.IsUserTeacher(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_teacher": isTeacher})
}

func GetUserByEmail(c *gin.Context) {
	var userDto dto.UserDTO

	er := c.ShouldBindJSON(&userDto)

	if er != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": er.Error()})
		return
	}

	userDto, err := service.UserService.GetUserByEmail(userDto.Email)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, userDto)
}

func UserLogin(c *gin.Context) {
	var userDto dto.UserDTO

	err := c.BindJSON(&userDto)
	if err != nil {
		log.Error(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userDto, e := service.UserService.UserLogin(userDto)
	if e != nil {
		//El código de error HTTP 401 indica que la petición (request) no ha sido ejecutada
		//porque carece de credenciales válidas de autenticación para el recurso solicitado.
		c.JSON(http.StatusUnauthorized, gin.H{"error": e.Error()})
		return
	}

	token, er := createToken(userDto)
	if er != nil {
		log.Error(er.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": "error generating token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  userDto,
	})
}

func createToken(loginDto dto.UserDTO) (string, error) {
	// Crear el token con el método de firma HS256
	token := jwt.New(jwt.SigningMethodHS256)

	// Obtener los claims del token
	claims := token.Claims.(jwt.MapClaims)

	// Asignar valores a los claims
	claims["id"] = loginDto.IDUser
	claims["name"] = loginDto.LastName
	claims["role"] = loginDto.AccessLevel
	claims["exp"] = time.Now().Add(time.Hour).Unix() // Se usa "exp" como el claim para la expiración

	// Firmar el token con la clave secreta
	secretKey := "my_secret_key" // Cambia esto por una clave secreta segura
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}

	// Retornar el token generado
	return tokenString, nil
}
