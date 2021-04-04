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
            inputDir: 'src/img/benchmark',
            outputDir: 'dist/img/benchmark',
            configurations: [
                {
                    directory: 'jpeg',
                    sharpMethods: {
                        resize: [{ width: 1080, height: 1080 }],
                        jpeg: [{ quality: 50 }]
                    }
                },
                {
                    directory: 'webp',
                    sharpMethods: {
                        resize: [{ width: 1080, height: 1080 }],
                        webp: [{ quality: 50 }]
                    }
                },
                {
                    directory: 'jpeg',
                    suffix: '-small',
                    sharpMethods: {
                        resize: [{ width: 256, height: 256 }],
                        jpeg: [{ quality: 50 }]
                    }
                },
                {
                    directory: 'webp',
                    suffix: '-small',
                    sharpMethods: {
                        resize: [{ width: 256, height: 256 }],
                        webp: [{ quality: 50 }]
                    }
                },
            ]
        })
    ],
};