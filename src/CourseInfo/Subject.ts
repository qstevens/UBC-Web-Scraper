import {Course} from "./Course";

export class Subject {

    code: string;
    link: string;
    title: string;
    faculty: string;
    courses: {[key:string]:Course};

    constructor(code, link, title, faculty) {
        this.code = code;
        this.link = link;
        this.title = title;
        this.faculty = faculty;
        this.courses = {};
    }

}