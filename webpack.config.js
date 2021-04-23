const path = require('path');

var ImageProcessor = require('./imageprocessor/imageprocessor.js');

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    // watch: true,
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new ImageProcessor({
            inputDir: 'src/img/benchmark',
            outputDir: 'dist/img/benchmark',
            configurations: [
                // {
                //     directory: 'jpeg',
                //     sharpMethods: obj => 
                //         obj.resize({ width: 1080, height: 1080 })
                //             .jpeg({ quality: 50 })
                // },
                // {
                //     directory: 'webp',
                //     sharpMethods: obj => 
                //         obj.resize({ width: 1080, height: 1080 })
                //             .webp({ quality: 50 })
                // },
                // {
                //     directory: 'jpeg',
                //     fileNameSuffix: '-small',
                //     sharpMethods: obj => 
                //         obj.resize({ width: 265, height: 265 })
                //             .jpeg({ quality: 50 })
                // },
                {
                    directory: 'webp',
                    fileNameSuffix: '-small',
                    sharpMethods: obj => 
                        obj.resize({ width: 256, height: 256 })
                            .webp({ quality: 50 })
                },
            ]
        })
    ],
};