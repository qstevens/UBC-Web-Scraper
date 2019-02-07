module.exports = class Section {

    constructor(course, title) {
        this.course = course;
        this.subject_code = course.split(" ")[0];
        this.course_number = course.split(" ")[1];
        this.course_title = title;
    }
}