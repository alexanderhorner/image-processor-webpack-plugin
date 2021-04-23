import { resolve } from "node:path";
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
const promiseEach = async (arrayOfPromises, func) => {
    for (const item of arrayOfPromises)
        await func(item);
};
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
        compiler.hooks.emit.tapPromise('ImageProcessor', async (compilation, callback) => {
            if (this.firstRun == true) {
                this.firstRun = false;
                this.compilerOutputPath = compiler.outputPath;
                // combine context and options input/ouputDir
                this.fullInputDir = path.join(compiler.context, this.options.inputDir);
                this.fullOutputDir = path.join(compiler.context, this.options.outputDir);
                // Add input directory to dependencies
                compilation.contextDependencies.add(this.fullInputDir);
                this.compilation = compilation;
                // TODO: add parameter fullInputDir
                const promises = await new ConfigQueuer(this.options.configurations, '.').queueAllConfigs();
                promiseEach(promises, () => {
                });
                resolve();
            }
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
    emmitAssetToAbsolutePath(absolutePath, source) {
        const ouputPathRelativeToCompilerOutputPath = path.relative(this.compilerOutputPath, absolutePath);
        this.compilation.assets[ouputPathRelativeToCompilerOutputPath] = {
            source: () => source
        };
    }
}
class ConfigQueuer {
    constructor(configurations, fullInputDir) {
        this.configurations = configurations;
        this.fullInputDir = fullInputDir;
    }
    async queueAllConfigs() {
        let promises = [];
        const fileFilter = ['*.jpg', '.jpeg', '*.png', '*.webp', '*.avif', '*.tiff', '*.gif', '*.svg'];
        for await (const entry of readdirp(this.fullInputDir, { fileFilter: fileFilter })) {
            const imgPathInfo = {
                imgFullPath: entry.fullPath,
                imgDir: path.dirname(entry.path),
                imgFileName: path.parse(entry.path).name,
                imgFileExtension: path.extname(entry.path)
            };
            this.configurations.forEach(configurationUnclean => {
                const defaultConfig = {
                    fileNamePrefix: '',
                    fileNameSuffix: '',
                    directory: '',
                    sharpMethods: (obj) => obj
                };
                const configuration = { ...defaultConfig, ...configurationUnclean };
                promises.push(new ImageProcessor('', '', configuration.sharpMethods).processImage());
            });
        }
        return promises;
    }
}
class ImageProcessor {
    constructor(inputPathFull, ouputPathFull, sharpMethods) {
        this.inputPathFull = inputPathFull;
        ouputPathFull = ouputPathFull;
        this.sharpMethods = sharpMethods;
    }
    async processImage() {
        await queue.acquire();
        try {
            var sharpInstance = sharp(this.inputPathFull); // Read Image
            sharpInstance = this.sharpMethods(sharpInstance); // apply methods
        }
        catch (error) {
            console.log(CONSOLE_COLOR_WARNING, error);
        }
        let finalImgRaw;
        let finalImgformat;
        try {
            finalImgRaw = await sharpInstance.toBuffer();
            // Read and set final output format
            const { format } = await sharp(finalImgRaw).metadata();
            finalImgformat = format;
        }
        catch (error) {
            console.log(CONSOLE_COLOR_CRITICAL, error);
            return;
        }
        const fullOutputPath = path.join(this.fullOutputDir, config.directory, imgDir, config.fileNamePrefix + imgFileName + config.fileNameSuffix + '.' + finalImgformat);
        const ouputPathRelativeToCompilerDotOutputPath = path.normalize(fullOutputPath).replace(this.compilerDotOutputPath, '');
        this.compilation.assets[ouputPathRelativeToCompilerDotOutputPath] = {
            source: () => finalImgRaw
        };
        console.log('Processed: ' + ouputPathRelativeToCompilerDotOutputPath);
        queue.release();
    }
    emmitImage() {
    }
}
module.exports = ImageProcessorPlugin;
