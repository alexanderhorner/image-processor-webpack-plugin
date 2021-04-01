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
            inputDir: "src/img",
            outputDir: "dist/imgoutput/",
            configurations: [
                {
                    fileNamePrefix: "123",
                    fileNameSuffix: "321",
                    directory: "TESTDIR_1",
                    sharpMethods: {
                        resize: [{ width: 100 }]
                    }
                },
                {
                    directory: "TESTDIR_2/TEST",
                    sharpMethods: {
                        resize: [{ height: 200 }],
                        rotate: [160]
                    }
                }
            ]
        })
    ],
};