package service

import (
	"project/client"
	"project/model"
)

// Data access interfaces used by the services. The client package (GORM)
// implements them in the real app, and a test double does in the tests.

type CategoryRepository interface {
	InsertCategory(category model.Category) model.Category
	GetCategoryById(id int) model.Category
	GetCategoryByName(name string) model.Category
	GetCategories() model.Categories
}

type CourseRepository interface {
	GetCourseById(id int) model.Course
	GetCourseByName(name string) model.Course
	GetCourses() model.Courses
	SearchCourses(query string, categoryIDs []int) model.Courses
	InsertCourse(course model.Course) model.Course
	PutCourseById(course model.Course, newCategories model.Categories) model.Course
	DeleteCourseById(course model.Course) error
	GetCategoryByName(name string) model.Category
}

type SubscriptionRepository interface {
	InsertSubscription(subscription model.Subscription) model.Subscription
	GetSubscriptions() model.Subscriptions
	GetSubscriptionById(id int) model.Subscription
	GetSubscriptionsByUserId(userId int) model.Subscriptions
	GetSubscriptionsByCourseId(courseId int) model.Subscriptions
	PutRating(subscription model.Subscription) model.Subscription
	PutComment(subscription model.Subscription) model.Subscription
}

// Real implementations: they only delegate to client and hold no logic.

type clientCategoryRepository struct{}

func (clientCategoryRepository) InsertCategory(c model.Category) model.Category {
	return client.InsertCategory(c)
}
func (clientCategoryRepository) GetCategoryById(id int) model.Category {
	return client.GetCategoryById(id)
}
func (clientCategoryRepository) GetCategoryByName(name string) model.Category {
	return client.GetCategoryByName(name)
}
func (clientCategoryRepository) GetCategories() model.Categories { return client.GetCategories() }

type clientCourseRepository struct{}

func (clientCourseRepository) GetCourseById(id int) model.Course { return client.GetCourseById(id) }
func (clientCourseRepository) GetCourseByName(name string) model.Course {
	return client.GetCourseByName(name)
}
func (clientCourseRepository) GetCourses() model.Courses { return client.GetCourses() }
func (clientCourseRepository) SearchCourses(q string, ids []int) model.Courses {
	return client.SearchCourses(q, ids)
}
func (clientCourseRepository) InsertCourse(c model.Course) model.Course {
	return client.InsertCourse(c)
}
func (clientCourseRepository) PutCourseById(c model.Course, cats model.Categories) model.Course {
	return client.PutCourseById(c, cats)
}
func (clientCourseRepository) DeleteCourseById(c model.Course) error {
	return client.DeleteCourseById(c)
}
func (clientCourseRepository) GetCategoryByName(name string) model.Category {
	return client.GetCategoryByName(name)
}

type clientSubscriptionRepository struct{}

func (clientSubscriptionRepository) InsertSubscription(s model.Subscription) model.Subscription {
	return client.InsertSubscription(s)
}
func (clientSubscriptionRepository) GetSubscriptions() model.Subscriptions {
	return client.GetSubscriptions()
}
func (clientSubscriptionRepository) GetSubscriptionById(id int) model.Subscription {
	return client.GetSubscriptionById(id)
}
func (clientSubscriptionRepository) GetSubscriptionsByUserId(id int) model.Subscriptions {
	return client.GetSubscriptionsByUserId(id)
}
func (clientSubscriptionRepository) GetSubscriptionsByCourseId(id int) model.Subscriptions {
	return client.GetSubscriptionsByCourseId(id)
}
func (clientSubscriptionRepository) PutRating(s model.Subscription) model.Subscription {
	return client.PutRating(s)
}
func (clientSubscriptionRepository) PutComment(s model.Subscription) model.Subscription {
	return client.PutComment(s)
}
