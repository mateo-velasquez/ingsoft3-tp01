package app

import (
	"project/controller"

	log "github.com/sirupsen/logrus"
)

func mapUrls() {
	//USER
	router.POST("/user", controller.InsertUser)                  //check
	router.GET("/users", controller.GetUsers)                    //check
	router.GET("/user/:id", controller.GetUserById)              //check
	router.GET("/user/:id/is-teacher", controller.IsUserTeacher) //check if user is teacher
	router.POST("/login", controller.UserLogin)                  //check

	//IMAGE
	router.POST("/course/image", controller.InsertImage) // Este que sea para guardar una relación de imagen con curso // no check
	router.GET("/image/:id", controller.GetImageById)    //check
	router.GET("/images", controller.GetImages)          //check

	//COURSE
	router.GET("/course/:id", controller.GetCourseById)    //check
	router.GET("/courses", controller.GetCourses)          //check
	router.GET("/course/search", controller.SearchCourses) //check
	// TEST: http://localhost:8090/course/search?q=Cocina
	// TEST: http://localhost:8090/course/search?q=Cocina&categories=32,48
	router.POST("/course", controller.InsertCourse)           //check
	router.PUT("/course/:id", controller.PutCourseById)       //check
	router.DELETE("/course/:id", controller.DeleteCourseById) //check

	//SUBSCRIPTION
	router.POST("/user/subscription", controller.InsertSuscription)                // check crear subscriptions
	router.GET("/subscriptions", controller.GetSubscriptions)                      // check
	router.GET("/subscription/:id", controller.GetSubscriptionById)                // check (obtener subscription by id)
	router.GET("/user/subscriptions/:id", controller.GetSubscriptionsByUserId)     // check (obtener las subscriptions de un usuario)
	router.GET("/course/subscriptions/:id", controller.GetSubscriptionsByCourseId) // check (obtener las subscriptions que hay en un curso)
	router.PUT("/course/subscription/rating/:id", controller.PutRating)            // check
	router.PUT("/course/subscription/comment/:id", controller.PutComment)          // check

	//CATEGORY
	router.POST("/category", controller.InsertCategory)     //check
	router.GET("/category/:id", controller.GetCategoryById) //check
	router.GET("/categories", controller.GetCategories)     //check

	//FILES
	router.POST("/course/subscription/:id/files", controller.InsertFile) // Este que sea para guardar una relación de un archivo un con curso // no check
	router.GET("/file/:id", controller.GetFileById)                      //check
	router.GET("/files", controller.GetFiles)                            //check
	router.GET("subscription/:id/files", controller.GetFilesBySubscriptionId)
	router.GET("course/:id/files", controller.GetFilesByCourseId)

	log.Info("Finishing mappings configurations")
}
