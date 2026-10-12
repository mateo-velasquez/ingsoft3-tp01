package service

import (
	"errors"
	"testing"

	"project/dto"
	"project/model"
)

// Tests for the model -> DTO mapping and the guards of the read/update operations
// of category, user, course and subscription. All the data is made up.

// fakeImageService replaces the global ImageService used by the course service.
type fakeImageService struct {
	image dto.ImageDTO
	err   error
	calls int
}

func (f *fakeImageService) InsertImage(i dto.ImageDTO) (dto.ImageDTO, error) { return i, nil }
func (f *fakeImageService) GetImageById(int) (dto.ImageDTO, error) {
	f.calls++
	return f.image, f.err
}
func (f *fakeImageService) GetIdMayor() int                   { return 0 }
func (f *fakeImageService) GetImages() (dto.ImagesDTO, error) { return nil, nil }

func useImageService(t *testing.T, fake *fakeImageService) {
	t.Helper()
	original := ImageService
	ImageService = fake
	t.Cleanup(func() { ImageService = original })
}

// ---- category ----

func TestGetCategories_MapsEveryCategory(t *testing.T) {
	repo := &fakeCategoryRepo{all: model.Categories{
		{IDCategory: 1, CategoryName: "Backend"},
		{IDCategory: 2, CategoryName: "Frontend"},
	}}
	svc := &categoryService{repo: repo}

	result, err := svc.GetCategories()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 || result[0].CategoryName != "Backend" || result[1].IDCategory != 2 {
		t.Errorf("wrong result: %+v", result)
	}
}

// ---- user ----

var sampleUser = model.User{
	IDUser: 5, FirstName: "Ana", LastName: "Lopez", Dni: "30111222",
	Email: "ana@example.com", UserPassword: "hash", AccessLevel: "User",
}

func assertSampleUserMapped(t *testing.T, got dto.UserDTO) {
	t.Helper()
	if got.IDUser != 5 || got.FirstName != "Ana" || got.LastName != "Lopez" || got.Dni != "30111222" ||
		got.Email != "ana@example.com" || got.AccessLevel != "User" {
		t.Errorf("user mapped wrong: %+v", got)
	}
}

func TestGetUsers_MapsEveryUser(t *testing.T) {
	svc := &userService{repo: &fakeUserRepo{all: model.Users{sampleUser, sampleUser}}}

	result, err := svc.GetUsers()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 users, got %d", len(result))
	}
	assertSampleUserMapped(t, result[0])
}

func TestGetUserById_Existing_MapsTheUser(t *testing.T) {
	svc := &userService{repo: &fakeUserRepo{byId: sampleUser}}

	result, err := svc.GetUserById(5)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleUserMapped(t, result)
}

func TestGetUserByEmail_Existing_MapsTheUser(t *testing.T) {
	svc := &userService{repo: &fakeUserRepo{byEmail: sampleUser}}

	result, err := svc.GetUserByEmail("ana@example.com")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleUserMapped(t, result)
}

// ---- course ----

var sampleCourse = model.Course{
	IDCourse: 4, IDImage: 9, CourseName: "Go basics", Description: "Intro", Duration: "4 weeks",
	Price: 120.5, InitDate: fixedDate, Rating: 4.5,
	Categories: model.Categories{{IDCategory: 1, CategoryName: "Backend"}, {IDCategory: 2, CategoryName: "Go"}},
}

func TestGetCourseById_InvalidID_IsRejectedWithoutQueryingTheDB(t *testing.T) {
	for _, id := range []int{0, -1} {
		svc := &courseService{repo: &fakeCourseRepo{courseById: sampleCourse}}

		_, err := svc.GetCourseById(id)

		if err == nil || err.Error() != "ID not found" {
			t.Errorf("id %d: expected error \"ID not found\", got %v", id, err)
		}
	}
}

