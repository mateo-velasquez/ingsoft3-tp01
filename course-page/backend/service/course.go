package service

import (
	"errors"
	"project/client"
	"project/dto"
	"project/model"
)

type courseService struct{}

type courseServiceInterface interface {
	InsertCourse(courseDTO dto.CourseDTO) (dto.CourseDTO, error)
	GetCourses() (dto.CoursesDTO, error)
	GetCourseById(id int) (dto.CourseDTO, error)
	SearchCourses(query string, categoryIDs []int) (dto.CoursesDTO, error)
	PutCourseById(courseDTO dto.CourseDTO) (dto.CourseDTO, error)
	DeleteCourseById(id int) error
}

var CourseService courseServiceInterface

func init() {
	CourseService = &courseService{}
}

func (s *courseService) GetCourseById(id int) (dto.CourseDTO, error) {
	var course model.Course
	var courseDTO dto.CourseDTO

	if id <= 0 {
		return courseDTO, errors.New("ID not found")
	}

	course = client.GetCourseById(id)

	if course.IDCourse == 0 {
		return courseDTO, errors.New("course not found")
	}

	// I need to pass the data from the DTO to the DAO
	courseDTO.IDCourse = course.IDCourse
	courseDTO.IDImage = course.IDImage
	courseDTO.CourseName = course.CourseName
	courseDTO.Description = course.Description
	courseDTO.Duration = course.Duration
	courseDTO.Price = course.Price
	courseDTO.InitDate = course.InitDate
	courseDTO.Rating = course.Rating

	// Get image URL
	if course.IDImage > 0 {
		imageDTO, err := ImageService.GetImageById(course.IDImage)
		if err == nil {
			courseDTO.ImageURL = imageDTO.ImagePath
		}
	}

	for _, category := range course.Categories {
		courseDTO.Categories = append(courseDTO.Categories, category.CategoryName)
	}
	return courseDTO, nil
}

func (s *courseService) GetCourses() (dto.CoursesDTO, error) {
	var courses model.Courses = client.GetCourses()
	var coursesDTO dto.CoursesDTO

	for _, course := range courses {
		var courseDTO dto.CourseDTO

		// I need to pass the data from the DTO to the DAO
		courseDTO.IDCourse = course.IDCourse
		courseDTO.IDImage = course.IDImage
		courseDTO.CourseName = course.CourseName
		courseDTO.Description = course.Description
		courseDTO.Duration = course.Duration
		courseDTO.Price = course.Price
		courseDTO.InitDate = course.InitDate
		courseDTO.Rating = course.Rating

		// Get image URL
		if course.IDImage > 0 {
			imageDTO, err := ImageService.GetImageById(course.IDImage)
			if err == nil {
				courseDTO.ImageURL = imageDTO.ImagePath
			}
		}

		for _, category := range course.Categories {
			courseDTO.Categories = append(courseDTO.Categories, category.CategoryName)
		}

		coursesDTO = append(coursesDTO, courseDTO)

	}

	return coursesDTO, nil
}

func (s *courseService) SearchCourses(query string, categoryIDs []int) (dto.CoursesDTO, error) {
	var courses model.Courses
	var coursesDTO dto.CoursesDTO

	if query == "" && len(categoryIDs) == 0 {
		return coursesDTO, errors.New("course not found")
	}

	courses = client.SearchCourses(query, categoryIDs)

	for _, course := range courses {
		var courseDTO dto.CourseDTO

		courseDTO.IDCourse = course.IDCourse
		courseDTO.IDImage = course.IDImage
		courseDTO.CourseName = course.CourseName
		courseDTO.Description = course.Description
		courseDTO.Duration = course.Duration
		courseDTO.Price = course.Price
		courseDTO.InitDate = course.InitDate
		courseDTO.Rating = course.Rating

		// Get image URL
		if course.IDImage > 0 {
			imageDTO, err := ImageService.GetImageById(course.IDImage)
			if err == nil {
				courseDTO.ImageURL = imageDTO.ImagePath
			}
		}

		for _, category := range course.Categories {
			courseDTO.Categories = append(courseDTO.Categories, category.CategoryName)
		}

		coursesDTO = append(coursesDTO, courseDTO)
	}

	return coursesDTO, nil
}

func (s *courseService) InsertCourse(courseDTO dto.CourseDTO) (dto.CourseDTO, error) {
	var course model.Course

	// I need to pass the data from the DTO to the DAO
	course.IDImage = courseDTO.IDImage
	course.CourseName = courseDTO.CourseName
	course.Description = courseDTO.Description
	course.Duration = courseDTO.Duration
	course.InitDate = courseDTO.InitDate
	course.Price = courseDTO.Price
	course.Rating = courseDTO.Rating

	for _, categoryName := range courseDTO.Categories {
		category := client.GetCategoryByName(categoryName)

		if category.IDCategory == 0 {
			return courseDTO, errors.New("category not found")
		}

		course.Categories = append(course.Categories, category)

	}

	course = client.InsertCourse(course)

	courseDTO.IDCourse = course.IDCourse

	if course.IDCourse < 0 {
		return courseDTO, errors.New("error creating course")
	}

	return courseDTO, nil
}

func (s *courseService) PutCourseById(courseDTO dto.CourseDTO) (dto.CourseDTO, error) {
	course := client.GetCourseById(courseDTO.IDCourse)
	course.IDCourse = courseDTO.IDCourse

	if course.IDCourse <= 0 {
		return courseDTO, errors.New("course not found")
	}

	courseCheck := client.GetCourseByName(course.CourseName)

	if courseDTO.IDCourse != courseCheck.IDCourse {
		return courseDTO, errors.New("there is already a course with this name")
	}

	if course.CourseName == "" {
		return courseDTO, errors.New("the course need a name")
	}

	if course.Rating < 0 || course.Rating > 5 {
		return courseDTO, errors.New("rating out of range")
	}

	// I need to pass the data from the DTO to the DAO (include New Categories)
	course.IDImage = courseDTO.IDImage
	course.CourseName = courseDTO.CourseName
	course.Description = courseDTO.Description
	course.Duration = courseDTO.Duration
	course.Price = courseDTO.Price
	course.InitDate = courseDTO.InitDate
	course.Rating = courseDTO.Rating

	var newCategories model.Categories
	for _, categoryName := range courseDTO.Categories {
		category := client.GetCategoryByName(categoryName)

		if category.IDCategory <= 0 {
			return courseDTO, errors.New("category not found")
		}

		newCategories = append(newCategories, category)
	}

	course = client.PutCourseById(course, newCategories)

	if course.IDCourse < 0 {
		return courseDTO, errors.New("error updating course")
	}

	return courseDTO, nil
}

func (s *courseService) DeleteCourseById(id int) error {
	course := client.GetCourseById(id)

	if course.IDCourse <= 0 {
		return errors.New("course not found")
	}

	err := client.DeleteCourseById(course)

	return err
}
