package service

import (
	"testing"

	"golang.org/x/crypto/bcrypt"

	"project/dto"
	"project/model"
)

type fakeUserRepo struct {
	all           model.Users
	byId          model.User
	byEmail       model.User
	loginResult   model.User
	insertedID    int // ID returned by InsertUser; -1 simulates "email already used"
	subscriptions model.Subscriptions

	inserted     []model.User
	loginCalls   int
	getByIdCalls int
}

func (f *fakeUserRepo) InsertUser(u model.User) model.User {
	f.inserted = append(f.inserted, u)
	u.IDUser = f.insertedID
	if u.IDUser == 0 {
		u.IDUser = 1
	}
	return u
}
func (f *fakeUserRepo) GetUsers() model.Users { return f.all }
func (f *fakeUserRepo) GetUserById(int) model.User {
	f.getByIdCalls++
	return f.byId
}
func (f *fakeUserRepo) GetUserByEmail(string) model.User { return f.byEmail }
func (f *fakeUserRepo) UserLogin(string) model.User {
	f.loginCalls++
	return f.loginResult
}
func (f *fakeUserRepo) GetSubscriptionsByUserId(int) model.Subscriptions { return f.subscriptions }

// hashed returns a registered user whose password is the bcrypt hash of plain.
func hashed(t *testing.T, plain string) model.User {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("could not hash the password: %v", err)
	}
	return model.User{IDUser: 5, Email: "a@b.com", UserPassword: string(hash), AccessLevel: "User"}
}

func TestInsertUser_StoresAHashedPasswordAndTheDefaultAccessLevel(t *testing.T) {
	repo := &fakeUserRepo{}
	svc := &userService{repo: repo}

	_, err := svc.InsertUser(dto.UserDTO{Email: "a@b.com", UserPassword: "secret123", AccessLevel: "admin"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.inserted) != 1 {
		t.Fatalf("expected 1 insert, got %d", len(repo.inserted))
	}
	stored := repo.inserted[0]
	if stored.UserPassword == "secret123" {
		t.Error("the password must not be stored in plain text")
	}
	if bcrypt.CompareHashAndPassword([]byte(stored.UserPassword), []byte("secret123")) != nil {
		t.Error("the stored value must be a valid bcrypt hash of the password")
	}
	if stored.AccessLevel != "User" {
		t.Errorf("a new user must get access level \"User\" (ignoring the requested one), got %q", stored.AccessLevel)
	}
}

func TestInsertUser_EmailAlreadyUsed_ReturnsError(t *testing.T) {
	// the client signals "email already used" with ID -1
	svc := &userService{repo: &fakeUserRepo{insertedID: -1}}

	_, err := svc.InsertUser(dto.UserDTO{Email: "a@b.com", UserPassword: "secret123"})

	if err == nil {
		t.Fatal("expected an error for a duplicated email")
	}
}

func TestUserLogin_UnknownEmail_IsRejected(t *testing.T) {
	repo := &fakeUserRepo{} // GetUserByEmail returns an empty user (ID 0)
	svc := &userService{repo: repo}

	_, err := svc.UserLogin(dto.UserDTO{Email: "nobody@b.com", UserPassword: "x"})

	if err == nil || err.Error() != "user no register" {
		t.Fatalf("expected error \"user no register\", got %v", err)
	}
	if repo.loginCalls != 0 {
		t.Errorf("the login must not proceed, got %d login calls", repo.loginCalls)
	}
}

func TestUserLogin_WrongPassword_IsRejected(t *testing.T) {
	cases := []struct {
		name     string
		password string
	}{
		{"different password", "other"},
		{"empty password", ""},
		{"same password with different case", "SECRET123"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			repo := &fakeUserRepo{byEmail: hashed(t, "secret123")}
			svc := &userService{repo: repo}

			_, err := svc.UserLogin(dto.UserDTO{Email: "a@b.com", UserPassword: c.password})

			if err == nil || err.Error() != "wrong password" {
				t.Fatalf("expected error \"wrong password\", got %v", err)
			}
			if repo.loginCalls != 0 {
				t.Errorf("a wrong password must not reach the login, got %d login calls", repo.loginCalls)
			}
		})
	}
}

func TestUserLogin_CorrectPassword_ReturnsTheUser(t *testing.T) {
	user := hashed(t, "secret123")
	repo := &fakeUserRepo{byEmail: user, loginResult: user}
	svc := &userService{repo: repo}

	result, err := svc.UserLogin(dto.UserDTO{Email: "a@b.com", UserPassword: "secret123"})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.IDUser != 5 || result.AccessLevel != "User" {
		t.Errorf("wrong user returned: %+v", result)
	}
	if repo.loginCalls != 1 {
		t.Errorf("expected 1 login call, got %d", repo.loginCalls)
	}
}

func TestIsUserTeacher_InvalidID_IsRejected(t *testing.T) {
	for _, id := range []int{0, -1} {
		svc := &userService{repo: &fakeUserRepo{}}

		isTeacher, err := svc.IsUserTeacher(id)

		if err == nil || isTeacher {
			t.Errorf("id %d: expected an error and false, got %v, %v", id, isTeacher, err)
		}
	}
}

func TestIsUserTeacher_DependsOnTheCourseRoles(t *testing.T) {
	cases := []struct {
		name          string
		subscriptions model.Subscriptions
		expected      bool
	}{
		{"no subscriptions", nil, false},
		{"only student subscriptions", model.Subscriptions{{CourseRole: "Student"}, {CourseRole: "Student"}}, false},
		{"one teacher subscription among students", model.Subscriptions{{CourseRole: "Student"}, {CourseRole: "Teacher"}}, true},
		{"role in lower case is not a teacher", model.Subscriptions{{CourseRole: "teacher"}}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			svc := &userService{repo: &fakeUserRepo{subscriptions: c.subscriptions}}

			isTeacher, err := svc.IsUserTeacher(3)

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if isTeacher != c.expected {
				t.Errorf("expected %v, got %v", c.expected, isTeacher)
			}
		})
	}
}

func TestGetUserById_InvalidID_IsRejectedWithoutQueryingTheDB(t *testing.T) {
	repo := &fakeUserRepo{}
	svc := &userService{repo: repo}

	_, err := svc.GetUserById(0)

	if err == nil || err.Error() != "ID not found" {
		t.Fatalf("expected error \"ID not found\", got %v", err)
	}
	if repo.getByIdCalls != 0 {
		t.Errorf("the repository must not be queried, got %d queries", repo.getByIdCalls)
	}
}

func TestGetUserById_NotFound_ReturnsError(t *testing.T) {
	svc := &userService{repo: &fakeUserRepo{}}

	_, err := svc.GetUserById(9)

	if err == nil || err.Error() != "user not found" {
		t.Fatalf("expected error \"user not found\", got %v", err)
	}
}

func TestGetUserByEmail_EmptyEmail_IsRejected(t *testing.T) {
	svc := &userService{repo: &fakeUserRepo{}}

	_, err := svc.GetUserByEmail("")

	if err == nil || err.Error() != "email not found" {
		t.Fatalf("expected error \"email not found\", got %v", err)
	}
}
