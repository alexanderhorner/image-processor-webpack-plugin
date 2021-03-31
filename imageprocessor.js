const sharp = require('sharp')
const fs = require("fs");
const readdirp = require('readdirp');
const path = require('path');
const { callbackify } = require('util');


function resolveAfter2Seconds(x) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(x);
      }, 2000);
    });
}


class ImageProcessor {
    constructor(options) {

        const defaultOptions = {
            inputPath: '',
            outputPath: '',
            configurations: []
        }

        this.options = {...defaultOptions, ...options}
        this.firstRun = true
        this.inputPath = ''
        


        console.log(this.options);
    }

    apply(compiler) {

        compiler.hooks.emit.tapAsync('ImageProcessor', (compilation, callback) => {

            if (this.firstRun == true) {
                this.firstRun = false

                this.inputPath = path.join(compiler.context, this.options.inputPath)
                compilation.contextDependencies.add(this.inputPath);

                this.scanAllFiles(callback)

            }

            
            compilation.fileDependencies.add(this.inputPath + '/1test.txt');

            // Insert this list into the webpack build as a new file asset:
            compilation.assets['test.txt'] = {
                source: () => "test"
            };
      

        });

        compiler.hooks.watchRun.tap('WatchRun', (compilation) => {


            // Scan for changes and add files to queue

            if (compilation.modifiedFiles) {
                const changedFiles = Array.from(compilation.modifiedFiles, (file) => `\n  ${file}`).join('');
                console.log('===============================');
                console.log('FILES CHANGED:', changedFiles);
                console.log('===============================');
            }
        });
    
    }

    async scanAllFiles(callback) {
        console.log(this.inputPath);

        // for await (const entry of readdirp(this.inputPath)) {

        //     await resolveAfter2Seconds("hi")
            
        //     const {path} = entry;
        //     console.log(`${JSON.stringify({path})}`);
        // }

        readdirp(this.inputPath)
            .on('data', (entry) => {
                this.processImage(entry.path)
            })
            .on('end', () => {
                console.log('done')
                callback()
            });   
    }

    async processImage(pathToImage) {
        await resolveAfter2Seconds()
        console.log(pathToImage);
    }
}

module.exports = ImageProcessor;