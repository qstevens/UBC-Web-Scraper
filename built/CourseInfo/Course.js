"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Course {
    constructor(course, title, link) {
        this.course_name = course;
        this.subject_code = course.split(" ")[0];
        this.course_number = course.split(" ")[1];
        this.course_title = title;
        this.course_link = link;
        this.sections = {};
    }
}
exports.Course = Course;
