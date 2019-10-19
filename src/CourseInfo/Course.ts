import {Section} from "./Section";

export class Course {

    course_name: string;
    subject_code: string;
    course_number: string;
    course_title: string;
    course_link: string;
    sections: {[key:string]:Section};
    credits: number | undefined;
    description: string | undefined;

    constructor(course:string, title:string, link:string) {
        this.course_name = course;
        this.subject_code = course.split(" ")[0];
        this.course_number = course.split(" ")[1];
        this.course_title = title;
        this.course_link = link;
        this.sections = {};
    }

}
