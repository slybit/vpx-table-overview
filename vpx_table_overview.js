let CFB = require('cfb');
const fs = require("fs");
const path = require('path')
const Mustache = require('mustache');

const TABLES_FOLDER = ".";
const OUTPUT_FILENAME = "output.html";

const PROGNAME = "VPX Table Overview v1.0\nby Pinblaze - September 2028";


const getRowColor = (main) => {
    if (main >= 80) return 'table-success';
    if (main >= 70) return 'table-primary';
    return 'table-warning';
}


const listVPXTableFiles = () => {
    const fileList = fs.readdirSync(TABLES_FOLDER);
    const tables = [];
    fileList.forEach((filename) => {
        const fullPath = path.join(TABLES_FOLDER, filename);
        if (filename.toLowerCase().endsWith('.vpx') && !fs.statSync(fullPath).isDirectory()) {
            tables.push(filename);
        }
    });
    return tables;
}

const getVPXTableDetails = (filename) => {

    const fullPath = path.join(TABLES_FOLDER, filename);

    console.log('Getting details for %s', filename);

    const details = {
        fileName: filename
    };


    let cfb = CFB.read(fullPath, { type: 'file' });

    //console.log(cfb);

    let vpxVersion = CFB.find(cfb, 'Root Entry/GameStg/Version');
    if (vpxVersion && vpxVersion.size > 0) {
        const v = vpxVersion.content.readInt32LE(0);
        details.vpxVersion = {
            main: (v - (v % 100)) / 100,
            sub:  v % 100,
            class: getRowColor(v % 100)
        };
    }

    let tableName = CFB.find(cfb, 'Root Entry/TableInfo/TableName');
    if (tableName && tableName.size > 0) {
        details.tableName = tableName.content.toString('utf8');
    }

    if (!details.tableName) details.tableName = filename.substring(0, filename.length - 4);

    let tableVersion = CFB.find(cfb, 'Root Entry/TableInfo/TableVersion');
    if (tableVersion && tableVersion.size > 0) {
        details.tableVersion = tableVersion.content.toString('utf8');
    }

    let tableSaveDate = CFB.find(cfb, 'Root Entry/TableInfo/TableSaveDate');
    if (tableSaveDate && tableSaveDate.size > 0) {
        details.tableSaveDate = tableSaveDate.content.toString('utf8');
    }

    if (!details.tableSaveDate) {
        tableSaveDate = CFB.find(cfb, 'Root Entry/TableInfo/ReleaseDate');
        if (tableSaveDate && tableSaveDate.size > 0) {
            details.tableSaveDate = tableSaveDate.content.toString('utf8');
        }
    }

    details.tableFileCreateDate = fs.statSync(fullPath).birthtime.toISOString();

    return details;

}

console.log(PROGNAME);
console.log();
console.log('Started scan');

const data = [];
const tableFileNames = listVPXTableFiles();

tableFileNames.forEach((f) => {
    data.push(getVPXTableDetails(f));
})

let template = fs.readFileSync("template.html", "utf-8");
const output = Mustache.render(template, { data, reportDate: (new Date()).toISOString() });

console.log('Scan finished. Output written to `%s`', OUTPUT_FILENAME);

try {
    fs.writeFileSync(OUTPUT_FILENAME, output);
    // file written successfully
} catch (err) {
    console.error(err);
}
