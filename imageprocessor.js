const sharp = require('sharp')
const fs = require("fs");
const readdirp = require('readdirp');
const path = require('path');


function resolveAfterXMilliseconds(x) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, x);
    });
}


class ImageProcessor {
    constructor(options) {

        const defaultOptions = {
            inputDir: '',
            outputDir: '',
            configurations: []
        }

        this.options = {...defaultOptions, ...options}
        
        this.firstRun = true
        this.finalInputDir = ''
        this.finalOutputDir = ''
        
        console.log(this.options);
    }

    apply(compiler) {

        compiler.hooks.emit.tapAsync('ImageProcessor', (compilation, callback) => {

            if (this.firstRun == true) {
                this.firstRun = false

                // combine context and options input/ouputDir
                this.finalInputDir = path.join(compiler.context, this.options.inputDir)
                this.finalOutputDir = path.join(compiler.context, this.options.outputDir)

                // Add input directory to dependencies
                compilation.contextDependencies.add(this.finalInputDir);

                this.scanAllFilesAndProccessThem().then(() => callback())

            }

            // compilation.fileDependencies.add(this.finalInputDir + '/1test.txt');

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

    async scanAllFilesAndProccessThem() {
        var promises = []

        for await (const entry of readdirp(this.finalInputDir)) {
            promises.push(this.processImage(entry.path))
        }

        await Promise.all(promises)
    }

    async processImage(pathToImage) {
        await resolveAfterXMilliseconds(500)

        this.options.configurations.forEach(config => {
                
            const defaultConfig = {
                fileNamePrefix: "",
                fileNameSuffix: "",
                directory: "",
                sharpMethods: []
            }

            config = {...defaultConfig, ...config}

            const sharpMethods = config.sharpMethods

            var $sharp = sharp(pathToImage)

            Object.keys(sharpMethods).forEach(methodName => {
                const args = sharpMethods[methodName]
                $sharp = $sharp[methodName](...args)
            });
            
            const finalOutputPath = path.join(this.finalOutputDir, config.directory, config.fileNamePrefix + filename + config.fileNameSuffix + fileExtension);

            if (!fs.existsSync(path.dirname(finalOutputPath))) {
                fs.mkdirSync(path.dirname(finalOutputPath), {recursive: true});
            }

            $sharp.toFile(finalOutputPath)

        })
    }
}

module.exports = ImageProcessor;