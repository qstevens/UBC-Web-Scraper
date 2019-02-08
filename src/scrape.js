let http = require('http');
let https = require('https');

https.globalAgent.maxSockets = 50;
http.globalAgent.maxSockets = 50;

console.log (https.globalAgent.maxSockets);

let Subject = require('./CourseInfo/Subject');
let Course = require('./CourseInfo/Course')
let Section = require('./CourseInfo/Section')
let SubjectScraper = require('./SubjectScraper');

let rp = require('request-promise');
let cheerio = require('cheerio');

let UBCCourses = 'https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments';

let SubjectListMap = {};

rp(UBCCourses)
    .then(function (html) {
        let SubjectList = [];

        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);
        
        subjects.each(function(i, elem) {
            let codeChild = $(this).children().first();
            let code = codeChild.text();
            // console.log(code);

            let link = $('a', codeChild).attr('href');
            // console.log(link);

            let titleChild = $(codeChild).next();
            let title = titleChild.text();
            // console.log(title);

            let facultyChild = $(titleChild).next();
            let faculty = facultyChild.text();
            // console.log(faculty);

            let subject = new Subject(code, link, title, faculty);
            SubjectList.push(subject);
            SubjectListMap[code] = subject;

        });

        let promises = [];
        // for (let subject of SubjectList.slice(SubjectList.length / 2, SubjectList.length / 2 + 10)) {
        for (let subject of SubjectList) {
            if (subject.link !== undefined && subject.link !== null) {
                // console.log(subject.link);
                promises.push(rp('https://courses.students.ubc.ca' + subject.link)
                .catch(function (err) {
                    console.log(err);
                }));
            }
        }

        console.log(SubjectList.length);

        return promises;
    })
    .then(promises => Promise.all(promises))
    .then(function (promises) {
        CourseList = [];
        // console.log(SubjectListMap);
        // console.log(promises.length);
        for (let promise of promises) {
            let $ = cheerio.load(promise);


            let mainTable = $('#mainTable');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);
            
            subjects.each(function(i, elem) {

                let course_tr = $(this).toArray()[0];
                let course_td_a = course_tr.children[0].children[0];
                let course_td_a_href = course_td_a.attribs.href;
                let course_td_a_text = course_td_a.children[0].data;
                let course_td_title = course_tr.children[1].children[0].data;

                let course = new Course(course_td_a_text, course_td_title, course_td_a_href);
                // console.log(SubjectListMap[course.subject_code]);
                SubjectListMap[course.subject_code].courses[course.course_number] = course;
                // console.log(SubjectListMap[course.subject_code]);
                CourseList.push(course);
            });
            // console.log(SubjectListMap['GERM']);

            // console.log(SubjectListMap);
        }

        let sectionPromises = []
        // for (let course of CourseList.slice(CourseList.length / 2, CourseList.length / 2 + 10)) {
        for (let course of CourseList) {
            sectionPromises.push(rp('https://courses.students.ubc.ca' + course.course_link));
        }

        console.log(CourseList.length);

        return sectionPromises;
    })
    .then(promises => Promise.all(promises))
    .then(function (sectionPromises) {
        // console.log(SubjectListMap);
        // console.log(CourseList);
        let SectionList = [];

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

            let mainTable = $('table');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);

            let h4 = $('h4');
            let description = h4.next().text();

            let cdfText = $('#cdfText');
            let credits = cdfText.next().text();
            // console.log(course_description.text());

            subjects.each(function(i, elem) {
                let curr_td = $(this).children().first();

                let status = curr_td.text();
                curr_td = curr_td.next();

                let curr_section = curr_td.text();
                let href = $('a', curr_td).attr('href');
                curr_td = curr_td.next();

                let activity = curr_td.text();
                curr_td = curr_td.next();

                let term = curr_td.text();
                curr_td = curr_td.next();

                let interval = curr_td.text();
                curr_td = curr_td.next();

                let days = curr_td.text();
                curr_td = curr_td.next();

                let start = curr_td.text();
                curr_td = curr_td.next();

                let end = curr_td.text();
                curr_td = curr_td.next();

                let comments = curr_td.text();

                let section = new Section(status, curr_section, href, activity, term, interval, days, start, end, comments);
                // console.log(section.subject_code);
                // console.log(section.course_number);
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
                    
                    // console.log(currCourse);
                }
            });
        }
        let innerSectionPromises = []
        // for (let section of SectionList.slice(SectionList.length / 2, SectionList.length / 2 + 10)) {
        for (let section of SectionList) {
            innerSectionPromises.push(rp('https://courses.students.ubc.ca' + section.href));
        }

        console.log(SectionList.length);
        return innerSectionPromises;
        // console.log(SubjectListMap['GERM']);
    })
    .then(promises => Promise.all(promises))
    .then(function (sectionPromises) {

        for (let promise of sectionPromises) {
            let $ = cheerio.load(promise);

            // Obtain Subject, Course, and Section codes from page

            let section = $('.active')[0].children[0].data;
            // console.log(section);
            let section_subject = section.split(" ")[0];
            let section_course = section.split(" ")[1];
            let section_section = section.split(" ")[2];

            // Get Tables on Page (should contain a sectionTable, instructorTable, seatTable, bookTable)
            let tables = $('table');
            // console.log(mainTable);

            // Add Building and Room details to Section
            let sectionTable = tables[1];
            // console.log(instructor_table);
            let sectionBody = $('tbody', sectionTable);
            let section_td = $('td', sectionBody);

            let section_building = section_td.first().next().next().next().next().text();
            let section_room = section_td.first().next().next().next().next().next().text();

            SubjectListMap[section_subject].courses[section_course].sections[section_section].building = section_building;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].room = section_room;
            // console.log(section_building);
            // console.log(section_room);

            // Add instructors to Section
            let instructors = [];
            let instructorTable = tables[2];
            let instructorBody = $('tbody', instructorTable);
            let instructorTrs = $('tr', instructorBody);
            // console.log(instructorTrs);

            instructorTrs.each(function() {
                instructors.push($(this).children().first().next().text());
                // console.log($(this).children().first().next().text());
            });

            // console.log(section);
            // console.log(instructors);
            SubjectListMap[section_subject].courses[section_course].sections[section_section].instructors = instructors;

            // Add Seat Summary to Section
            let seatTable = tables[3];
            let seatBody = $('tbody', seatTable);
            // console.log(seatBody);
            let currSeat = $('tr', seatBody).first();
            let totalRemaining = $('td', currSeat).first().next().text();
            // console.log(totalRemaining);
            currSeat = currSeat.next();
            let currrentlyRegistered = $('td', currSeat).first().next().text();
            currSeat = currSeat.next();
            let generalRemaining = $('td', currSeat).first().next().text();
            currSeat = currSeat.next();
            let restrictedRemaining = $('td', currSeat).first().next().text();
            // console.log(totalRemaining);
            // console.log(currrentlyRegistered);
            // console.log(generalRemaining);
            // console.log(restrictedRemaining);
            SubjectListMap[section_subject].courses[section_course].sections[section_section].totalRemaining = totalRemaining;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].currentlyRegistered = currrentlyRegistered;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].generalRemaining = generalRemaining;
            SubjectListMap[section_subject].courses[section_course].sections[section_section].restrictedRemaining = restrictedRemaining;
            // break;

        }
        console.log(SubjectListMap);

        return;
    })
    .catch(function (err) {
        console.log(err);
    });
