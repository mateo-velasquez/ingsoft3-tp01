package controller

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// Only says the process is alive: it does NOT touch the database on purpose.
// The smoke test checks the database with a real endpoint (/courses).
// commit is the deployed commit (Render sets RENDER_GIT_COMMIT), so the smoke
// test can tell whether it is talking to the new version or the old one.
func Health(c *gin.Context) {
	commit := os.Getenv("RENDER_GIT_COMMIT")
	if commit == "" {
		commit = "unknown"
	}

	c.JSON(http.StatusOK, gin.H{"status": "ok", "commit": commit})
}
