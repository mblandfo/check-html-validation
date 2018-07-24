const _ = require('lodash');
const fs = require('fs');
const validator = require('html-validator');
var path = require("path");

function getFilesRecursive(dir, extension) {
    if (dir.endsWith('/')) {
        dir = dir.substr(0, dir.length - 1);
    }
    let results = [];
    let list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        let stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(getFilesRecursive(file, extension));
        } else if(!extension || hasExtension(file, extension)) { 
            results.push(file);
        }
    });
    return results;
}

function getRelativePath(dir, fullPath) {
    let fullDirPath = path.resolve(dir);
    if (_.startsWith(fullPath, fullDirPath)) {
        return fullPath.substr(fullDirPath.length);
    }
    return fullPath;
}

let reset = '\x1b[0m';
let foregroundRed = '\x1b[31m';
let foregroundYellow = '\x1b[33m';
let foregroundCyan = '\x1b[36m';

function writeRed(text) {    
    process.stdout.write(`${foregroundRed}${text}${reset}`);
}

function writeYellow(text) {    
    process.stdout.write(`${foregroundYellow}${text}${reset}`);
}

function writeCyan(text) {    
    process.stdout.write(`${foregroundCyan}${text}${reset}`);
}

function hasExtension(filePath, extension) {
    let idx = filePath.lastIndexOf('.');
    let ext = '';
    if (idx >= 0) {
        ext = filePath.substr(idx + 1);
    }
    return ext === extension;
}

function getFileName(fullPath, removeExtension = true) {
    let idx = Math.max(_.lastIndexOf(fullPath, '/'), _.lastIndexOf(fullPath, '\\'));
    let fileName;
    if (idx >= 0 && idx + 1 < fullPath.length) {
        fileName = fullPath.substr(idx + 1);
    } else {
        fileName = fullPath;
    }
    if (removeExtension) {
        return stripExtension(fileName);
    }
    return fileName;
}

function stripExtension(path) {
    let idx = _.lastIndexOf(path, '.');
    if (idx < 0) {
        return path;
    }
    return path.substr(0, idx);
}

function validateFiles(filesToValidate) {
    let data = { results: [] };
    
    return Promise.all(_.map(filesToValidate, f => {
        return validateFile(f, data);
    })).then(() => {        
        return data;
    });
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf-8')
}

function validateFile(htmlFilePath, data) {
    let fileName = getFileName(htmlFilePath);
    let fileContents = readFile(htmlFilePath);
    let shouldWrap = fileContents.indexOf('<html') < 0;
    let htmlToValidate = shouldWrap ? wrapInHtmlTemplate(fileContents) : fileContents;
    return validator({
        data: htmlToValidate,
        format: 'json' // result format
    }).then((result) => {
        if (shouldWrap) {
            _.each(result.messages, m => {
                if (m.firstLine) {
                    m.firstLine -= 7;
                }
                if (m.lastLine) {
                    m.lastLine -= 7;
                }
            });
        }
        data.results.push({ messages: result.messages, fileName, filePath: htmlFilePath });
    }).catch((error) => {
        data.results.push({ messages: [], parseError: error, fileName, filePath: htmlFilePath });
    });
}

function wrapInHtmlTemplate(html) {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">    
    <title>Html Template for Validation</title>
</head>
<body>    
${html}
</body>
</html>`;
}

function checkHtml(userOptions) {
    
    let filesToValidate = [];
    
    let options = {
        logResults: true,
        failOnError: false,
        files: [],
        dir: '',
        suppressRegex: []
    };

    if (typeof userOptions === 'string') {
        if (fs.lstatSync(userOptions).isDirectory()) {
            options.dir = userOptions;
        } else {
            options.files.push(userOptions);
        }
    } else {        
        _.assign(options, userOptions);
    }

    if (options.dir) {
        filesToValidate = filesToValidate.concat(getFilesRecursive(options.dir, 'html'));
    }
    filesToValidate = _.uniq(_.map(filesToValidate.concat(options.files)), f => path.resolve(f));

    return validateFiles(filesToValidate).then((data) => {

        data.results = _.sortBy(data.results, f => f.filePath);
        if (!_.isEmpty(options.suppressRegex)) {
            _.each(data.results, result => {
                result.messages = _.filter(result.messages, m => {
                    return !_.some(options.suppressRegex, reg => {
                        return reg.test(m.message);
                    });
                });
            });
        }

        let allMessages = _.flatMap(data.results, r => r.messages);
        data.numErrors = _.filter(allMessages, m => m.type === 'error').length;

        if (options.logResults) {
            logResults(data, options);
        }        

        if (options.failOnError && data.numErrors > 0) {
            throw new Error('Html errors found');
        }
            
        return data;
    });
}

function logResults(data, options) {
    // { messages: Message[], parseError: Error, filePath: string, fileName: string }
    
    _.each(data.results, r => {
        if (r.messages.length === 0) {
            return;
        }
        console.log('');
        writeCyan(getRelativePath(options.dir, r.filePath) + '\n\n');
        _.each(r.messages, m => {
            if (m.type === 'error') {
                writeRed('Error');
            } else {
                writeYellow('Warning');
            }
            let lineNum = m.firstLine || m.lastLine;
            console.log(` on line ${lineNum}: ${m.message}`);
        });
    });

    console.log(`\n${data.numErrors} html errors found\n`);
}
   
module.exports = checkHtml;
