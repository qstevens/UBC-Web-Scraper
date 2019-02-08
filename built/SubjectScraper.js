module.exports = function scrapeSubjects(error, response, html) {
    let subjectList = [];
    if (!error && response.statusCode == 200) {
        let $ = cheerio.load(html);
        let mainTable = $('#mainTable');
        let tbody = $('tbody', mainTable);
        let subjects = $('tr', tbody);
        subjects.each(function (i, elem) {
            let codeChild = $(this).first();
            let code = codeChild.text();
            let link = $('a', codeChild).attr('href');
            let titleChild = $(codeChild).next();
            let title = titleChild.text();
            let facultyChild = $(titleChild).next();
            let faculty = facultyChild.text();
            let subject = new Subject(code, link, title, faculty);
            subjectList.push(subject);
            // console.log(subjectList.length);
            // console.log(codeChild.text());
            // console.log(subject.link);
            // console.log(titleChild.text());
            // console.log(facultyChild.text());
        });
        // console.log(mainTable.text());
        // console.log(subjects.text());
    }
    // console.log(subjectList.length);
    return subjectList;
};