func TestGetCourseById_NotFound_ReturnsError(t *testing.T) {
	svc := &courseService{repo: &fakeCourseRepo{}}

	_, err := svc.GetCourseById(4)

	if err == nil || err.Error() != "course not found" {
		t.Fatalf("expected error \"course not found\", got %v", err)
	}
}

func TestGetCourseById_Existing_MapsTheCourseWithItsImageAndCategories(t *testing.T) {
	images := &fakeImageService{image: dto.ImageDTO{ImageId: 9, ImagePath: "/images/go.png"}}
	useImageService(t, images)
	svc := &courseService{repo: &fakeCourseRepo{courseById: sampleCourse}}

	result, err := svc.GetCourseById(4)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.IDCourse != 4 || result.CourseName != "Go basics" || result.Price != 120.5 || result.Rating != 4.5 {
		t.Errorf("course mapped wrong: %+v", result)
	}
	if result.ImageURL != "/images/go.png" {
		t.Errorf("expected the image URL to be filled, got %q", result.ImageURL)
	}
	if len(result.Categories) != 2 || result.Categories[0] != "Backend" || result.Categories[1] != "Go" {
		t.Errorf("categories mapped wrong: %v", result.Categories)
	}
}

func TestGetCourseById_ImageLookupFails_LeavesTheImageURLEmpty(t *testing.T) {
	useImageService(t, &fakeImageService{err: errors.New("image not found")})
	svc := &courseService{repo: &fakeCourseRepo{courseById: sampleCourse}}

	result, err := svc.GetCourseById(4)

	if err != nil {
		t.Fatalf("an image problem must not fail the whole course, got %v", err)
	}
	if result.ImageURL != "" {
		t.Errorf("expected an empty image URL, got %q", result.ImageURL)
	}
}

func TestGetCourseById_CourseWithoutImage_DoesNotLookForOne(t *testing.T) {
	images := &fakeImageService{}
	useImageService(t, images)
	course := sampleCourse
	course.IDImage = 0
	svc := &courseService{repo: &fakeCourseRepo{courseById: course}}

	_, err := svc.GetCourseById(4)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if images.calls != 0 {
		t.Errorf("the image must not be looked up, got %d lookups", images.calls)
	}
}

func TestGetCourses_MapsEveryCourse(t *testing.T) {
	useImageService(t, &fakeImageService{image: dto.ImageDTO{ImagePath: "/images/go.png"}})
	other := sampleCourse
	other.IDCourse, other.IDImage, other.CourseName, other.Categories = 5, 0, "Docker", nil
	svc := &courseService{repo: &fakeCourseRepo{allCourses: model.Courses{sampleCourse, other}}}

	result, err := svc.GetCourses()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 courses, got %d", len(result))
	}
	if result[0].ImageURL != "/images/go.png" || len(result[0].Categories) != 2 {
		t.Errorf("first course mapped wrong: %+v", result[0])
	}
	if result[1].CourseName != "Docker" || result[1].ImageURL != "" || len(result[1].Categories) != 0 {
		t.Errorf("second course mapped wrong: %+v", result[1])
	}
}

func TestSearchCourses_MapsTheFoundCoursesWithImageAndCategories(t *testing.T) {
	useImageService(t, &fakeImageService{image: dto.ImageDTO{ImagePath: "/images/go.png"}})
	svc := &courseService{repo: &fakeCourseRepo{searchResult: model.Courses{sampleCourse}}}

	result, err := svc.SearchCourses("go", []int{1})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 1 || result[0].ImageURL != "/images/go.png" || len(result[0].Categories) != 2 {
		t.Errorf("wrong result: %+v", result)
	}
}

func TestPutCourseById_WithoutID_ReturnsCourseNotFound(t *testing.T) {
	svc := &courseService{repo: &fakeCourseRepo{}}

	_, err := svc.PutCourseById(dto.CourseDTO{CourseName: "Go"})

	if err == nil || err.Error() != "course not found" {
		t.Fatalf("expected error \"course not found\", got %v", err)
	}
}

