import { Subject } from './CourseInfo/Subject';
import { Course } from "./CourseInfo/Course";
import { Section } from "./CourseInfo/Section";

let http = require('http');
let https = require('https');

https.globalAgent.maxSockets = 50;
http.globalAgent.maxSockets = 50;

let fs = require('fs');
let rp = require('request-promise');
let cheerio = require('cheerio');

let startTime = new Date();


function getAvailableSessions(html: string) {
    let sessions = [];
    let $ = cheerio.load(html);
    let sessionDropdown = $('div .pull-right').children('.btn-group').next();
    let urls = $('ul', sessionDropdown).children();
    urls.each(function () {
        let url = $(this).text();
        sessions.push(url);
    });    
    return sessions;
}

function formatUrl(...args: string[]) {
    let ubcCourseURL = 'https://courses.students.ubc.ca/cs/courseschedule';
    
    if (args[0] == undefined) 
        return ubcCourseURL;

    let session = args[0];
    let sesscd = session.split(' ')[1][0];
    let sessyr = session.split(' ')[0];
    
    if (args[1] != undefined) {
        ubcCourseURL += args[1] + '&sesscd=' + sesscd + '&sessyr=' + sessyr + "&pname=subjarea";
        return ubcCourseURL;
    }
    
    ubcCourseURL += '?sesscd=' + sesscd + '&sessyr=' + sessyr + "&pname=subjarea";
    return ubcCourseURL
}

