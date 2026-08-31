package model

import (
	"time"
)

type Subscription struct {
	IDSubscription   int       `gorm:"column:subscription_id;primaryKey;autoIncrement"`
	IDCourse         int       `gorm:"column:course_id;not null"`
	IDUser           int       `gorm:"column:user_id;not null"`
	CourseRole       string    `gorm:"column:course_role;not null"`
	IndividualRating float64   `gorm:"column:individual_rating;type:decimal(3,2);check:individual_rating>=0 AND individual_rating<=5"`
	Comment          string    `gorm:"column:comment;type:varchar(300)"`
	CreateDate       time.Time `gorm:"column:create_date;not null;default:CURRENT_TIMESTAMP"`
	LastUpdateDate   time.Time `gorm:"column:lastupdate_date;not null;default:CURRENT_TIMESTAMP"`
}

type Subscriptions []Subscription