func TestPutCourseById_NameUsedByAnotherCourse_IsRejected(t *testing.T) {
	repo := &fakeCourseRepo{
		courseById:   model.Course{IDCourse: 1, CourseName: "Go"},
		courseByName: model.Course{IDCourse: 2, CourseName: "Go"},
	}
	svc := &courseService{repo: repo}

	_, err := svc.PutCourseById(dto.CourseDTO{IDCourse: 1, CourseName: "Go"})

	if err == nil || err.Error() != "there is already a course with this name" {
		t.Fatalf("expected a duplicated-name error, got %v", err)
	}
	if repo.puts != 0 {
		t.Errorf("nothing must be updated, got %d updates", repo.puts)
	}
}

func TestPutCourseById_UnknownCategory_DoesNotUpdate(t *testing.T) {
	repo := &fakeCourseRepo{
		courseById:   model.Course{IDCourse: 1, CourseName: "Go", Rating: 3},
		courseByName: model.Course{IDCourse: 1},
	}
	svc := &courseService{repo: repo}

	_, err := svc.PutCourseById(dto.CourseDTO{IDCourse: 1, CourseName: "Go", Categories: []string{"Unknown"}})

	if err == nil || err.Error() != "category not found" {
		t.Fatalf("expected error \"category not found\", got %v", err)
	}
	if repo.puts != 0 {
		t.Errorf("nothing must be updated, got %d updates", repo.puts)
	}
}

func TestPutCourseById_ValidData_UpdatesOnceWithTheNewCategories(t *testing.T) {
	repo := &fakeCourseRepo{
		courseById:     model.Course{IDCourse: 1, CourseName: "Go", Rating: 3},
		courseByName:   model.Course{IDCourse: 1},
		categoryByName: model.Category{IDCategory: 2, CategoryName: "Backend"},
	}
	svc := &courseService{repo: repo}

	_, err := svc.PutCourseById(dto.CourseDTO{IDCourse: 1, CourseName: "Go", Categories: []string{"Backend"}})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.puts != 1 {
		t.Errorf("expected 1 update, got %d", repo.puts)
	}
	if len(repo.lastPutCategories) != 1 || repo.lastPutCategories[0].CategoryName != "Backend" {
		t.Errorf("the new categories were not sent: %+v", repo.lastPutCategories)
	}
}

// ---- subscription ----

var sampleSubscriptions = model.Subscriptions{
	{IDSubscription: 1, IDCourse: 4, IDUser: 5, CourseRole: "Student", IndividualRating: 4, Comment: "good", CreateDate: fixedDate, LastUpdateDate: fixedDate},
	{IDSubscription: 2, IDCourse: 4, IDUser: 6, CourseRole: "Teacher", IndividualRating: 5, Comment: "great", CreateDate: fixedDate, LastUpdateDate: fixedDate},
}

func assertSampleSubscriptionsMapped(t *testing.T, got dto.SubscriptionsDTO) {
	t.Helper()
	if len(got) != len(sampleSubscriptions) {
		t.Fatalf("expected %d subscriptions, got %d", len(sampleSubscriptions), len(got))
	}
	for i, s := range sampleSubscriptions {
		if got[i].IDSubscription != s.IDSubscription || got[i].IDCourse != s.IDCourse || got[i].IDUser != s.IDUser ||
			got[i].CourseRole != s.CourseRole || got[i].IndividualRating != s.IndividualRating || got[i].Comment != s.Comment {
			t.Errorf("subscription %d mapped wrong: %+v", i, got[i])
		}
	}
}

func TestGetSubscriptions_MapsEverySubscription(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{all: sampleSubscriptions}}

	result, err := svc.GetSubscriptions()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleSubscriptionsMapped(t, result)
}

func TestGetSubscriptionsByUserId_MapsTheSubscriptions(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{byUser: sampleSubscriptions}}

	result, err := svc.GetSubscriptionsByUserId(5)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleSubscriptionsMapped(t, result)
}

