export class Section {

    href: string;

    section: string;

    status: string;
    activity: string;
    term: string;
    interval: string;
    days: string;
    start: string;
    end: string;
    comments: string;
    building: string;
    room: string;
    instructors: string[];

    totalRemaining: number;
    currentlyRegistered: number;
    generalRemaining: number;
    restrictedRemaining: number;

    subject_code: string;
    course_number: string;
    section_number: string;


    constructor(status:string, section:string, href:string, activity:string, term:string, interval:string, days:string, start:string, end:string, comments:string) {
        this.status = status;
        this.section = section;
        this.href = href;
        this.activity = activity;
        this.term = term;
        this.interval = interval;
        this.days = days;
        this.start = start;
        this.end = end;
        this.comments = comments;

        this.subject_code = section.split(" ")[0];
        this.course_number = section.split(" ")[1];
        this.section_number = section.split(" ")[2];
    }
}