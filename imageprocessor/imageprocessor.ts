const { worker, isMainThread, parentPort, workerData } = require('worker_threads');

require('./processingWorker.js')

const sharp = require('sharp')
const fs = require('fs')
const readdirp = require('readdirp')
const path = require('path')
const cpus = require('os').cpus()
const { Sema } = require('async-sema')
const hashData = require('data-to-hash').default


const PROCESSOR_COUNT = cpus.length
const queue = new Sema(PROCESSOR_COUNT) // TODO: ADD queue functionity again

const CONSOLE_COLOR_WARNING = '\x1b[33m%s\x1b[0m'
const CONSOLE_COLOR_CRITICAL = '\x1b[41m%s\x1b[0m'


interface Options {
    inputDir: string
    outputDir: string
    configurations: Configuration[]
}

interface Configuration {
    directory: string
    fileNamePrefix: string
    fileNameSuffix: string
    sharpMethods: Function
}

class ImageProcessorPlugin {
    firstRun: boolean = true;
    options: Options
    compilerOutputPath: string


    inputDir: any;
    fullInputDir: any;
    outputDir: any;
    fullOutputDir: any;
    compilation: any;
    manifest: object;

    
    constructor(optionsUnclean: object) {

        const defaultOptions: Options = {
            inputDir: '',
            outputDir: 'dist',
            configurations: []
        }

        this.options = {...defaultOptions, ...optionsUnclean}
    }

    apply(compiler) {

        compiler.hooks.emit.tapPromise('ImageProcessor', (compilation) => {
            
            return new Promise((resolve, reject) => {

                if (this.firstRun == true) {
                    
                    this.firstRun = false
    
                    this.compilerOutputPath = compiler.outputPath
    
                    // combine context and options input/ouputDir
                    // EXAMPLE: compiler.context: '/Users/alexanderhorner/Documents/GitHub/image-processor-webpack-plugin'
                    // EXAMPLE: this.options.inputDir: 'src/img/benchmark'
                    this.fullInputDir = path.join(compiler.context, this.options.inputDir)
                    this.fullOutputDir = path.join(compiler.context, this.options.outputDir)
    
                    // Add input directory to dependencies
                    compilation.contextDependencies.add(this.fullInputDir);
    
                    this.compilation = compilation

                    new ConfigQueuer(this.options.configurations, this.fullInputDir).queueAllConfigs().then((configPromises) => {
                        Promise.all(configPromises).then(() => {
                            resolve('')
                        }).catch((error) => {
                            console.log(error)
                            reject(error)
                        })
                    })

                    // promises.forEach(promise => {
                    //     promise.then((val) => {
                    //         const { finalImgRaw, outputPathFull } = val
                    //         this.emmitAssetToAbsolutePath(outputPathFull, finalImgRaw)
                    //         queue.release();
                    //     })
                    // });

                } else {
                    reject('[ImageProcessorPlugin] Not first run!')
                }
            })
        });

        compiler.hooks.watchRun.tap('WatchRun', (compilation) => {
            if (compilation.modifiedFiles) {
                const changedFiles = Array.from(compilation.modifiedFiles, (file) => `\n  ${file}`).join('');
                console.log('===============================');
                console.log('FILES CHANGED:', changedFiles);
                console.log('===============================');
            }
        });
    
    }


    emmitAssetToAbsolutePath(absolutePath: string, source) {
        const ouputPathRelativeToCompilerOutputPath = path.relative(this.compilerOutputPath, absolutePath);

        this.compilation.assets[ouputPathRelativeToCompilerOutputPath] = {
            source: () => source
        };
    }
}


class ConfigQueuer {
    configurations: Configuration[];
    fullInputDir: string;


    constructor(configurations: Configuration[], fullInputDir: string) {
        this.configurations = configurations
        this.fullInputDir = fullInputDir
    }

    async queueAllConfigs() {
        
        let promises: Promise<any>[] = []

        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg']

        for await (const entry of readdirp(this.fullInputDir, {fileFilter: fileFilter})) {
            
            const imgPathInfo = {
                imgFullPath: entry.fullPath,
                imgDir: path.dirname(entry.path), // relative to the input directory
                imgFileName: path.parse(entry.path).name,
                imgFileExtension: path.extname(entry.path)
            }
            
            this.configurations.forEach(configurationUnclean => {

                const defaultConfig = {
                    fileNamePrefix: '',
                    fileNameSuffix: '',
                    directory: '',
                    sharpMethods: (obj) => obj
                }
    
                const configuration = {...defaultConfig, ...configurationUnclean}
    
                promises.push(
                    new ImageProcessor(imgPathInfo.imgFullPath, '', configuration.sharpMethods).processImage()
                )
            })
        }

        return promises
    }
}

class ImageProcessor {
    inputPathFull: string
    sharpMethods: Function

    finalImgRaw: any
    outputPathFull: string

    constructor(inputPathFull: string, outputPathFull: string, sharpMethods: Function) {
        this.inputPathFull = inputPathFull
        this.outputPathFull = outputPathFull
        this.sharpMethods = sharpMethods
    }

    async processImage() {

        await queue.acquire()
        
        try {
            var sharpInstance = sharp(this.inputPathFull) // Read Image
            sharpInstance = this.sharpMethods(sharpInstance) // apply methods
        } catch (error) {
            console.log(CONSOLE_COLOR_WARNING, error);
        }

        let finalImgformat

        try {
            this.finalImgRaw = await sharpInstance.toBuffer()

            // Read and set final output format
            const { format } = await sharp(this.finalImgRaw).metadata()
            finalImgformat = format

        } catch (error) {
            console.log(CONSOLE_COLOR_CRITICAL, error);
            return
        }

        console.log("Computed " + path.basename(this.inputPathFull));
        

        // this.outputPathFull = path.join(this.fullOutputDir, config.directory, imgDir, config.fileNamePrefix + imgFileName + config.fileNameSuffix + '.' + finalImgformat)

        queue.release()
        return this
    }
}

module.exports = ImageProcessorPlugin;
