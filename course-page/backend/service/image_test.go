package service

import (
	"testing"

	"project/dto"
	"project/model"
)

type fakeImageRepo struct {
	insertedID int // ID returned by InsertImage; 0 means "use 1"
	byId       model.Image
	all        model.Images
	maxID      int
}

func (f *fakeImageRepo) InsertImage(i model.Image) model.Image {
	i.ImageId = f.insertedID
	if i.ImageId == 0 {
		i.ImageId = 1
	}
	return i
}
func (f *fakeImageRepo) GetImageById(int) model.Image { return f.byId }
func (f *fakeImageRepo) GetImages() model.Images      { return f.all }
func (f *fakeImageRepo) GetIdMayor() int              { return f.maxID }

func TestInsertImage_Success_ReturnsTheDTO(t *testing.T) {
	svc := &imageService{repo: &fakeImageRepo{}}

	result, err := svc.InsertImage(dto.ImageDTO{ImagePath: "images/cover.png"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ImagePath != "images/cover.png" {
		t.Errorf("wrong DTO: %+v", result)
	}
}

func TestInsertImage_RepositoryFails_ReturnsError(t *testing.T) {
	svc := &imageService{repo: &fakeImageRepo{insertedID: -1}}

	_, err := svc.InsertImage(dto.ImageDTO{ImagePath: "images/cover.png"})

	if err == nil || err.Error() != "could not insert image" {
		t.Fatalf("expected error \"could not insert image\", got %v", err)
	}
}

func TestGetImageById_ErrorCases(t *testing.T) {
	cases := []struct {
		name     string
		image    model.Image
		expected string
	}{
		{"not found", model.Image{}, "image not found"},
		{"negative ID from the repository", model.Image{ImageId: -1}, "wrong ID"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			svc := &imageService{repo: &fakeImageRepo{byId: c.image}}

			_, err := svc.GetImageById(1)

			if err == nil || err.Error() != c.expected {
				t.Fatalf("expected error %q, got %v", c.expected, err)
			}
		})
	}
}

func TestGetImageById_Existing_PrefixesThePath(t *testing.T) {
	svc := &imageService{repo: &fakeImageRepo{byId: model.Image{ImageId: 2, ImagePath: "images/cover.png"}}}

	result, err := svc.GetImageById(2)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.ImageId != 2 || result.ImagePath != "/images/cover.png" {
		t.Errorf("wrong DTO: %+v", result)
	}
}

func TestGetImages_MapsEveryImageAndPrefixesThePaths(t *testing.T) {
	repo := &fakeImageRepo{all: model.Images{
		{ImageId: 1, ImagePath: "images/a.png"},
		{ImageId: 2, ImagePath: "images/b.png"},
	}}
	svc := &imageService{repo: repo}

	result, err := svc.GetImages()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(result) != 2 || result[0].ImagePath != "/images/a.png" || result[1].ImagePath != "/images/b.png" {
		t.Errorf("wrong result: %+v", result)
	}
}

func TestGetIdMayor_ReturnsTheRepositoryValue(t *testing.T) {
	svc := &imageService{repo: &fakeImageRepo{maxID: 42}}

	if got := svc.GetIdMayor(); got != 42 {
		t.Errorf("expected 42, got %d", got)
	}
}
