package dto

import (
	"time"
)

type SubscriptionDTO struct {
	IDSubscription   int       `json:"id"`
	IDCourse         int       `json:"id_course" validate:"required"`
	IDUser           int       `json:"id_user" validate:"required"`
	CourseRole       string    `json:"course_role" validate:"required"`
	IndividualRating float64   `json:"individual_rating"`
	Comment          string    `json:"comment"`
	CreateDate       time.Time `json:"create_date"`
	LastUpdateDate   time.Time `gorm:"last_update_date"`
}

type SubscriptionsDTO []SubscriptionDTO
