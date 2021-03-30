const sharp = require('sharp')
const fs = require("fs");
const readdirp = require('readdirp');
const path = require('path');
const { callbackify } = require('util');

class ImageProcessor {
    apply(compiler) {

        compiler.hooks.emit.tapAsync('ImageProcessor', (compilation, callback) => {

            // If not watch run, add all files to queue
            // process queue

            const dependency = path.join(compiler.context, 'src/img')
            compilation.contextDependencies.add(dependency);
            compilation.fileDependencies.add(dependency + '/1test.txt');

            // Insert this list into the webpack build as a new file asset:
            compilation.assets['test.txt'] = {
                source: () => "test"
            };
      
            callback();
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
}

module.exports = ImageProcessor;