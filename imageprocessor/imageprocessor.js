// TODO: - fix output path: DONE
//       - add multithreading
//       - dont regenerate done images !!!
//       - watch Capability !
//       - make input directory config based
// const { worker, isMainThread, parentPort, workerData } = require('worker_threads');
// require('./processingWorker.js')
const sharp = require('sharp');
const readdirp = require('readdirp');
const path = require('path');
const cpus = require('os').cpus();
const { Sema } = require('async-sema');
// const hashData = require('data-to-hash').default
const crypt = require('crypto');
const PLUGIN_NAME = "ImageProcessor";
const PROCESSOR_COUNT = cpus.length;
const queue = new Sema(Math.max(2, PROCESSOR_COUNT));
const CONSOLE_COLOR_WARNING = '\x1b[33m%s\x1b[0m';
const CONSOLE_COLOR_CRITICAL = '\x1b[41m%s\x1b[0m';
// const CONSOLE_COLOR_SUCCESS = '\x1b[30m\x1b[42m%s\x1b[0m'
const CONSOLE_COLOR_SUCCESS = '\x1b[32m%s\x1b[0m';
// var t1
// var t2
const fs = require('fs');
class ImageProcessorPlugin {
    constructor(optionsUnclean) {
        this.firstRun = true;
        const defaultOptions = {
            inputDir: '',
            outputDir: 'dist',
            configurations: []
        };
        this.options = { ...defaultOptions, ...optionsUnclean };
    }
    apply(compiler) {
        compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
            this.firstRun = false;
            this.compilerOutputPath = compiler.outputPath;
            // combine context and options input/ouputDir
            // EXAMPLE: compiler.context: '/Users/alexanderhorner/Documents/GitHub/image-processor-webpack-plugin'
            // EXAMPLE: this.options.inputDir: 'src/img/benchmark'
            this.inputContextDir = path.join(compiler.context, this.options.inputDir);
            this.outputContextDir = path.join(compiler.context, this.options.outputDir);
            // Add input directory to dependencies
            compilation.contextDependencies.add(this.inputContextDir);
            compilation.hooks.processAssets.tapAsync({
                name: PLUGIN_NAME,
                stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                additionalAssets: true,
            }, (assets, callback) => {
                this.processImages(compiler, compilation, assets).then(val => {
                    callback();
                });
            });
        });
    }
    async processImages(compiler, compilation, assets) {
        const { RawSource } = compiler.webpack.sources;
        var configQueuer = await new ConfigQueuer(this.inputContextDir, this.options.configurations).queueAllConfigs();
        var results = await Promise.all(configQueuer.promises);
        results.forEach((result, index) => {
            compilation.emitAsset(this.outputDir, new RawSource(result.finalImgRaw), {});
        });
        console.log(CONSOLE_COLOR_WARNING, "Done");
    }
}
class ConfigQueuer {
    constructor(inputContextDir, configurations) {
        this.promises = [];
        this.inputContextDir = inputContextDir;
        this.configurations = configurations;
    }
    async queueAllConfigs() {
        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg'];
        // t1 = performance.now()
        for await (const entry of readdirp(this.inputContextDir, { fileFilter: fileFilter })) {
            this.configurations.forEach(configurationUnclean => {
                const defaultConfig = {
                    fileNamePrefix: '',
                    fileNameSuffix: '',
                    directory: '',
                    sharpMethods: (obj) => obj
                };
                const configuration = { ...defaultConfig, ...configurationUnclean };
                this.promises.push(new ConfigProcessor(this.inputContextDir, entry.path, configuration).processImage());
            });
        }
        return this;
    }
}
class ConfigProcessor {
    constructor(inputContextDir, imgPath, configuration) {
        this.inputContextDir = inputContextDir;
        this.imgPath = imgPath;
        this.config = configuration;
    }
    async processImage() {
        await queue.acquire();
        try {
            // Read Image
            var sharpInstance = sharp(path.join(this.inputContextDir, this.imgPath));
            // apply methods
            sharpInstance = this.config.sharpMethods(sharpInstance);
        }
        catch (error) {
            console.log(CONSOLE_COLOR_WARNING, error);
        }
        let finalImgformat;
        try {
            this.finalImgRaw = await sharpInstance.toBuffer();
            // Read and set final output format
            const { format } = await sharp(this.finalImgRaw).metadata();
            finalImgformat = format;
        }
        catch (error) {
            console.log(CONSOLE_COLOR_CRITICAL, error);
            return;
        }
        console.log(CONSOLE_COLOR_SUCCESS, "Computed " + this.imgPath);
        let imgName = [
            this.config.fileNamePrefix,
            path.parse(path.basename(this.imgPath)).name,
            this.config.fileNameSuffix,
            '.' + finalImgformat
        ].join('');
        this.outputPath = path.join(this.config.directory, path.dirname(this.imgPath), imgName);
        queue.release();
        return this;
    }
}
module.exports = ImageProcessorPlugin;
//# sourceMappingURL=imageprocessor.js.map