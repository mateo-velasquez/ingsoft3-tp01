package service

import (
	"errors"
	"project/client"
	"project/dto"
	"project/model"
)

type subscriptionService struct{}

type subscriptionServiceInterface interface {
	InsertSubscription(subscriptionDTO dto.SubscriptionDTO) (dto.SubscriptionDTO, error)
	GetSubscriptions() (dto.SubscriptionsDTO, error)
	GetSubscriptionById(id int) (dto.SubscriptionDTO, error)
	GetSubscriptionsByUserId(userId int) (dto.SubscriptionsDTO, error)
	GetSubscriptionsByCourseId(courseId int) (dto.SubscriptionsDTO, error)
	PutRating(ratingDto dto.RatingDTO) (dto.RatingDTO, error)
	PutComment(commentDto dto.CommentDTO) (dto.CommentDTO, error)
}

var SubscriptionService subscriptionServiceInterface

func init() {
	SubscriptionService = &subscriptionService{}
}

func (s *subscriptionService) InsertSubscription(subscriptionDTO dto.SubscriptionDTO) (dto.SubscriptionDTO, error) {
	var subscription model.Subscription

	// Registramos los datos del dto en el subscription (model)
	subscription.IDCourse = subscriptionDTO.IDCourse
	subscription.IDUser = subscriptionDTO.IDUser

	if subscription.IDCourse <= 0 {
		return subscriptionDTO, errors.New("error creating subscription. The course doesn't exist")
	}

	if subscription.IDUser <= 0 {
		return subscriptionDTO, errors.New("error creating subscription. The user doesn't exist")
	}

	if subscriptionDTO.CourseRole == "" {
		subscription.CourseRole = "Student"
	} else {
		subscription.CourseRole = "Teacher"
	}

	//Llamamos al cliente para que interactua con la base de datos:
	subscription = client.InsertSubscription(subscription)

	if subscription.IDSubscription == -1 {
		return subscriptionDTO, errors.New("error creating subscription: Subscription allready exists")
	}

	subscriptionDTO.IDSubscription = subscription.IDSubscription
	subscriptionDTO.IndividualRating = subscription.IndividualRating
	subscriptionDTO.Comment = subscription.Comment
	subscriptionDTO.LastUpdateDate = subscription.LastUpdateDate
	subscriptionDTO.CreateDate = subscription.CreateDate

	return subscriptionDTO, nil
}

func (s *subscriptionService) GetSubscriptions() (dto.SubscriptionsDTO, error) {
	var subscriptionsDTO dto.SubscriptionsDTO
	var subscriptions model.Subscriptions = client.GetSubscriptions()

	for _, subscription := range subscriptions {
		var subscriptionDTO dto.SubscriptionDTO
		subscriptionDTO.IDSubscription = subscription.IDSubscription
		subscriptionDTO.IDCourse = subscription.IDCourse
		subscriptionDTO.IDUser = subscription.IDUser
		subscriptionDTO.IndividualRating = subscription.IndividualRating
		subscriptionDTO.Comment = subscription.Comment
		subscriptionDTO.CourseRole = subscription.CourseRole
		subscriptionDTO.LastUpdateDate = subscription.LastUpdateDate
		subscriptionDTO.CreateDate = subscription.CreateDate

		subscriptionsDTO = append(subscriptionsDTO, subscriptionDTO)
	}

	return subscriptionsDTO, nil
}

func (s *subscriptionService) GetSubscriptionById(id int) (dto.SubscriptionDTO, error) {
	var subscription model.Subscription
	var subscriptionDTO dto.SubscriptionDTO

	if id <= 0 {
		return subscriptionDTO, errors.New("ID not found")
	}

	subscription = client.GetSubscriptionById(id)

	if subscription.IDSubscription == 0 {
		return subscriptionDTO, errors.New("user not found")
	}

	subscriptionDTO.IDSubscription = subscription.IDSubscription
	subscriptionDTO.IDCourse = subscription.IDCourse
	subscriptionDTO.IDUser = subscription.IDUser
	subscriptionDTO.IndividualRating = subscription.IndividualRating
	subscriptionDTO.Comment = subscription.Comment
	subscriptionDTO.CourseRole = subscription.CourseRole
	subscriptionDTO.LastUpdateDate = subscription.LastUpdateDate
	subscriptionDTO.CreateDate = subscription.CreateDate

	return subscriptionDTO, nil
}

