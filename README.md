# UBC-Web-Scraper

Scrapes the UBC Courses website for information on all Subjects, Courses, and Sections.

Information is stored in a MongoDB collection.

## Development

This project is written in [TypeScript](http://typescript.org/) and uses
[Node.js](https://nodejs.org).

### Prerequisites

- node.js/npm

### Setup

First, install the dependencies locally:

```bash
npm install
```

Then, you can build the code:

```bash
npm run build
```

Tip: You can use `npm run build -- --watch` in a terminal window off to the side to
compile/check the code as you work. This *significantly* improves compile
performance.

## Running/Usage

```
Options:
  --help         Show help                                             [boolean]
  --version      Show version number                                   [boolean]
  --year         The year to scrape classes for              [number] [required]
  --session      Session for scraping             [required] [choices: "W", "S"]
  --maxSubjects  Only scrape this many subjects; good for testing
                                                           [number] [default: 2]
```

Example: grab the last two courses worth of 2019W data:

`npm run start --year 2019 --session W --max-subjects 2`
