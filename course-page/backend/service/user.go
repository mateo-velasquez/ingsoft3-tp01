package service

import (
	"errors"
	"project/client"
	"project/dto"
	"project/model"

	"golang.org/x/crypto/bcrypt"
)

type userService struct{}

type userServiceInterface interface {
	InsertUser(userDTO dto.UserDTO) (dto.UserDTO, error)
	GetUsers() (dto.UsersDTO, error)
	GetUserById(id int) (dto.UserDTO, error)
	GetUserByEmail(email string) (dto.UserDTO, error)
	UserLogin(userDTO dto.UserDTO) (dto.UserDTO, error)
	IsUserTeacher(id int) (bool, error)
}

var UserService userServiceInterface

func init() {
	UserService = &userService{}
}

func (s *userService) InsertUser(userDTO dto.UserDTO) (dto.UserDTO, error) {
	var user model.User

	// Estamos encriptando la contrasenia, para no guardar la verdadera
	encryptedPassword, err := bcrypt.GenerateFromPassword([]byte(userDTO.UserPassword), bcrypt.DefaultCost)

	if err != nil {
		return userDTO, nil
	}

	// Registramos los datos del dto en el user (model)
	user.FirstName = userDTO.FirstName
	user.LastName = userDTO.LastName
	user.Dni = userDTO.Dni
	user.Email = userDTO.Email
	user.UserPassword = string(encryptedPassword)
	user.AccessLevel = "User"

	//Llamamos al cliente para que interactua con la base de datos:
	user = client.InsertUser(user)

	if user.IDUser == -1 {
		return userDTO, errors.New("error creating user. Email allready used")
	}

	userDTO.IDUser = user.IDUser
	userDTO.AccessLevel = user.AccessLevel
	userDTO.UserPassword = user.UserPassword

	return userDTO, nil
}

func (s *userService) GetUsers() (dto.UsersDTO, error) {
	var users model.Users = client.GetUsers()
	var usersDTO dto.UsersDTO
	var userDTO dto.UserDTO

	//en esta parte del código básicamente agarramos un único elemento del users y se lo asignamos al DTo.
	//Luego usamos append para incorporarlo a la Slice
	for _, user := range users {
		userDTO.IDUser = user.IDUser
		userDTO.Dni = user.Dni
		userDTO.Email = user.Email
		userDTO.FirstName = user.FirstName
		userDTO.LastName = user.LastName
		userDTO.UserPassword = user.UserPassword
		userDTO.AccessLevel = user.AccessLevel

		usersDTO = append(usersDTO, userDTO)
	}

	return usersDTO, nil
}

func (s *userService) GetUserById(id int) (dto.UserDTO, error) {
	var user model.User
	var userDTO dto.UserDTO

	if id <= 0 {
		return userDTO, errors.New("ID not found")
	}

	user = client.GetUserById(id)

	if user.IDUser == 0 {
		return userDTO, errors.New("user not found")
	}

	userDTO.IDUser = user.IDUser
	userDTO.Dni = user.Dni
	userDTO.Email = user.Email
	userDTO.FirstName = user.FirstName
	userDTO.LastName = user.LastName
	userDTO.UserPassword = user.UserPassword
	userDTO.AccessLevel = user.AccessLevel

	return userDTO, nil
}

func (s *userService) GetUserByEmail(email string) (dto.UserDTO, error) {
	var user model.User
	var userDTO dto.UserDTO

	if email == "" {
		return userDTO, errors.New("email not found")
	}

	user = client.GetUserByEmail(email)

	userDTO.IDUser = user.IDUser
	userDTO.Dni = user.Dni
	userDTO.Email = user.Email
	userDTO.FirstName = user.FirstName
	userDTO.LastName = user.LastName
	userDTO.UserPassword = user.UserPassword
	userDTO.AccessLevel = user.AccessLevel

	return userDTO, nil
}

func (s *userService) UserLogin(userDTO dto.UserDTO) (dto.UserDTO, error) {
	var user model.User

	user = client.GetUserByEmail(userDTO.Email)

	if user.IDUser == 0 {
		return userDTO, errors.New("user no register")
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.UserPassword), []byte(userDTO.UserPassword))
	if err != nil {
		// pasa cuando no son iguales las contrasenias
		return userDTO, errors.New("wrong password")
	}

	user = client.UserLogin(userDTO.Email)

	userDTO.IDUser = user.IDUser
	userDTO.Email = user.Email
	userDTO.UserPassword = user.UserPassword
	userDTO.Dni = user.Dni
	userDTO.FirstName = user.FirstName
	userDTO.LastName = user.LastName
	userDTO.AccessLevel = user.AccessLevel

	return userDTO, nil
}

func (s *userService) IsUserTeacher(id int) (bool, error) {
	if id <= 0 {
		return false, errors.New("ID not found")
	}

	// Get all subscriptions for this user
	subscriptions := client.GetSubscriptionsByUserId(id)

	// Check if any subscription has CourseRole = "Teacher"
	for _, subscription := range subscriptions {
		if subscription.CourseRole == "Teacher" {
			return true, nil
		}
	}

	return false, nil
}
