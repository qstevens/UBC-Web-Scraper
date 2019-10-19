import * as http from 'http';
import * as https from 'https';

import * as fs from 'fs';
import * as path from 'path';

import * as yargs from 'yargs';

https.globalAgent.maxSockets = 50;
http.globalAgent.maxSockets = 50;

import {Subject} from './CourseInfo/Subject';
import {Course} from "./CourseInfo/Course";
import {Section} from "./CourseInfo/Section";

import * as rp from 'request-promise';
import * as cheerio from 'cheerio';

type Session = 'W' | 'S';

function scrapeCourses(year: number, session: Session, maxSubjects: number | undefined) {
    let sessionAndYearAppend = "&sessyr=" + year + "&sesscd=" + session;

    // let ubcCourseURL = 'https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments';

    let ubcCourseURL: string = 'https://courses.students.ubc.ca/cs/courseschedule?sesscd=' + session + '&sessyr=' + year + '&pname=subjarea';

    let SubjectListMap:{[key:string]:Subject} = {};

    rp(ubcCourseURL)
        .then(function (html:string) {
            let SubjectList: Subject[] = [];

            let $ = cheerio.load(html);
            let mainTable = $('#mainTable');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);

            subjects.each(function(_idx: any, elem: CheerioElement) {
                let codeChild = $(elem).children().first();
                let code: string = codeChild.text();

                let link: string = $('a', codeChild).attr('href');
                // console.log(link);

                let titleChild = $(codeChild).next();
                let title: string = titleChild.text().trim();

                let facultyChild = $(titleChild).next();
                let faculty: string = facultyChild.text();

                let subject: Subject = new Subject(code, link, title, faculty);
                SubjectList.push(subject);
                SubjectListMap[code] = subject;

            });

            let promises: Promise<string>[] = [];

            if (maxSubjects !== undefined) {
                SubjectList = SubjectList.slice(SubjectList.length - maxSubjects);
            }

            for (let subject of SubjectList) {
                if (subject.link !== undefined && subject.link !== null) {
                    promises.push(rp('https://courses.students.ubc.ca' + subject.link + sessionAndYearAppend)
                    .catch(function (err: any) {
                        console.log(err);
                    }));
                }
            }

            console.log("Subjects: " + SubjectList.length);

            return promises;
        })
        .then((promises: Promise<string>[]) => Promise.all(promises))
        .then(function (promises: string[]) {
            let CourseList: Course[] = [];
            for (let promise of promises) {
                let $ = cheerio.load(promise);


                let mainTable = $('#mainTable');
                let tbody = $('tbody', mainTable);
                let subjects = $('tr', tbody);

                subjects.each(function(_idx: any, elem: CheerioElement) {

                    let course_tr = $(elem).toArray()[0];
                    let course_td_a = course_tr.children[0].children[0];
                    let course_td_a_href = course_td_a.attribs.href + sessionAndYearAppend;
                    let course_td_a_text = course_td_a.children[0].data;
                    let course_td_title = course_tr.children[1].children[0].data;

                    let course = new Course(course_td_a_text || "", course_td_title || "", course_td_a_href || "");
                    SubjectListMap[course.subject_code].courses[course.course_number] = course;
                    CourseList.push(course);
                });

            }

            let sectionPromises = []
            for (let course of CourseList) {
                sectionPromises.push(rp('https://courses.students.ubc.ca' + course.course_link));
            }

            console.log("Courses: " + CourseList.length);

            return sectionPromises;
        })
        .then((promises: rp.RequestPromise[]) => Promise.all(promises))
        .then(function (sectionPromises:string[]) {

            let SectionList:Section[] = [];

            for (let promise of sectionPromises) {
                let $ = cheerio.load(promise);

                let mainTable = $('table');
                let tbody = $('tbody', mainTable);
                let subjects = $('tr', tbody);

                let h4 = $('h4');
                let description = h4.next().text();

                let cdfText = $('#cdfText');
                let credits = cdfText.next().text();

                subjects.each(function(_idx: any, elem: CheerioElement) {
                    let curr_td = $(elem).children().first();

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

                    let start:string = curr_td.text();
                    curr_td = curr_td.next();

                    let end:string = curr_td.text();
                    curr_td = curr_td.next();

                    let comments: string = curr_td.text();
                    comments = comments.trim().replace("Section Comments", "").trim();

                    let section = new Section(status, curr_section, href, activity, term, interval, days, start, end, comments);

                    if (section.course_number !== undefined) {
                        let currCourse = SubjectListMap[section.subject_code].courses[section.course_number];
                        if (currCourse.credits === undefined) {
                            currCourse.credits = parseInt(credits) || 0;
                        }
                        if (currCourse.description === undefined) {
                            currCourse.description = description;
                        }
                        currCourse.sections[section.section_number] = section;
                        SectionList.push(section);
                    }
                });
            }
            let innerSectionPromises: rp.RequestPromise[] = []
            for (let section of SectionList) {
                innerSectionPromises.push(rp('https://courses.students.ubc.ca' + section.href));
            }

            console.log("Sections: " + SectionList.length);
            return innerSectionPromises;
        })
        .then((promises: rp.RequestPromise[]) => Promise.all(promises))
        .then(function (sectionPromises: string[]) {

            for (let promise of sectionPromises) {
                let $ = cheerio.load(promise);

                let section = $('.active')[0].children[0].data;

                let splitSectionOrNothing = (s: string | undefined) => {
                    if (s === undefined) {
                        return ["", "", ""];
                    }
                    return s.split(" ");
                };

                let [section_subject, section_course, section_section, ..._] = splitSectionOrNothing(section);

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
                let instructorTable = tables[2];
                let instructorBody = $('tbody', instructorTable);
                let instructorTrs = $('tr', instructorBody);

                const instructors = instructorTrs.map((_idx: any, elem: CheerioElement) => {
                    return $(elem).children().first().next().text();
                }).get();

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

                let sectionInfo = SubjectListMap[section_subject].courses[section_course].sections[section_section]

                sectionInfo.totalRemaining = parseInt(totalRemaining) || -1;
                sectionInfo.currentlyRegistered = parseInt(currrentlyRegistered) || -1;
                sectionInfo.generalRemaining = parseInt(generalRemaining) || -1;
                sectionInfo.restrictedRemaining = parseInt(restrictedRemaining) || -1;
            }
            console.log(SubjectListMap);

            return SubjectListMap;
        })
        .then(function (CoursesMap: object) {
            console.log("writing file");
            let destination = __dirname + '/../data/UBC-Courses-' + year + session + '.json'
            try {
                fs.mkdirSync(path.dirname(destination));
            } catch (e) {
                if (e.code !== 'EEXIST') {
                    throw e;
                }
            }
            fs.writeFileSync(destination, JSON.stringify(CoursesMap));
            console.log("written to file");
            console.log(fs.readFileSync(destination));
            // return;
        })
        .catch(function (err: any) {
            console.log(err);
        });
}

interface MyArguments {
    [x: string]: unknown;
    year: number;
    session: Session;
    maxSubjects: number | undefined;
}

const possibleSessions: ReadonlyArray<Session> = ['W', 'S'];

function main(argv: Array<string>) {
    const args: MyArguments =
        yargs.options({
            year: {
                type: 'number',
                describe: 'The year to scrape classes for',
            },
            session: {
                choices: possibleSessions,
                describe: 'Session for scraping',
            },
            maxSubjects: {
                type: 'number',
                describe: 'Only scrape this many subjects; good for testing',
            },
        })
        .demandOption(['year', 'session'])
        .parse(argv);
    scrapeCourses(args.year, args.session, args.maxSubjects);
}

main(process.argv);

