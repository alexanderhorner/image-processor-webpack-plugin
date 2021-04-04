const sharp = require('sharp')
const fs = require('fs');
const readdirp = require('readdirp');
const path = require('path');


function resolveAfterXMilliseconds(x) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, x);
    });
}

var debugCounter = 0

class ImageProcessor {
    constructor(options) {

        const defaultOptions = {
            inputDir: '',
            outputDir: 'dist',
            configurations: []
        }

        this.options = {...defaultOptions, ...options}
        
        this.firstRun = true
        this.inputDir = this.options.inputDir
        this.outputDir = this.options.outputDir
        this.fullInputDir
        this.fullOutputDir
        this.compilerDotOutputPath

        this.compilation
    }

    apply(compiler) {

        compiler.hooks.emit.tapAsync('ImageProcessor', (compilation, callback) => {

            if (this.firstRun == true) {
                this.firstRun = false

                this.compilerDotOutputPath = compiler.outputPath

                // combine context and options input/ouputDir
                this.fullInputDir = path.join(compiler.context, this.options.inputDir)
                this.fullOutputDir = path.join(compiler.context, this.options.outputDir)

                // Add input directory to dependencies
                compilation.contextDependencies.add(this.fullInputDir);

                this.compilation = compilation

                this.queueAllFiles().then(() => callback())

            }

            // compilation.fileDependencies.add(this.fullInputDir + '/1test.txt');

            
      

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

    async queueAllFiles() {
        
        var promises = []

        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg']

        for await (const entry of readdirp(this.fullInputDir, {fileFilter: fileFilter})) {
            
            const imgPathInfo = {
                imgFullPath: entry.fullPath,
                imgDir: path.dirname(entry.path), // relative to the input directory
                imgFileName: path.parse(entry.path).name,
                imgFileExtension: path.extname(entry.path)
            }
            
            promises.push(this.queueAllConfigs(imgPathInfo))
        }

        await Promise.all(promises)
    }

    async queueAllConfigs(imgPathInfo) {

        var promises = []

        this.options.configurations.forEach(config => {

            const defaultConfig = {
                fileNamePrefix: '',
                fileNameSuffix: '',
                directory: '',
                sharpMethods: []
            }

            config = {...defaultConfig, ...config}

            promises.push(this.processConfig(imgPathInfo, config))
        })

        await Promise.all(promises)
    }

    async processConfig(imgPathInfo, config) {

        const { imgFullPath, imgDir, imgFileName, imgFileExtension } = imgPathInfo
        
        const sharpMethods = config.sharpMethods

        try {
            var sharpInstance = sharp(imgFullPath)
        } catch (error) {
            console.log(error);
            return
        }
        
        Object.keys(sharpMethods).forEach(methodName => {
            const args = sharpMethods[methodName]
            try {
                sharpInstance = sharpInstance[methodName](...args)
            } catch (error) {
                console.log(`"${methodName}" is not a valid sharp function!`);
                console.log(error);
            }
            
        });

        let finalImgRaw
        let finalImgformat

        try {
            finalImgRaw = await sharpInstance.toBuffer()

            // Read and set final output format
            const { format } = await sharp(finalImgRaw).metadata()
            finalImgformat = format

        } catch (error) {
            console.log(error);
            return
        }

        const fullOutputPath = path.join(this.fullOutputDir, config.directory, imgDir, config.fileNamePrefix + imgFileName + config.fileNameSuffix + '.' + finalImgformat);
        const outputPath = path.join(this.outputDir, config.directory, imgDir, config.fileNamePrefix + imgFileName + config.fileNameSuffix + '.' + finalImgformat);


        // if (!fs.existsSync(path.dirname(fullOutputPath))) {
        //     fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        // }

        const ouputPathRelativeToCompilerDotOutputPath = path.normalize(fullOutputPath).replace(this.compilerDotOutputPath, '')

        this.compilation.assets[ouputPathRelativeToCompilerDotOutputPath] = {
            source: () => finalImgRaw
        };
    }
}

module.exports = ImageProcessor;