import {Course} from "./Course";

export class Subject {

    code: string;
    link: string;
    title: string;
    faculty: string;
    courses: {[key:string]:Course};

    constructor(code:string, link:string, title:string, faculty:string) {
        this.code = code;
        this.link = link;
        this.title = title;
        this.faculty = faculty;
        this.courses = {};
    }

}