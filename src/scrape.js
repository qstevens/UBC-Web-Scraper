let http = require('http');
let https = require('https');

// http.globalAgent.maxSockets = 1;
// https.globalAgent.maxSockets = 1;

let Subject = require('./CourseInfo/Subject');
let Course = require('./CourseInfo/Course')
let SubjectScraper = require('./SubjectScraper');

let rp = require('request-promise');
let cheerio = require('cheerio');

let UBCCourses = 'https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments';

let SubjectListMap = {};
// let AllCourses = [];
// let SubjectCourseMap = {};

rp(UBCCourses)
    .then(function (html) {
        let SubjectList = [];

        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);
        
        subjects.each(function(i, elem) {
            // let codeChild = $(this).first();
            // let code = codeChild.text();

            // let subject_tr_children = $(this).toArray()[0].children;
            // let subject_a = subject_tr_children[0];
            // let subject_href = subject_a.children[0].attribs.href;
            // let subject_code = subject_a.children[0].children[0].data;

            // let subject_title = subject_tr_children[2]
            // let titleChild = $(codeChild).next();
            // let title = titleChild.text();

            // let facultyChild = $(titleChild).next();
            // let faculty = facultyChild.text();

            // let subject = new Subject(subject_code, subject_href, title, faculty);
            // SubjectList.push(subject);
            // SubjectListMap[subject_code] = subject;

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
    
        return SubjectList.slice(200);
    })
    .then(function (SubjectList) {
        // put rp(subjects) on promise array and promise.all the result
        // Promise.all(promises);
        let promises = [];
        for (let subject of SubjectList) {
            if (subject.link !== undefined && subject.link !== null) {
                // console.log(subject.link);
                promises.push(rp('https://courses.students.ubc.ca' + subject.link)
                .catch(function (err) {
                    console.log(err);
                }));
            }
        }

        return promises;
    })
    .then(promises => Promise.all(promises))
    .then(function (promises) {
        CourseList = [];
        // console.log(SubjectListMap);
        console.log(promises.length);
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
                SubjectListMap[course.subject_code].courses.push(course);
                CourseList.push(course);
            });

            // AllCourses.push(CourseList);
        }

        return CourseList;
    })
    .then(function (CourseList) {
        // console.log(SubjectListMap);
        console.log(CourseList);
    })
    .catch(function (err) {
        console.log(err);
    });
