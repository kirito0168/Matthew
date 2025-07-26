const fs = require('fs');
const path = require('path');

console.log('Current directory:', __dirname);
console.log('Project root:', path.join(__dirname, '..'));

// Check if public folder exists
const publicPath = path.join(__dirname, '../public');
console.log('\nChecking public folder at:', publicPath);
console.log('Public folder exists:', fs.existsSync(publicPath));

if (fs.existsSync(publicPath)) {
    console.log('\nContents of public folder:');
    fs.readdirSync(publicPath).forEach(file => {
        console.log(' -', file);
    });
    
    // Check CSS folder
    const cssPath = path.join(publicPath, 'css');
    if (fs.existsSync(cssPath)) {
        console.log('\nContents of public/css:');
        fs.readdirSync(cssPath).forEach(file => {
            console.log(' -', file);
        });
    } else {
        console.log('\nCSS folder not found!');
    }
    
    // Check JS folder
    const jsPath = path.join(publicPath, 'js');
    if (fs.existsSync(jsPath)) {
        console.log('\nContents of public/js:');
        fs.readdirSync(jsPath).forEach(file => {
            console.log(' -', file);
        });
    } else {
        console.log('\nJS folder not found!');
    }
} else {
    console.log('\nPublic folder not found! Please create it.');
}