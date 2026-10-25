package app

import (
	"os"      // Reads the port and the allowed origins from the environment.
	"strings" // Splits the comma-separated list of allowed origins.

	"github.com/gin-contrib/cors"    // Provides support for Cross-Origin Resource Sharing (CORS).
	"github.com/gin-gonic/gin"       // The web framework used to handle routes and HTTP requests.
	log "github.com/sirupsen/logrus" // Imports the logrus library and aliases it as log for logging.
)

var (
	router *gin.Engine // Declare a variable router of type *gin.Engine (a pointer to an instance of the gin engine).
)

// Local origins (compose and Vite dev server): used when ALLOWED_ORIGINS is not set.
const defaultAllowedOrigins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

func init() {
	router = gin.Default()
	// Initializes the router with gin's default configurations.
	// This includes middleware like the logger and the panic recovery handler.

	// Configure CORS to allow frontend connections.
	// The origins come from the environment: in Render, the URL of the front of THAT
	// environment. A request with an origin outside the list gets a 403.
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = defaultAllowedOrigins
	}

	config := cors.DefaultConfig()
	config.AllowOrigins = strings.Split(allowedOrigins, ",")
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

	// Render tells each service which port to listen on through PORT.
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // valor por defecto si no está seteado (compose)
	}

	log.Info("Starting server on port " + port) // Logs an info message indicating the server is starting.
	router.Run(":" + port)                      // Starts the server and begins listening and handling HTTP requests.
}
