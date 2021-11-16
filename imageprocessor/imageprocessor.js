let waitXsec = (x) => {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve('');
        }, x * 1000);
    });
};
const sharp = require('sharp');
const readdirp = require('readdirp');
const path = require('path');
const cpus = require('os').cpus();
const { Sema } = require('async-sema');
const crypt = require('crypto');
const PROCESSOR_COUNT = cpus.length;
const queue = new Sema(Math.max(2, PROCESSOR_COUNT));
const CONSOLE_COLOR_WARNING = '\x1b[33m%s\x1b[0m';
const CONSOLE_COLOR_CRITICAL = '\x1b[41m%s\x1b[0m';
const CONSOLE_COLOR_SUCCESS = '\x1b[32m%s\x1b[0m';
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
        compiler.hooks.emit.tapPromise('ImageProcessor', (compilation) => {
            compilation.hooks.processAssets.tap({
                name: 'ImageProcessorPlugin',
                stage: compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
                additionalAssets: (assets) => {
                    console.log('List of assets and their sizes:');
                    Object.entries(assets).forEach(([pathname, source]) => {
                        console.log(`— ${pathname}: bytes`);
                    });
                },
            }, (assets) => {
                console.log('List of assets and their sizes:');
                Object.entries(assets).forEach(([pathname, source]) => {
                    console.log(`— ${pathname}: bytes`);
                });
            });
            return new Promise((resolve, reject) => {
                if (this.firstRun == true) {
                    this.firstRun = false;
                    var self = this;
                    this.compilerOutputPath = compiler.outputPath;
                    this.inputContextDir = path.join(compiler.context, this.options.inputDir);
                    this.outputContextDir = path.join(compiler.context, this.options.outputDir);
                    compilation.contextDependencies.add(this.inputContextDir);
                    this.compilation = compilation;
                    new ConfigQueuer().queueAllConfigs(this.inputContextDir, this.options.configurations).then(ConfigQueuer => {
                        Promise.all(ConfigQueuer.promises).then(results => {
                            let assetEmmitPromises = [];
                            results.forEach((result, index) => {
                                assetEmmitPromises.push(this.emmitAssetToAbsolutePath(path.join(this.outputContextDir, result.outputPath), result.finalImgRaw));
                            });
                            Promise.all(assetEmmitPromises).then(data => {
                                resolve('');
                            });
                        });
                    });
                }
                else {
                    resolve('');
                }
            });
        });
    }
    async emmitAssetToAbsolutePath(absolutePath, rawSource) {
        const ouputPathRelativeToCompilerOutputPath = path.relative(this.compilerOutputPath, absolutePath);
        this.compilation.assets[ouputPathRelativeToCompilerOutputPath] = {
            source: () => rawSource
        };
    }
}
class ConfigQueuer {
    constructor() {
        this.promises = [];
    }
    async queueAllConfigs(inputContextDir, configurations) {
        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg'];
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
