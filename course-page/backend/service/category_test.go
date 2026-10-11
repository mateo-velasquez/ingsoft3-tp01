package service

import (
	"testing"

	"project/dto"
	"project/model"
)

// fakeCategoryRepo is a test double: it returns whatever the test configures
// and counts the calls, so the test can verify the interaction.
type fakeCategoryRepo struct {
	byId         model.Category
	inserted     model.Category
	getByIdCalls int
}

func (f *fakeCategoryRepo) InsertCategory(model.Category) model.Category { return f.inserted }
func (f *fakeCategoryRepo) GetCategoryById(int) model.Category {
	f.getByIdCalls++
	return f.byId
}
func (f *fakeCategoryRepo) GetCategoryByName(string) model.Category { return model.Category{} }
func (f *fakeCategoryRepo) GetCategories() model.Categories         { return nil }

func TestGetCategoryById_InvalidID_IsRejectedWithoutQueryingTheDB(t *testing.T) {
	cases := []struct {
		name string
		id   int
	}{
		{"zero", 0},
		{"negative", -1},
		{"very negative", -100},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo := &fakeCategoryRepo{}
			svc := &categoryService{repo: repo}

			_, err := svc.GetCategoryById(c.id)

			if err == nil || err.Error() != "ID not found" {
				t.Fatalf("expected error \"ID not found\", got %v", err)
			}
			if repo.getByIdCalls != 0 {
				t.Errorf("the repository must not be queried, it was queried %d times", repo.getByIdCalls)
			}
		})
	}
}

func TestGetCategoryById_NotFound_ReturnsError(t *testing.T) {
	svc := &categoryService{repo: &fakeCategoryRepo{}} // the repo returns an empty category

	_, err := svc.GetCategoryById(7)

	if err == nil || err.Error() != "category not found" {
		t.Fatalf("expected error \"category not found\", got %v", err)
	}
}

func TestGetCategoryById_Existing_MapsIdAndName(t *testing.T) {
	repo := &fakeCategoryRepo{byId: model.Category{IDCategory: 3, CategoryName: "Backend"}}
	svc := &categoryService{repo: repo}

	result, err := svc.GetCategoryById(3)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.IDCategory != 3 || result.CategoryName != "Backend" {
		t.Errorf("wrong DTO: %+v", result)
	}
	if repo.getByIdCalls != 1 {
		t.Errorf("expected 1 repository query, got %d", repo.getByIdCalls)
	}
}

func TestInsertCategory_AlreadyExists_ReturnsError(t *testing.T) {
	// the client signals "already exists" by returning a category with an empty name
	svc := &categoryService{repo: &fakeCategoryRepo{inserted: model.Category{}}}

	_, err := svc.InsertCategory(dto.CategoryDTO{CategoryName: "Backend"})

	if err == nil {
		t.Fatal("expected an error for a duplicated category")
	}
}
