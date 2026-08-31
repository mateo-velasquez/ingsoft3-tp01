package model

import "time"

type User struct {
	IDUser       int       `gorm:"primaryKey; autoIncrement; column:user_id" json:"id"`
	CreateDate   time.Time `gorm:"not null; default:CURRENT_TIMESTAMP; column:create_date"`
	LastUpdate   time.Time `gorm:"not null; default:CURRENT_TIMESTAMP; column:lastupdate_date"`
	FirstName    string    `gorm:"type:varchar(100); not null; column:first_name" json:"first_name"`
	LastName     string    `gorm:"type:varchar(100); not null; column:last_name" json:"last_name"`
	Dni          string    `gorm:"type:varchar(8); not null; column:dni" json:"dni"`
	Email        string    `gorm:"type:varchar(100); unique; not null; column:email" json:"email"`
	UserPassword string    `gorm:"type:varchar(100); not null; column:user_password" json:"userpassword"`
	AccessLevel  string    `gorm:"type:varchar(10); default:'User'; not null; column:access_level" json:"accesslevel"`
}

type Users []User
