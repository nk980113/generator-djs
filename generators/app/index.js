'use strict';
const path = require('node:path');
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');

const isNullable = (o) => o == undefined;

/**
 * @typedef {Object} GeneratorConfig
 * @property {12 | 13 | 14} version
 * @property {'cjs' | 'esm'} moduleType
 * @property {'message' | 'slash'} commandType
 * @property {'none' | 'event' | 'command' | 'both'} handlerType
 * @property {'json' | 'env'} configFormat
 * @property {boolean} sharding
 * @property {boolean} voice
 */

module.exports = class extends Generator {
    aborted = false;
    /** @type {GeneratorConfig} */
    generatorConfig = {};
    dependenciesList = [];
    /**  */
    voiceDependenciesPriority = [
        ['@discordjs/voice'],
        ['ffmpeg-static'],
        ['@discordjs-opus', 'opusscript'],
        ['sodium-native', 'sodium', 'tweetnacl', 'libsodium-wrappers'],
    ];
    // eslint-disable-next-line no-undef
    missingOptions = new Set();

    logError = function logError(msg) {
        this.log(`${chalk.red('ERROR')} ${msg}`);
    };

    logWarning = function logWarning(msg) {
        this.log(`${chalk.yellow('WARNING')} ${msg}`);
    };

    constructor(args, opts) {
        super(args, opts);

        this
            .option('version', {
                type: Number,
                alias: 'v',
                description: 'Specify the version of discord.js. Can be: 12, 13, 14',
            })
            .option('module', {
                type: String,
                alias: 'm',
                description: 'The module spec to use. Can be: "cjs", "esm"',
            })
            .option('command-type', {
                type: String,
                alias: 'c',
                description: 'The command type of the bot. Can be: "message", "slash"',
            })
            .option('handler', {
                type: String,
                alias: 'H',
                description: 'Which type of handler to use. Can be: "none", "event", "command", "both"',
            })
            .option('config-type', {
                type: String,
                alias: 'C',
                description: 'File format for configuration file. Can be: "json", "env"',
            })
            .option('sharding', {
                type: Boolean,
                alias: 's',
                description: 'Whether to enable sharding or not.',
            })
            .option('voice', {
                type: Boolean,
                alias: 'V',
                description: 'Whether or not to add voice support. Only available on version 13 or newer.',
            });

        // Change source root to the template directory
        this.sourceRoot(path.join(__dirname, '../../templates'));
    }

    async initializing() {
        // Greetings
        this.log(yosay('Hello fellow human devs. I\'m the generator bot. Beep Beep Beep Beep'));

        // Resolve options
        let resolveOptionFailed = false;

        if (!isNullable(this.options['version'])) {
            if (![12, 13, 14].includes(this.options['version'])) {
                this.logError(`Version ${this.options['version']} is invalid.`);
                resolveOptionFailed = true;
            } else {
                this.generatorConfig.version = this.options['version'];
            }
        } else this.missingOptions.add('version');

        if (!isNullable(this.options['module'])) {
            if (!['cjs', 'esm'].includes(this.options['module'].toLowerCase?.())) {
                this.logError(`Module spec ${this.options['module']} is invalid.`);
                resolveOptionFailed = true;
            } else {
                this.generatorConfig.moduleType = this.options['module'].toLowerCase();
            }
        } else this.missingOptions.add('moduleType');

        if (!isNullable(this.options['command-type'])) {
            if (!['message', 'slash'].includes(this.options['command-type'].toLowerCase?.())) {
                this.logError(`Command type ${this.options['command-type']} is invalid.`);
                resolveOptionFailed = true;
            } else {
                this.generatorConfig.commandType = this.options['command-type'].toLowerCase();
            }
        } else this.missingOptions.add('commandType');

        if (!isNullable(this.options['handler'])) {
            if (!['none', 'event', 'command', 'both'].includes(this.options['handler']).toLowerCase?.()) {
                this.logError(`Handler type ${this.options['handler']} is invalid.`);
                resolveOptionFailed = true;
            } else {
                this.generatorConfig.handlerType = this.options['handler'].toLowerCase();
            }
        } else this.missingOptions.add('handlerType');

        if (!isNullable(this.options['config-type'])) {
            if (!['json', 'env'].includes(this.options['config-type']).toLowerCase?.()) {
                this.logError(`Configuration file format ${this.options['config-type']} is invalid.`);
                resolveOptionFailed = true;
            } else {
                this.generatorConfig.configFormat = this.options['config-type'];
            }
        } else this.missingOptions.add('configFormat');

        if (!isNullable(this.options['sharding'])) {
            this.generatorConfig.sharding = this.options['sharding'];
        } else this.missingOptions.add('sharding');

        if (!isNullable(this.options['voice'])) {
            this.generatorConfig.voice = this.options['voice'];
        } else this.missingOptions.add('voice');

        if (this.generatorConfig.version === 12) {
            this.logWarning('Version 12 is deprecated. Use version 13 if you can');
            if (this.generatorConfig.commandType === 'slash') {
                this.logWarning('Version 12 can\'t integrate with slash commands. The generator will change the command type automatically.');
                this.generatorConfig.commandType = 'message';
            }

            if (this.generatorConfig.voice) {
                this.logWarning('Version 12 has builtin voice support, so the generator won\'t install voice plugins.');
                this.generatorConfig.voice = false;
            }
        }

        // If some of the options are invalid, abort
        if (resolveOptionFailed) {
            this.logError('Aborting due to the errors above...');
            this.aborted = true;
        }

        // Check project state
        if (this.fs.exists(this.destinationPath('bot.js'))) {
            const { overwrite } = await this.prompt({
                type: 'confirm',
                name: 'overwrite',
                message: 'It seems you have a project already. The actions below may overwrite your old code. Continue?',
                default: false,
            });
            if (overwrite) {
                this.log('Aborted.');
                this.aborted = true;
            }
        }
    }

    async prompting() {
        if (this.missingOptions.has('version')) {
            const { version } = await this.prompt({
                choices: [12, 13, 14],
                type: 'number',
                name: 'version',
                message: 'Choose a discord.js version.',
                default: 14,
                store: true,
            });

            if (version === 12) {
                this.logWarning('Version 12 is deprecated. Use version 13 if you can');
            }
            this.generatorConfig.version = version;
        }

        /** @type {Generator.Questions[]} */
        const prompts = [];
        if (this.generatorConfig.version === 12) {
            this.generatorConfig.commandType = 'message';
            this.missingOptions.delete('commandType');
            this.generatorConfig.voice = false;
            this.missingOptions.delete('voice');
        }

        if (this.missingOptions.has('module')) {
            prompts.push({
                choices: ['cjs', 'esm'],
                type: 'input',
                name: 'moduleType',
                message: 'Choose a module spec.',
                default: 'cjs',
                store: true,
            });
        }
    }

    writing() {
        this.fs.copy(
            this.templatePath('dummyfile.txt'),
            this.destinationPath('dummyfile.txt'),
        );
    }

    install() {
        this.installDependencies();
    }
};
