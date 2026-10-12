package service

import (
	"strconv"
	"testing"

	"project/dto"
	"project/model"
)

type fakeSubscriptionRepo struct {
	all, byUser, byCourse model.Subscriptions
	byId                  model.Subscription
	commentID             int
	comments              []model.Subscription
	// ID returned by InsertSubscription / PutRating; if left at zero, 10 is used for inserts
	insertedID int
	ratingID   int

	inserts []model.Subscription
	ratings []model.Subscription
}

func (f *fakeSubscriptionRepo) InsertSubscription(s model.Subscription) model.Subscription {
	f.inserts = append(f.inserts, s)
	s.IDSubscription = f.insertedID
	if s.IDSubscription == 0 {
		s.IDSubscription = 10
	}
	return s
}
func (f *fakeSubscriptionRepo) GetSubscriptions() model.Subscriptions              { return f.all }
func (f *fakeSubscriptionRepo) GetSubscriptionById(int) model.Subscription         { return f.byId }
func (f *fakeSubscriptionRepo) GetSubscriptionsByUserId(int) model.Subscriptions   { return f.byUser }
func (f *fakeSubscriptionRepo) GetSubscriptionsByCourseId(int) model.Subscriptions { return f.byCourse }
func (f *fakeSubscriptionRepo) PutRating(s model.Subscription) model.Subscription {
	f.ratings = append(f.ratings, s)
	if f.ratingID != 0 {
		s.IDSubscription = f.ratingID
	}
	return s
}
func (f *fakeSubscriptionRepo) PutComment(s model.Subscription) model.Subscription {
	f.comments = append(f.comments, s)
	if f.commentID != 0 {
		s.IDSubscription = f.commentID
	}
	return s
}

func TestInsertSubscription_InvalidCourseOrUser_IsRejected(t *testing.T) {
	cases := []struct {
		name         string
		course, user int
	}{
		{"zero course", 0, 1},
		{"negative course", -1, 1},
		{"zero user", 1, 0},
		{"negative user", 1, -5},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo := &fakeSubscriptionRepo{}
			svc := &subscriptionService{repo: repo}

			_, err := svc.InsertSubscription(dto.SubscriptionDTO{IDCourse: c.course, IDUser: c.user})

			if err == nil {
				t.Fatal("expected an error")
			}
			if len(repo.inserts) != 0 {
				t.Errorf("nothing must be inserted, %d inserts happened", len(repo.inserts))
			}
		})
	}
}

func TestInsertSubscription_Role_EmptyIsStudentAndAnythingElseIsTeacher(t *testing.T) {
	cases := []struct {
		requested string
		expected  string
	}{
		{"", "Student"},
		{"Teacher", "Teacher"},
		{"anything", "Teacher"},
	}
	for _, c := range cases {
		t.Run("role '"+c.requested+"'", func(t *testing.T) {
			repo := &fakeSubscriptionRepo{}
			svc := &subscriptionService{repo: repo}

			_, err := svc.InsertSubscription(dto.SubscriptionDTO{IDCourse: 1, IDUser: 1, CourseRole: c.requested})

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(repo.inserts) != 1 || repo.inserts[0].CourseRole != c.expected {
				t.Errorf("expected role %q, got %+v", c.expected, repo.inserts)
			}
		})
	}
}

func TestInsertSubscription_AlreadyExists_ReturnsError(t *testing.T) {
	// the client signals "already exists" with ID -1
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{insertedID: -1}}

	_, err := svc.InsertSubscription(dto.SubscriptionDTO{IDCourse: 1, IDUser: 1})

	if err == nil {
		t.Fatal("expected an error for a duplicated subscription")
	}
}

func TestPutRating_BoundaryValues(t *testing.T) {
	cases := []struct {
		rating float64
		valid  bool
	}{
		{-1, false},
		{0, true},
		{5, true},
		{6, false},
	}
	for _, c := range cases {
		t.Run(strconv.FormatFloat(c.rating, 'f', -1, 64), func(t *testing.T) {
			repo := &fakeSubscriptionRepo{}
			svc := &subscriptionService{repo: repo}

			_, err := svc.PutRating(dto.RatingDTO{IDSubscription: 1, IndividualRating: c.rating})

			if c.valid && err != nil {
				t.Errorf("%v must be valid, got error: %v", c.rating, err)
			}
			if !c.valid && err == nil {
				t.Errorf("%v must be rejected", c.rating)
			}
			if !c.valid && len(repo.ratings) != 0 {
				t.Errorf("an invalid rating must not reach the repository")
			}
		})
	}
}

func TestPutRating_SubscriptionNotFound_ReturnsError(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{ratingID: -1}}

	_, err := svc.PutRating(dto.RatingDTO{IDSubscription: 1, IndividualRating: 4})

	if err == nil || err.Error() != "error finding the Subscription" {
		t.Fatalf("expected a subscription-not-found error, got %v", err)
	}
}