func TestGetSubscriptionsByCourseId_MapsTheSubscriptions(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{byCourse: sampleSubscriptions}}

	result, err := svc.GetSubscriptionsByCourseId(4)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleSubscriptionsMapped(t, result)
}

func TestGetSubscriptionById_InvalidID_IsRejected(t *testing.T) {
	for _, id := range []int{0, -3} {
		svc := &subscriptionService{repo: &fakeSubscriptionRepo{byId: sampleSubscriptions[0]}}

		_, err := svc.GetSubscriptionById(id)

		if err == nil || err.Error() != "ID not found" {
			t.Errorf("id %d: expected error \"ID not found\", got %v", id, err)
		}
	}
}

func TestGetSubscriptionById_NotFound_ReturnsError(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{}}

	_, err := svc.GetSubscriptionById(1)

	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestGetSubscriptionById_Existing_MapsTheSubscription(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{byId: sampleSubscriptions[1]}}

	result, err := svc.GetSubscriptionById(2)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.IDSubscription != 2 || result.CourseRole != "Teacher" || result.Comment != "great" {
		t.Errorf("wrong DTO: %+v", result)
	}
}

func TestPutComment_InvalidSubscription_IsRejected(t *testing.T) {
	repo := &fakeSubscriptionRepo{}
	svc := &subscriptionService{repo: repo}

	_, err := svc.PutComment(dto.CommentDTO{IDSubscription: 0, Comment: "hi"})

	if err == nil {
		t.Fatal("expected an error")
	}
	if len(repo.comments) != 0 {
		t.Errorf("the comment must not reach the repository")
	}
}

func TestPutComment_RepositoryErrors_AreReported(t *testing.T) {
	cases := []struct {
		name string
		id   int
	}{
		{"subscription not found", -1},
		{"update failed", -2},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			svc := &subscriptionService{repo: &fakeSubscriptionRepo{commentID: c.id}}

			_, err := svc.PutComment(dto.CommentDTO{IDSubscription: 1, Comment: "hi"})

			if err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestPutComment_Valid_SendsTheCommentOnce(t *testing.T) {
	repo := &fakeSubscriptionRepo{}
	svc := &subscriptionService{repo: repo}

	_, err := svc.PutComment(dto.CommentDTO{IDSubscription: 1, Comment: "nice course"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.comments) != 1 || repo.comments[0].Comment != "nice course" || repo.comments[0].IDSubscription != 1 {
		t.Errorf("wrong comment sent: %+v", repo.comments)
	}
}

func TestPutRating_Valid_SendsTheRatingOnce(t *testing.T) {
	repo := &fakeSubscriptionRepo{}
	svc := &subscriptionService{repo: repo}

	_, err := svc.PutRating(dto.RatingDTO{IDSubscription: 3, IndividualRating: 4.5})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.ratings) != 1 || repo.ratings[0].IndividualRating != 4.5 || repo.ratings[0].IDSubscription != 3 {
		t.Errorf("wrong rating sent: %+v", repo.ratings)
	}
}

func TestPutRating_InvalidSubscription_IsRejected(t *testing.T) {
	repo := &fakeSubscriptionRepo{}
	svc := &subscriptionService{repo: repo}

	_, err := svc.PutRating(dto.RatingDTO{IDSubscription: 0, IndividualRating: 3})

	if err == nil {
		t.Fatal("expected an error")
	}
	if len(repo.ratings) != 0 {
		t.Errorf("the rating must not reach the repository")
	}
}

func TestPutRating_UpdateFailed_ReturnsError(t *testing.T) {
	svc := &subscriptionService{repo: &fakeSubscriptionRepo{ratingID: -2}}

	_, err := svc.PutRating(dto.RatingDTO{IDSubscription: 1, IndividualRating: 3})

	if err == nil || err.Error() != "error changing the rating" {
		t.Fatalf("expected error \"error changing the rating\", got %v", err)
	}
}
