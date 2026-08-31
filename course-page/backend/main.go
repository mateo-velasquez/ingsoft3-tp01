package main

import (
	"project/app"
	"project/db"
)

func main() {
	db.StartDbEngine()
	app.StartRoute()
}
