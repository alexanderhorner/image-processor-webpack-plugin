let waitXsec = (x) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve('')
        }, x*1000);
    })
}

// TODO: - fix output path: DONE
//       - add multithreading
//       - dont regenerate done images


// const { worker, isMainThread, parentPort, workerData } = require('worker_threads');

require('./processingWorker.js')

const sharp = require('sharp')
const fs = require('fs')
const readdirp = require('readdirp')
const path = require('path')
const cpus = require('os').cpus()
const { Sema } = require('async-sema')
const hashData = require('data-to-hash').default


const PROCESSOR_COUNT = cpus.length
const queue = new Sema(PROCESSOR_COUNT)

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
    inputContextDir: any;
    outputDir: any;
    outputContextDir: any;
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
                    this.inputContextDir = path.join(compiler.context, this.options.inputDir)
                    this.outputContextDir = path.join(compiler.context, this.options.outputDir)

                    // Add input directory to dependencies
                    compilation.contextDependencies.add(this.inputContextDir);
    
                    this.compilation = compilation

                    new ConfigQueuer().queueAllConfigs(this.inputContextDir, this.options.configurations).then(ConfigQueuer => {
                        Promise.all(ConfigQueuer.promises).then(results => {

                            let assetEmmitPromises: Promise<any>[] = []

                            console.timeEnd("ConfigProcessor")

                            console.time("assetEmit")

                            results.forEach((result: ConfigProcessor, index) => {
                                assetEmmitPromises.push(
                                    this.emmitAssetToAbsolutePath(
                                        path.join(this.outputContextDir, result.outputPath), 
                                        result.finalImgRaw
                                    )
                                )
                            })

                            Promise.all(assetEmmitPromises).then(data => {
                                console.timeEnd("assetEmit")
                                resolve('')
                            })
                            
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


    async emmitAssetToAbsolutePath(absolutePath: string, source) {

        await waitXsec(5)

        const ouputPathRelativeToCompilerOutputPath = path.relative(this.compilerOutputPath, absolutePath);

        this.compilation.assets[ouputPathRelativeToCompilerOutputPath] = {
            source: () => source
        };
    }
}


class ConfigQueuer {

    promises: Promise<any>[] = []

    async queueAllConfigs(inputContextDir: string, configurations: Configuration[]) {
        
        console.time("ConfigQuerer")

        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg']

        console.time('ConfigProcessor')

        for await (const entry of readdirp(inputContextDir, {fileFilter: fileFilter})) {
                        
            configurations.forEach(configurationUnclean => {

                const defaultConfig = {
                    fileNamePrefix: '',
                    fileNameSuffix: '',
                    directory: '',
                    sharpMethods: (obj) => obj
                }

                // let imgPath = 
    
                const configuration = {...defaultConfig, ...configurationUnclean}
                
                this.promises.push(
                    new ConfigProcessor(inputContextDir, entry.path, configuration).processImage()
                )

            })
        }

        console.timeEnd("ConfigQuerer")
        return this
    }
}

class ConfigProcessor {
    inputContextDir: string
    imgPath: string
    config: Configuration

    finalImgRaw: Uint8Array
    outputPath: string

    constructor(inputContextDir: string, imgPath: string, configuration: Configuration) {
        this.inputContextDir = inputContextDir
        this.imgPath = imgPath
        this.config = configuration
    }

    async processImage() {

        await queue.acquire()
        
        try {

            // Read Image
            var sharpInstance = sharp(
                path.join(this.inputContextDir, this.imgPath)
            )

            // apply methods
            sharpInstance = this.config.sharpMethods(sharpInstance)

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

        console.log(CONSOLE_COLOR_CRITICAL, "Computed " + this.imgPath);
        console.timeLog('ConfigProcessor')

        let imgName = [
            this.config.fileNamePrefix,
            path.parse(
                path.basename(this.imgPath)
            ).name,
            this.config.fileNameSuffix,
            '.' + finalImgformat
        ].join('')

        this.outputPath = path.join(
            this.config.directory,
            path.dirname(this.imgPath),
            imgName
        )

        queue.release()
        return this
    }
}

module.exports = ImageProcessorPlugin;
