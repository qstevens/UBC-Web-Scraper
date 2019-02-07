let http = require('http');
let https = require('https');

// http.globalAgent.maxSockets = 1;
// https.globalAgent.maxSockets = 1;

let Subject = require('./CourseInfo/Subject');
let SubjectScraper = require('./SubjectScraper');

let rp = require('request-promise');
let cheerio = require('cheerio');

let UBCCourses = 'https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&tname=subj-all-departments';

rp(UBCCourses)
    .then(function (html) {
        SubjectList = [];

        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);
        
        subjects.each(function(i, elem) {
            let codeChild = $(this).first();
            let code = codeChild.text();

            let link = $('a', codeChild).attr('href');

            let titleChild = $(codeChild).next();
            let title = titleChild.text();

            let facultyChild = $(titleChild).next();
            let faculty = facultyChild.text();

            let subject = new Subject(code, link, title, faculty);
            SubjectList.push(subject);
        });
    
        return SubjectList;
    })
    .then(function (SubjectList) {
        // put rp(subjects) on promise array and promise.all the result
        // Promise.all(promises);
        let promises = [];
        for (let subject of SubjectList) {
            if (subject.link !== undefined && subject.link !== null) {
                console.log(subject.link);
                promises.push(rp('https://courses.students.ubc.ca' + subject.link)
                .catch(function (err) {
                    console.log(err);
                }));
            }
        }

        // promises.push(rp('https://courses.students.ubc.ca' + SubjectList[0].link));

        return promises.slice(promises.length / 2);

        // console.log(subjects.length);
    })
    .then(promises => Promise.all(promises))
    .then(function (promises) {
        let AllCourses = [];
        console.log('hello');
        for (let promise of promises) {
            let $ = cheerio.load(promise);
            let h5 = $('h5');
            console.log(h5.text());

            CourseList = [];

            let mainTable = $('#mainTable');
            let tbody = $('tbody', mainTable);
            let subjects = $('tr', tbody);
            
            subjects.each(function(i, elem) {
                let codeChild = $(this).first();
                let code = codeChild.text();
    
                let link = $('a', codeChild).attr('href');
    
                let titleChild = $(codeChild).next();
                let title = titleChild.text();
                console.log(title);
    
                let facultyChild = $(titleChild).next();
                let faculty = facultyChild.text();
                console.log(faculty);
    
                let subject = new Subject(code, link, title, faculty);
                CourseList.push(subject);
            });

            AllCourses.push(CourseList);
        }

        return AllCourses;
    })
    .catch(function (err) {
        console.log(err);
    });