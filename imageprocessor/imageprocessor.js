let waitXsec = (x) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve('');
        }, x * 1000);
    });
};
require('./processingWorker.js');
const sharp = require('sharp');
const fs = require('fs');
const readdirp = require('readdirp');
const path = require('path');
const cpus = require('os').cpus();
const { Sema } = require('async-sema');
const hashData = require('data-to-hash').default;
const PROCESSOR_COUNT = cpus.length;
const queue = new Sema(PROCESSOR_COUNT);
const CONSOLE_COLOR_WARNING = '\x1b[33m%s\x1b[0m';
const CONSOLE_COLOR_CRITICAL = '\x1b[41m%s\x1b[0m';
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
        compiler.hooks.emit.tapPromise('ImageProcessor', (compilation) => {
            return new Promise((resolve, reject) => {
                if (this.firstRun == true) {
                    this.firstRun = false;
                    this.compilerOutputPath = compiler.outputPath;
                    this.inputContextDir = path.join(compiler.context, this.options.inputDir);
                    this.outputContextDir = path.join(compiler.context, this.options.outputDir);
                    compilation.contextDependencies.add(this.inputContextDir);
                    this.compilation = compilation;
                    new ConfigQueuer().queueAllConfigs(this.inputContextDir, this.options.configurations).then(ConfigQueuer => {
                        Promise.all(ConfigQueuer.promises).then(results => {
                            let assetEmmitPromises = [];
                            console.timeEnd("ConfigProcessor");
                            console.time("assetEmit");
                            results.forEach((result, index) => {
                                assetEmmitPromises.push(this.emmitAssetToAbsolutePath(path.join(this.outputContextDir, result.outputPath), result.finalImgRaw));
                            });
                            Promise.all(assetEmmitPromises).then(data => {
                                console.timeEnd("assetEmit");
                                resolve('');
                            });
                        });
                    });
                }
                else {
                    reject('[ImageProcessorPlugin] Not first run!');
                }
            });
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
    async emmitAssetToAbsolutePath(absolutePath, source) {
        await waitXsec(5);
        const ouputPathRelativeToCompilerOutputPath = path.relative(this.compilerOutputPath, absolutePath);
        this.compilation.assets[ouputPathRelativeToCompilerOutputPath] = {
            source: () => source
        };
    }
}
class ConfigQueuer {
    constructor() {
        this.promises = [];
    }
    async queueAllConfigs(inputContextDir, configurations) {
        console.time("ConfigQuerer");
        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg'];
        console.time('ConfigProcessor');
        for await (const entry of readdirp(inputContextDir, { fileFilter: fileFilter })) {
            configurations.forEach(configurationUnclean => {
                const defaultConfig = {
                    fileNamePrefix: '',
                    fileNameSuffix: '',
                    directory: '',
                    sharpMethods: (obj) => obj
                };
                const configuration = { ...defaultConfig, ...configurationUnclean };
                this.promises.push(new ConfigProcessor(inputContextDir, entry.path, configuration).processImage());
            });
        }
        console.timeEnd("ConfigQuerer");
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
            var sharpInstance = sharp(path.join(this.inputContextDir, this.imgPath));
            sharpInstance = this.config.sharpMethods(sharpInstance);
        }
        catch (error) {
            console.log(CONSOLE_COLOR_WARNING, error);
        }
        let finalImgformat;
        try {
            this.finalImgRaw = await sharpInstance.toBuffer();
            const { format } = await sharp(this.finalImgRaw).metadata();
            finalImgformat = format;
        }
        catch (error) {
            console.log(CONSOLE_COLOR_CRITICAL, error);
            return;
        }
        console.log(CONSOLE_COLOR_CRITICAL, "Computed " + this.imgPath);
        console.timeLog('ConfigProcessor');
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
