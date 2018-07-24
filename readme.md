
# Notes: 
check-html uses a **WEB SERVICE**,  validator.w3.org/nu (since this uses https://www.npmjs.com/package/html-validator)
This also means that check-html will return async as a promise.
This seems to return much better results than grunt-htmllint (no webservice)
So consider that when deciding whether to add this to an automated build.

# Options
- logResults defaults to true (and prints pretty errors!)
- suppressRegex is an array of regex. any errors or warnings that match will be suppressed
- dir - directory to find html files recursive
- files - html files to validate

# Usage

```
var checkHtml = require('check-html');

checkHtml(dirPath);
checkHtml(filePath);
checkHtml({ files: someFiles, dir: someDir, logResults: false).then((data) => {
    // do something with data
});

checkHtml({
    dir: someDir,
    suppressRegex: [
        /The value of the “for” attribute of the “label” element must be the ID/,
        /Empty heading/,
        /Element “li” not allowed as child of element “body” in this context/
    ]
});

// data: { results: Result[] }
// Result: { messages: Message[], parseError: Error, filePath: string, fileName: string }
// Message: { "type": "error" | "warning",
//    "lastLine": number,
//    "firstLine": number,
//    "lastColumn": number,
//    "firstColumn": number,
//    "message": string,
//    "extract": string,
//    "hiliteStart": number,
//    "hiliteLength": number
// }

# Using with Grunt

grunt.registerTask('checkHtml', () => {
    let done = this.async();
    checkHtml({
        dir: someDir,
        suppressRegex: [
            /The value of the “for” attribute of the “label” element must be the ID/,
            /Empty heading/,
            /Element “li” not allowed as child of element “body” in this context/
        ]
    }).then(() => {
        done();
    });
});

```