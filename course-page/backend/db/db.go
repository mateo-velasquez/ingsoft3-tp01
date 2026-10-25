package db

import (
	"os"
	"project/client"
	"project/model"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/postgres"
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
	DBSSLMode := os.Getenv("DB_SSLMODE")

	if DBPort == "" {
		DBPort = "5432" // valor por defecto si no está seteado
	}

	if DBSSLMode == "" {
		DBSSLMode = "disable" // local sin TLS; en Neon va "require"
	}

	connectionString := "host=" + DBHost + " port=" + DBPort + " user=" + DBUser + " dbname=" + DBName + " password=" + DBPass + " sslmode=" + DBSSLMode

	db, err = gorm.Open("postgres", connectionString)
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