func (s *subscriptionService) GetSubscriptionsByUserId(userId int) (dto.SubscriptionsDTO, error) {
	var subscriptionsDTO dto.SubscriptionsDTO
	var subscriptions model.Subscriptions = client.GetSubscriptionsByUserId(userId)

	for _, subscription := range subscriptions {
		var subscriptionDTO dto.SubscriptionDTO
		subscriptionDTO.IDSubscription = subscription.IDSubscription
		subscriptionDTO.IDCourse = subscription.IDCourse
		subscriptionDTO.IDUser = subscription.IDUser
		subscriptionDTO.IndividualRating = subscription.IndividualRating
		subscriptionDTO.Comment = subscription.Comment
		subscriptionDTO.CourseRole = subscription.CourseRole
		subscriptionDTO.LastUpdateDate = subscription.LastUpdateDate
		subscriptionDTO.CreateDate = subscription.CreateDate

		subscriptionsDTO = append(subscriptionsDTO, subscriptionDTO)
	}

	return subscriptionsDTO, nil
}

func (s *subscriptionService) GetSubscriptionsByCourseId(courseId int) (dto.SubscriptionsDTO, error) {
	var subscriptionsDTO dto.SubscriptionsDTO
	var subscriptions model.Subscriptions = client.GetSubscriptionsByCourseId(courseId)

	for _, subscription := range subscriptions {
		var subscriptionDTO dto.SubscriptionDTO
		subscriptionDTO.IDSubscription = subscription.IDSubscription
		subscriptionDTO.IDCourse = subscription.IDCourse
		subscriptionDTO.IDUser = subscription.IDUser
		subscriptionDTO.IndividualRating = subscription.IndividualRating
		subscriptionDTO.Comment = subscription.Comment
		subscriptionDTO.CourseRole = subscription.CourseRole
		subscriptionDTO.LastUpdateDate = subscription.LastUpdateDate
		subscriptionDTO.CreateDate = subscription.CreateDate

		subscriptionsDTO = append(subscriptionsDTO, subscriptionDTO)
	}

	return subscriptionsDTO, nil
}

func (s *subscriptionService) PutRating(ratingDto dto.RatingDTO) (dto.RatingDTO, error) {
	var subscription model.Subscription

	if ratingDto.IndividualRating < 0 || ratingDto.IndividualRating > 5 {
		return ratingDto, errors.New("error rating is out of range")
	}

	if ratingDto.IDSubscription <= 0 {
		return ratingDto, errors.New("error this subscription doesn't exists")
	}

	subscription.IDSubscription = ratingDto.IDSubscription
	subscription.IndividualRating = ratingDto.IndividualRating

	subscription = client.PutRating(subscription)

	if subscription.IDSubscription == -1 {
		return ratingDto, errors.New("error finding the Subscription")
	}

	if subscription.IDSubscription == -2 {
		return ratingDto, errors.New("error changing the rating")
	}

	return ratingDto, nil
}

func (s *subscriptionService) PutComment(commentDto dto.CommentDTO) (dto.CommentDTO, error) {
	var subscription model.Subscription

	if commentDto.IDSubscription <= 0 {
		return commentDto, errors.New("error this subscription doesn't exists")
	}

	subscription.IDSubscription = commentDto.IDSubscription
	subscription.Comment = commentDto.Comment

	subscription = client.PutComment(subscription)

	if subscription.IDSubscription == -1 {
		return commentDto, errors.New("error finding the Subscription")
	}

	if subscription.IDSubscription == -2 {
		return commentDto, errors.New("error changing the Comment")
	}

	return commentDto, nil
}
