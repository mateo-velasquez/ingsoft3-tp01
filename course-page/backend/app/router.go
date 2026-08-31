package app

import (
	"github.com/gin-contrib/cors"    // Provides support for Cross-Origin Resource Sharing (CORS).
	"github.com/gin-gonic/gin"       // The web framework used to handle routes and HTTP requests.
	log "github.com/sirupsen/logrus" // Imports the logrus library and aliases it as log for logging.
)

var (
	router *gin.Engine // Declare a variable router of type *gin.Engine (a pointer to an instance of the gin engine).
)

func init() {
	router = gin.Default()
	// Initializes the router with gin's default configurations.
	// This includes middleware like the logger and the panic recovery handler.

	// Configure CORS to allow frontend connections
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:5173", "http://127.0.0.1:5173", "http://frontend:5173"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))
	// Adds CORS middleware with custom settings to allow frontend connections.

	// Serve static files from Images directory
	router.Static("/images", "./images")
	router.Static("/files", "./files")
}

func StartRoute() {
	mapUrls() // Calls the mapUrls function and maps the server routes.

	log.Info("Starting server") // Logs an info message indicating the server is starting.
	router.Run(":8090")         // Starts the server on port 8090 and begins listening and handling HTTP requests.
}
