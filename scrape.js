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
    .then(function (subjects) {
        // put rp(subjects) on promise array and promise.all the result

        // console.log(subjects.length);
    })
    .catch(function (err) {
        console.log(err);
    });