const sharp = require('sharp')
const fs = require("fs");
const readdirp = require('readdirp');
const path = require('path');

var changedFile = [];

class ImageProcessor {
    apply(compiler) {
        // compiler.hooks.emit.tapPromise('ImageProcessor', (compilation) => {
        //     // return a Promise that resolves when we are done...
        //     return new Promise((resolve, reject) => {
        //         setTimeout(function () {

        //             const dependency = path.join(compiler.context, 'src/img')
        //             compilation.contextDependencies.add(dependency);
        //             compilation.fileDependencies.add(dependency + '/1test.txt');

                    

        //             ImageProcessor.compileFile(compilation)

        //             console.log('\x1b[41m', '\x1b[30m', 'Done with async work...', '\x1b[0m')
        //             resolve()
        //         }, 50);
        //     });
        // });

        compiler.hooks.emit.tapAsync('FileListPlugin', (compilation, callback) => {
            
            const source = "test"

            // Insert this list into the webpack build as a new file asset:
            compilation.assets['test.png'] = {
              source: function () {
                return source
              },
              size: function () {
                return source.length
              },
            };

            // compilation.hooks.processAssets.tapPromise(
            //     {
            //       name: 'plugin-name',
            //       // https://github.com/webpack/webpack/blob/master/lib/Compilation.js#L3280
            //       stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
            //     },
            //     () => { 
            //       compilation.emitAsset('test.js', new sources.RawSource(data))
            //     }
            // );
      
            callback();
        });

        compiler.hooks.watchRun.tap('WatchRun', (comp) => {
            if (comp.modifiedFiles) {
                const changedFiles = Array.from(comp.modifiedFiles, (file) => `\n  ${file}`).join('');
                console.log('===============================');
                console.log('FILES CHANGED:', changedFiles);
                console.log('===============================');
            }
        });
    }

    static compileFile(compilation) {
    
    }
}

module.exports = ImageProcessor;