const path = require('path');

var ImageProcessor = require('./imageprocessor.js');

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    watch: true,
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [new ImageProcessor({ options: true })],
};