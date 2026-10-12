package service

import (
	"testing"
	"time"

	"project/dto"
	"project/model"
)

var fixedDate = time.Date(2025, 3, 10, 12, 0, 0, 0, time.UTC)

type fakeFileRepo struct {
	insertedID int // ID returned by InsertFile; 0 means "use 1"
	byId       model.File
	all        model.Files
	bySub      model.Files
	byCourse   model.Files

	getByIdCalls  int
	bySubCalls    int
	byCourseCalls int
}

func (f *fakeFileRepo) InsertFile(file model.File) model.File {
	file.FileId = f.insertedID
	if file.FileId == 0 {
		file.FileId = 1
	}
	file.CreateDate = fixedDate
	file.LastUpdateDate = fixedDate
	return file
}
func (f *fakeFileRepo) GetFileById(int) model.File {
	f.getByIdCalls++
	return f.byId
}
func (f *fakeFileRepo) GetFiles() model.Files { return f.all }
func (f *fakeFileRepo) GetFilesBySubscriptionId(int) model.Files {
	f.bySubCalls++
	return f.bySub
}
func (f *fakeFileRepo) GetFilesByCourseId(int) model.Files {
	f.byCourseCalls++
	return f.byCourse
}

var sampleFiles = model.Files{
	{FileId: 1, SubscriptionId: 10, FileName: "notes.pdf", FilePath: "files/notes.pdf", CreateDate: fixedDate, LastUpdateDate: fixedDate},
	{FileId: 2, SubscriptionId: 11, FileName: "slides.pdf", FilePath: "files/slides.pdf", CreateDate: fixedDate, LastUpdateDate: fixedDate},
}

func assertSampleFilesMapped(t *testing.T, result dto.FilesDTO) {
	t.Helper()
	if len(result) != len(sampleFiles) {
		t.Fatalf("expected %d files, got %d", len(sampleFiles), len(result))
	}
	for i, file := range sampleFiles {
		got := result[i]
		if got.FileId != file.FileId || got.SubscriptionId != file.SubscriptionId || got.FileName != file.FileName {
			t.Errorf("file %d mapped wrong: %+v", i, got)
		}
		if got.FilePath != "/"+file.FilePath {
			t.Errorf("file %d: the path must start with \"/\", got %q", i, got.FilePath)
		}
		if !got.CreateDate.Equal(fixedDate) || !got.LastUpdateDate.Equal(fixedDate) {
			t.Errorf("file %d: dates were not copied", i)
		}
	}
}

func TestInsertFile_Success_ReturnsTheGeneratedIDAndDates(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{insertedID: 7}}

	result, err := svc.InsertFile(dto.FileDTO{FileName: "notes.pdf", FilePath: "files/notes.pdf", SubscriptionId: 10})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.FileId != 7 || !result.CreateDate.Equal(fixedDate) || !result.LastUpdateDate.Equal(fixedDate) {
		t.Errorf("the generated data was not returned: %+v", result)
	}
}

func TestInsertFile_RepositoryFails_ReturnsError(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{insertedID: -1}}

	_, err := svc.InsertFile(dto.FileDTO{FileName: "notes.pdf"})

	if err == nil || err.Error() != "could not insert file" {
		t.Fatalf("expected error \"could not insert file\", got %v", err)
	}
}

func TestGetFileById_NegativeID_IsRejectedWithoutQueryingTheDB(t *testing.T) {
	for _, id := range []int{-1, -50} {
		repo := &fakeFileRepo{}
		svc := &fileService{repo: repo}

		_, err := svc.GetFileById(id)

		if err == nil || err.Error() != "wrong ID" {
			t.Errorf("id %d: expected error \"wrong ID\", got %v", id, err)
		}
		if repo.getByIdCalls != 0 {
			t.Errorf("id %d: the repository must not be queried", id)
		}
	}
}

func TestGetFileById_NotFound_ReturnsError(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{}} // empty file, ID 0

	_, err := svc.GetFileById(3)

	if err == nil || err.Error() != "file not found" {
		t.Fatalf("expected error \"file not found\", got %v", err)
	}
}

func TestGetFileById_RepositoryReturnsANegativeID_ReturnsError(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{byId: model.File{FileId: -1}}}

	_, err := svc.GetFileById(3)

	if err == nil || err.Error() != "wrong ID" {
		t.Fatalf("expected error \"wrong ID\", got %v", err)
	}
}

func TestGetFileById_Existing_MapsTheFileAndPrefixesThePath(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{byId: sampleFiles[0]}}

	result, err := svc.GetFileById(1)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.FileId != 1 || result.FileName != "notes.pdf" || result.FilePath != "/files/notes.pdf" {
		t.Errorf("wrong DTO: %+v", result)
	}
}

func TestGetFiles_MapsEveryFile(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{all: sampleFiles}}

	result, err := svc.GetFiles()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleFilesMapped(t, result)
}

func TestGetFilesBySubscriptionId_NegativeID_IsRejected(t *testing.T) {
	repo := &fakeFileRepo{}
	svc := &fileService{repo: repo}

	_, err := svc.GetFilesBySubscriptionId(-1)

	if err == nil {
		t.Fatal("expected an error")
	}
	if repo.bySubCalls != 0 {
		t.Error("the repository must not be queried")
	}
}

func TestGetFilesBySubscriptionId_Valid_MapsTheFiles(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{bySub: sampleFiles}}

	result, err := svc.GetFilesBySubscriptionId(10)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleFilesMapped(t, result)
}

func TestGetFilesByCourseId_NegativeID_IsRejected(t *testing.T) {
	repo := &fakeFileRepo{}
	svc := &fileService{repo: repo}

	_, err := svc.GetFilesByCourseId(-1)

	if err == nil {
		t.Fatal("expected an error")
	}
	if repo.byCourseCalls != 0 {
		t.Error("the repository must not be queried")
	}
}

func TestGetFilesByCourseId_Valid_MapsTheFiles(t *testing.T) {
	svc := &fileService{repo: &fakeFileRepo{byCourse: sampleFiles}}

	result, err := svc.GetFilesByCourseId(4)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertSampleFilesMapped(t, result)
}
