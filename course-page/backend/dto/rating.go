package dto

type RatingDTO struct {
	IDSubscription   int     `json:"id"`
	IndividualRating float64 `json:"individual_rating"`
}
