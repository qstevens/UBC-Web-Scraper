module.exports = class Subject {

    constructor(code, link, title, faculty) {
        this.code = code;
        this.link = link;
        this.title = title;
        this.faculty = faculty;
        this.courses = [];
    }

    // constructor(code, link, title, faculty) {
    //     this.code = code;
    //     this.link = link;
    //     this.title = title;
    //     this.faculty = faculty;
    // }
}