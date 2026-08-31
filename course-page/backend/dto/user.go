package dto

type UserDTO struct {
	IDUser       int    `json:"id"`
	FirstName    string `json:"first_name" validate:"required"`
	LastName     string `json:"last_name" validate:"required"`
	Dni          string `json:"dni" validate:"required"`
	Email        string `json:"email" validate:"required"`
	UserPassword string `json:"userpassword,omitempty"`
	AccessLevel  string `json:"accesslevel"`
}

type UsersDTO []UserDTO
