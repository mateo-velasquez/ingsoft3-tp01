package db

import (
	"os"
	"project/client"
	"project/model"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/mysql"
	"github.com/joho/godotenv"
	log "github.com/sirupsen/logrus"
)

var (
	db  *gorm.DB
	err error
)

func init() {
	// Carga variables de entorno del archivo .env (opcional)
	err := godotenv.Load()
	if err != nil {
		log.Info("No .env file found, using environment variables")
	}

	// DB Connection Parameters from environment variables
	DBName := os.Getenv("DB_NAME")
	DBUser := os.Getenv("DB_USER")
	DBPass := os.Getenv("DB_PASS")
	DBHost := os.Getenv("DB_HOST")
	DBPort := os.Getenv("DB_PORT")

	if DBPort == "" {
		DBPort = "3309" // valor por defecto si no está seteado
	}

	connectionString := DBUser + ":" + DBPass + "@tcp(" + DBHost + ":" + DBPort + ")/" + DBName + "?charset=utf8&parseTime=True"

	db, err = gorm.Open("mysql", connectionString)
	if err != nil {
		log.Info("Connection Failed to Open")
		log.Fatal(err)
	} else {
		log.Info("Connection Established")
	}

	// Add all clients here
	client.Db = db
}

func StartDbEngine() {
	// We need to migrate all classes model.
	db.AutoMigrate(&model.User{})
	db.AutoMigrate(&model.Image{})
	db.AutoMigrate(&model.File{})
	db.AutoMigrate(&model.Course{})
	db.AutoMigrate(&model.Category{})
	db.AutoMigrate(&model.Subscription{})
	db.AutoMigrate(&model.CourseCategories{})

	log.Info("Finishing Migration Database Tables")
}
