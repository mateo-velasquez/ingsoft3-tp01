-- Table for Users
CREATE TABLE IF NOT EXISTS users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastupdate_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dni VARCHAR(9) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    user_password VARCHAR(255) NOT NULL,
    access_level ENUM('User', 'Admin') NOT NULL DEFAULT 'User'
);

-- Table for Images (of courses)
CREATE TABLE IF NOT EXISTS images (
    image_id INT PRIMARY KEY AUTO_INCREMENT,
    image_path VARCHAR(300) NOT NULL UNIQUE
);

-- Table for Categories
CREATE TABLE IF NOT EXISTS categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

-- Table for Courses
CREATE TABLE IF NOT EXISTS courses (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    image_id INT,
    create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastupdate_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    course_name VARCHAR(300) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    init_date DATE NOT NULL,
    course_description VARCHAR(1000),
    duration VARCHAR(100) NOT NULL,
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE SET NULL
);

-- Table for Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    user_id INT NOT NULL,
    course_role ENUM('Teacher', 'Student') NOT NULL DEFAULT 'Student',
    create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    individual_rating DECIMAL(3,2) CHECK(individual_rating >= 0 AND individual_rating <= 5),
    comment VARCHAR(300),
    lastupdate_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE (course_id, user_id)
);

-- Table for Files
CREATE TABLE IF NOT EXISTS files (
    file_id INT PRIMARY KEY AUTO_INCREMENT,
    subscription_id INT NOT NULL,
    file_name VARCHAR(300) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastupdate_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id) ON DELETE CASCADE
);

-- Tabla pasarela entre cursos y categorias
CREATE TABLE IF NOT EXISTS course_categories (
    course_id INT,
    category_id INT,
    PRIMARY KEY (course_id, category_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

DELIMITER //

-- Trigger to update course rating after INSERT on subscriptions
CREATE TRIGGER update_course_rating_after_insert
AFTER INSERT ON subscriptions
FOR EACH ROW
BEGIN
    DECLARE avg_rating DECIMAL(3,2);

    -- Calculate the average rating for the course
    SELECT AVG(individual_rating) INTO avg_rating
    FROM subscriptions
    WHERE course_id = NEW.course_id;

    -- Update the course rating (0 if no ratings)
    UPDATE courses
    SET rating = IFNULL(avg_rating, 0)
    WHERE course_id = NEW.course_id;
END //

-- Trigger to update course rating after UPDATE on subscriptions
CREATE TRIGGER update_course_rating_after_update
AFTER UPDATE ON subscriptions
FOR EACH ROW
BEGIN
    DECLARE avg_rating DECIMAL(3,2);

    IF NEW.individual_rating <=> OLD.individual_rating THEN
        SELECT AVG(individual_rating) INTO avg_rating
        FROM subscriptions
        WHERE course_id = NEW.course_id;
        UPDATE courses
        SET rating = IFNULL(avg_rating, 0)
        WHERE course_id = NEW.course_id;
    END IF;
END //

-- Trigger to update course rating after DELETE on subscriptions
CREATE TRIGGER update_course_rating_after_delete
AFTER DELETE ON subscriptions
FOR EACH ROW
BEGIN
    DECLARE avg_rating DECIMAL(3,2);

    -- Calculate the average rating for the course
    SELECT AVG(individual_rating) INTO avg_rating
    FROM subscriptions
    WHERE course_id = OLD.course_id;

    -- Update the course rating (0 if no ratings)
    UPDATE courses
    SET rating = IFNULL(avg_rating, 0)
    WHERE course_id = OLD.course_id;
END //

DELIMITER ;
