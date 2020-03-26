//import fs(file-system) package. Core
const fs = require('fs');

//import path package. Core
const path = require('path');

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}

exports.clearImage = clearImage