"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Subject {
    constructor(code, link, title, faculty) {
        this.code = code;
        this.link = link;
        this.title = title;
        this.faculty = faculty;
        this.courses = {};
    }
}
exports.Subject = Subject;
