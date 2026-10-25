package service

import (
	"testing"

	"project/dto"
	"project/model"
)

type fakeCourseRepo struct {
	courseByName      model.Course
	allCourses        model.Courses
	puts              int
	lastPutCategories model.Categories
	courseById        model.Course
	categoryByName    model.Category
	searchResult      model.Courses

	searchCalls int
	lastQuery   string
	inserts     int
	deletes     int
	lastDeleted model.Course
}

func (f *fakeCourseRepo) GetCourseById(int) model.Course      { return f.courseById }
func (f *fakeCourseRepo) GetCourseByName(string) model.Course { return f.courseByName }
func (f *fakeCourseRepo) GetCourses() model.Courses           { return f.allCourses }
func (f *fakeCourseRepo) SearchCourses(q string, _ []int) model.Courses {
	f.searchCalls++
	f.lastQuery = q
	return f.searchResult
}
func (f *fakeCourseRepo) InsertCourse(c model.Course) model.Course {
	f.inserts++
	c.IDCourse = 1
	return c
}
func (f *fakeCourseRepo) PutCourseById(c model.Course, cats model.Categories) model.Course {
	f.puts++
	f.lastPutCategories = cats
	return c
}
func (f *fakeCourseRepo) DeleteCourseById(c model.Course) error {
	f.deletes++
	f.lastDeleted = c
	return nil
}
func (f *fakeCourseRepo) GetCategoryByName(string) model.Category { return f.categoryByName }

func TestSearchCourses_NoTextAndNoCategories_IsRejected(t *testing.T) {
	cases := []struct {
		name       string
		categories []int
	}{
		{"nil categories", nil},
		{"empty categories", []int{}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo := &fakeCourseRepo{}
			svc := &courseService{repo: repo}

			_, err := svc.SearchCourses("", c.categories)

			if err == nil {
				t.Fatal("expected an error for an empty search")
			}
			if repo.searchCalls != 0 {
				t.Errorf("the DB must not be searched, it was searched %d times", repo.searchCalls)
			}
		})
	}
}

func TestSearchCourses_OnlyText_SearchesOnceWithThatText(t *testing.T) {
	repo := &fakeCourseRepo{searchResult: model.Courses{{IDCourse: 5, CourseName: "Go"}}}
	svc := &courseService{repo: repo}

	result, err := svc.SearchCourses("go", nil)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.searchCalls != 1 || repo.lastQuery != "go" {
		t.Errorf("expected 1 search with \"go\", got %d with %q", repo.searchCalls, repo.lastQuery)
	}
	if len(result) != 1 || result[0].CourseName != "Go" {
		t.Errorf("unexpected result: %+v", result)
	}
}

func TestInsertCourse_UnknownCategory_DoesNotInsertTheCourse(t *testing.T) {
	repo := &fakeCourseRepo{} // GetCategoryByName returns an empty category (ID 0)
	svc := &courseService{repo: repo}

	_, err := svc.InsertCourse(dto.CourseDTO{CourseName: "Go", Categories: []string{"Unknown"}})

	if err == nil || err.Error() != "category not found" {
		t.Fatalf("expected error \"category not found\", got %v", err)
	}
	if repo.inserts != 0 {
		t.Errorf("the course must not be inserted, %d inserts happened", repo.inserts)
	}
}

func TestInsertCourse_EmptyName_DoesNotInsertTheCourse(t *testing.T) {
	repo := &fakeCourseRepo{}
	svc := &courseService{repo: repo}

	_, err := svc.InsertCourse(dto.CourseDTO{CourseName: "   "})

	if err == nil || err.Error() != "the course need a name" {
		t.Fatalf("expected error \"the course need a name\", got %v", err)
	}
	if repo.inserts != 0 {
		t.Errorf("the course must not be inserted, %d inserts happened", repo.inserts)
	}
}

func TestInsertCourse_ExistingCategory_InsertsOnceAndReturnsTheID(t *testing.T) {
	repo := &fakeCourseRepo{categoryByName: model.Category{IDCategory: 2, CategoryName: "Backend"}}
	svc := &courseService{repo: repo}

	result, err := svc.InsertCourse(dto.CourseDTO{CourseName: "Go", Categories: []string{"Backend"}})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.inserts != 1 {
		t.Errorf("expected 1 insert, got %d", repo.inserts)
	}
	if result.IDCourse != 1 {
		t.Errorf("expected the ID assigned by the repository (1), got %d", result.IDCourse)
	}
}

func TestDeleteCourseById_NotFound_DeletesNothing(t *testing.T) {
	repo := &fakeCourseRepo{} // GetCourseById returns an empty course (ID 0)
	svc := &courseService{repo: repo}

	err := svc.DeleteCourseById(99)

	if err == nil || err.Error() != "course not found" {
		t.Fatalf("expected error \"course not found\", got %v", err)
	}
	if repo.deletes != 0 {
		t.Errorf("nothing must be deleted, %d deletes happened", repo.deletes)
	}
}

func TestDeleteCourseById_Existing_DeletesThatCourse(t *testing.T) {
	repo := &fakeCourseRepo{courseById: model.Course{IDCourse: 4}}
	svc := &courseService{repo: repo}

	err := svc.DeleteCourseById(4)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.deletes != 1 || repo.lastDeleted.IDCourse != 4 {
		t.Errorf("expected course 4 to be deleted once, got %d deletes (last %d)",
			repo.deletes, repo.lastDeleted.IDCourse)
	}
}
