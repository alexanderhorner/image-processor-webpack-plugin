const path = require('path');

var ImageProcessor = require('./imageprocessor.js');
// const FileListPlugin = require('./filelistplugin')

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    watch: true,
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new ImageProcessor({
            inputDir: 'src/img',
            outputDir: 'dist/imgoutput/',
            configurations: [
                {
                    fileNameSuffix: '_W1100Q50',
                    directory: '',
                    sharpMethods: {
                        resize: [{ width: 1100 }],
                    }
                }
            ]
        })
    ],
};