function scrapeSessions(session: string) {
    let SubjectListMap: { [key: string]: Subject } = {};

    let sessionUrl: string = formatUrl(session);

    let sessyr = session.split(' ')[0];
    let sesscd = session.split(' ')[1][0];
    let sessionAndYearAppend = "&sessyr=" + sessyr + "&sesscd=" + sesscd;

    rp(sessionUrl)
    .then(function (html: string) {
        let SubjectList: Subject[] = [];

        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);

        subjects.each(function () {
            let codeChild = $(this).children().first();
            let code: string = codeChild.text();

            let link: string = $('a', codeChild).attr('href');

            let titleChild = $(codeChild).next();
            let title: string = titleChild.text().trim();

            let facultyChild = $(titleChild).next();
            let faculty: string = facultyChild.text();

            let subject: Subject = new Subject(code, link, title, faculty);
            SubjectList.push(subject);
            SubjectListMap[code] = subject;

        });

        let coursePromises: Promise<string>[] = [];

        for (let subject of SubjectList) {
            if (subject.link !== undefined && subject.link !== null) {
                coursePromises.push(rp(formatUrl(session, subject.link))
                    .catch(function (err) {
                        console.log(err);
                    }));
            }
        }

        console.log("Subjects: " + SubjectList.length);

        return coursePromises;
    })
    .then(coursePromises => Promise.all(coursePromises))
    .then(function (coursePromises: string[]) {
        let CourseList: Course[] = [];
        for (let promise of coursePromises) {
            let $ = cheerio.load(promise);
            let mainTable = $('#mainTable');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);

            subjects.each(function (i, elem) {

                let course_tr = $(this).toArray()[0];
                let course_td_a = course_tr.children[0].children[0];
                let course_td_a_href: string = course_td_a.attribs.href + sessionAndYearAppend;
                let course_td_a_text: string = course_td_a.children[0].data;
                let course_td_title: string = course_tr.children[1].children[0].data;

                let course: Course = new Course(course_td_a_text, course_td_title, course_td_a_href);
                SubjectListMap[course.subject_code].courses[course.course_number] = course;
                CourseList.push(course);
            });

        }

        let sectionPromises = []
        for (let course of CourseList) {
            sectionPromises.push(rp(formatUrl(session, course.course_link)));
        }

        console.log("Courses:", CourseList.length);

        return sectionPromises;
    })
    .then(sectionPromises => Promise.all(sectionPromises))
    .then(function (sectionPromises: string[]) {

        let SectionList: Section[] = [];

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

            let mainTable = $('table');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);

            let h4 = $('h4');
            let description = h4.next().text();

            let cdfText = $('#cdfText');
            let credits = cdfText.next().text();

            subjects.each(function (i, elem) {
                let curr_td = $(this).children().first();

                let status: string = curr_td.text();
                curr_td = curr_td.next();

                let curr_section: string = curr_td.text();
                let href: string = $('a', curr_td).attr('href') + sessionAndYearAppend;
                curr_td = curr_td.next();

                let activity: string = curr_td.text();
                curr_td = curr_td.next();

                let term: string = curr_td.text();
                curr_td = curr_td.next();

                let interval: string = curr_td.text();
                curr_td = curr_td.next();

                let days: string = curr_td.text();
                curr_td = curr_td.next();

                let start: string = curr_td.text();
                curr_td = curr_td.next();

                let end: string = curr_td.text();
                curr_td = curr_td.next();

                let comments: string = curr_td.text();
                comments = comments.trim().replace("Section Comments", "").trim();

                let section = new Section(status, curr_section, href, activity, term, interval, days, start, end, comments);

                if (section.course_number !== undefined) {
                    let currCourse = SubjectListMap[section.subject_code].courses[section.course_number];
                    if (currCourse.credits === undefined) {
                        currCourse.credits = credits;
                    }
                    if (currCourse.description === undefined) {
                        currCourse.description = description;
                    }
                    currCourse.sections[section.section_number] = section;
                    SectionList.push(section);
                }
            });
        }
        let innerSectionPromises: Section[] = []
        for (let section of SectionList) {
            innerSectionPromises.push(rp(formatUrl(session, section.href)));
        }

        console.log("Sections: " + SectionList.length);
        return innerSectionPromises;
    })
    .then(promises => Promise.all(promises))
    .then(function (sectionPromises: string[]) {

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

            let section = $('.active')[0].children[0].data;
            let section_subject = section.split(" ")[0];
            let section_course = section.split(" ")[1];
            let section_section = section.split(" ")[2];

            // Get Tables on Page (should contain a sectionTable, instructorTable, seatTable, bookTable)
            let tables = $('table');

            // Add Building and Room details to Section
            let sectionTable = tables[1];
            let sectionBody = $('tbody', sectionTable);
            let section_td = $('td', sectionBody);

            let section_building = section_td.first().next().next().next().next().text();
            let section_room = section_td.first().next().next().next().next().next().text();

            SubjectListMap[section_subject].courses[section_course].sections[section_section].building = section_building;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].room = section_room;

            // Add instructors to Section
            let instructors = [];
            let instructorTable = tables[2];
            let instructorBody = $('tbody', instructorTable);
            let instructorTrs = $('tr', instructorBody);

            instructorTrs.each(function () {
                instructors.push($(this).children().first().next().text());
            });

            SubjectListMap[section_subject].courses[section_course].sections[section_section].instructors = instructors;

            // Add Seat Summary to Section
            let seatTable = tables[3];
            let seatBody = $('tbody', seatTable);

            let currSeat = $('tr', seatBody).first();
            let totalRemaining = $('td', currSeat).first().next().text();

            currSeat = currSeat.next();
            let currrentlyRegistered = $('td', currSeat).first().next().text();

            currSeat = currSeat.next();
            let generalRemaining = $('td', currSeat).first().next().text();

            currSeat = currSeat.next();
            let restrictedRemaining = $('td', currSeat).first().next().text();

            SubjectListMap[section_subject].courses[section_course].sections[section_section].totalRemaining = totalRemaining;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].currentlyRegistered = currrentlyRegistered;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].generalRemaining = generalRemaining;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].restrictedRemaining = restrictedRemaining;
        }

        return SubjectListMap;
    })
    .then(function (CoursesMap) {
        let elapsed = new Date().getTime() - startTime.getTime()
        console.log("time elapsed: " + elapsed);
        console.log("writing file");
        let destination: string = __dirname + '/../UBC-Courses-' + session + '.json'
        fs.writeFileSync(destination, JSON.stringify(CoursesMap));
        console.log("written to file");
        return CoursesMap;
    })
    .catch(function (err) {
        console.log(err);
    });
}

rp(formatUrl())
.then(function (html: string) {
    let sessions: string[] = getAvailableSessions(html);
    sessions.forEach(session => {
        scrapeSessions(session);
    });
})