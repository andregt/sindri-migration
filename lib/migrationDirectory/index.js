/**
 * **Created on 16/12/16**
 *
 * sindri-migration/lib/migrationDirectory/index.js
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

const Logger = require('../util/logger');
let logger;

const UiPrompt = require('../../plugins/ui/uiPrompt');

const Promise = require('bluebird');

const fs = require('fs-extra')

Promise.promisifyAll(fs);

const path = require('path');

const mkdirp = require('mkdirp');
Promise.promisifyAll(mkdirp);

const chalk = require('chalk');

const _ = require('lodash');

const Spinner = require('cli-spinner').Spinner;
let spinner = new Spinner();

// TODO: Permitir customização carregando do config

/**
 * Diretório de Dados padrão (à partir do diretório corrente)
 * @type {string}
 */
const DIR_DATA = 'data';
// Base no diretório dirData

const DIR_BACKUP = 'backup';
const DIR_DIAGRAM = 'diagram';
const DIR_SQL = 'sql';
const DIR_MODELS = 'models';
const DIR_SCHEMAS = 'migration/schemas';
const DIR_SCRIPTS = 'migration/scripts';

class MigrationDirectory {

    constructor(config = {}) {

        this.config = config;

        logger = this.config.logger || new Logger(this.config.customLogger, 'INFO');
        logger.category = 'MigrationDirectory';

        this.ui = config.ui || new UiPrompt();


        this.dirData = path.resolve(config.path || path.join(process.cwd(), DIR_DATA));

        logger.trace(`Diretório de Dados: ${chalk.bold.blue(this.dirData)}`);


    }


    get dirBackup() {
        if (!this._dirBackup) this._dirBackup = path.join(this.dirData, DIR_BACKUP);
        return this._dirBackup;
    }

    get dirDiagram() {
        if (!this._dirDiagram) this._dirDiagram = path.join(this.dirData, DIR_DIAGRAM);
        return this._dirDiagram;
    }

    get dirSql() {
        if (!this._dirSql) this._dirSql = path.join(this.dirData, DIR_SQL);
        return this._dirSql;
    }

    get dirModels() {
        if (!this._dirModels) this._dirModels = path.join(this.dirData, DIR_MODELS);
        return this._dirModels;
    }

    get dirSchemas() {
        if (!this._dirSchemas) this._dirSchemas = path.join(this.dirData, DIR_SCHEMAS);
        return this._dirSchemas;
    }

    get dirScripts() {
        if (!this._dirScripts) this._dirScripts = path.join(this.dirData, DIR_SCRIPTS);
        return this._dirScripts;
    }


    get configMigration() {
        return require(path.join(this.dirData, 'config.json'));

    }

    set configMigration(value) {

        let configPath = path.join(this.dirData, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(value));

    }


    /**
     * Cria Estrutura de Diretório de Migração
     *
     */
    createStructure() {

        logger.info('Criando estrutura...');

        return fs
            .mkdirAsync(this.dirData)
            .then(() => mkdirp(this.dirBackup))
            .then(() => mkdirp(this.dirDiagram))
            .then(() => mkdirp(this.dirSql))
            .then(() => mkdirp(this.dirModels))
            .then(() => mkdirp(this.dirSchemas))
            .then(() => mkdirp(this.dirScripts))
            .then(() => {

                this.configMigration = {
                    currentMigration: 0 // Nenhuma migração definida
                };


            });


    }


    /**
     * Retorna Ultima revisão do schema salvo
     *
     * @returns {number}
     */
    getLastSchemaRevision() {

        return this.validate()
            .then(() => {


                let revision;
                let lastRevision = 0;

                let reFile = /schema-\d{12}-(\d{5}).json$/;

                // noinspection JSUnresolvedFunction,JSValidateTypes
                return fs.readdirAsync(this.dirSchemas)
                    .then(files => {

                        // /////////////////////////////////
                        // Itera por arquivos
                        // /////////////////////////////////

                        for (let file of files) {

                            let result = file.match(reFile);

                            if (result) {
                                revision = parseInt(result[1]);

                                if (revision > lastRevision) {
                                    lastRevision = revision;
                                }
                            }

                        }


                        // /////////////////////////////////
                        // Resultado
                        // /////////////////////////////////
                        logger.debug('Ultima Revisão: ' + lastRevision);
                        return parseInt(lastRevision);
                    });


            });


    }


    /**
     * Valida se estrutura de migração está configurada corretamente no diretório atual
     */
    validate() {

        // Verifica se diretório principal existe

        return this
            .exist(this.dirData)
            .then(exist => {

                if (!exist) {

                    logger.warn('Diretório de migração não existe!');

                    return this.ui.confirm('Deseja criar estrutura de diretório para migração?', false)
                        .then(confirm => {

                            if (confirm) {
                                return this.createStructure();
                            } else {

                                console.trace();
                                throw new Error('Estrutura de Diretório de Migração não existe!');
                            }

                        });


                } else {

                    logger.debug('Validação OK');

                    return true;
                }

            });


    }


    /**
     * Retorna todos os Schemas no Diretório de Schema
     */
    getSchemasFile() {

        return this.validate()
            .then(() => {

                let reFile = /schema-\d{12}-\d{5}.json$/;

                // noinspection JSUnresolvedFunction,JSValidateTypes
                return fs.readdirAsync(this.dirSchemas)
                    .then(files => {
                        return files.filter((file) => file.match(reFile));
                    });


            });

    }


    /**
     * Carrega Schema já no formato correto (json)
     *
     * @param revision
     */
    loadSchema(revision) {


        return this.getSchemasFile()

            .then(files => {

                let reFile = new RegExp(`schema-\\d{12}-${_.padStart(revision, 5, 0)}.json$`);


                for (let file of files) {
                    if (file.match(reFile)) {
                        return file;
                    }
                }

                throw new ReferenceError(`Revisão '${revision}' não existe!`);

            })

            .then(file => require(path.join(this.dirSchemas, file)));


    }

    /**
     * Procura por models em todos os modulos e sub-modulos instalados no projetos e retorna os arquivos organizado pelo nome do modulo
     *
     * @param path      {string}    Diretório dentro dos modulos onde será feita a busca (Padrão: data/models)
     * @param result    {object}
     * @param checkedModule   {array}
     */
    findModels(migrationPath = DIR_DATA, result = {}, checkedModule = []) {

        let migrationData = {
            path: migrationPath,
            result: result,
            checkedModule: checkedModule
        }

        // TODO: Validar diretórios data

        let rootDirectory = path.join(process.cwd());


        return this.validate()
            .then(() => this.exist(path.join(rootDirectory, 'node_modules')))
            .then(exist => {

                if (exist) {

                    spinner.setSpinnerString(19);
                    spinner.start();

                    return this._findNodeModules(rootDirectory, migrationData)
                } else {
                    throw new Error('Você não está no diretório raiz do projeto ou não tem nenhum módulo instalado!')
                }


            })


            .then(result => {
                spinner.stop();
                return migrationData.result
            });


    }


    /**
     * Procura por todos os Modulos instalados
     *
     * @param migrationData
     * @private
     */
    _findNodeModules(rootDirectory, migrationData, lv = 0) {



        // Limita Busca em 10 níveis
        if (lv <= 10) {

            let nodeModulesDir = path.join(rootDirectory, 'node_modules');
            logger.trace('Procurando Módulos em: ' + chalk.bold(nodeModulesDir))

            // noinspection JSUnresolvedFunction,JSValidateTypes
            return fs.readdirAsync(nodeModulesDir)

                .then(files => {


                    return Promise.mapSeries(files, moduleName => {


                        if (migrationData.checkedModule.indexOf(moduleName) !== -1) {

                            logger.trace(chalk.red(`${moduleName} já processado`));
                            return false;

                        } else {
                            logger.trace(`Modulo: ${moduleName}`);

                            migrationData.checkedModule.push(moduleName);

                            // Procura por modelos Yaml neste módulo
                            return this._findModelsInModule(moduleName, path.join(nodeModulesDir, moduleName), migrationData, lv)
                        }
                    });

                })
                .then(() => {

                    return migrationData;

                })
                .catch(err => {

                    if (err.code === 'ENOENT') {

                        return true;

                    } else {
                        throw err;
                    }

                })
        }

    }

    /**
     * Procura por ModelsYaml em um modulo especifico
     *
     * @private
     */
    _findModelsInModule(moduleName, modulePath, migrationData, lv) {

        return fs
            .lstatAsync(modulePath)
            .then(r => r.isDirectory() || r.isSymbolicLink())
            .then(isDirectory => {

                if (isDirectory) {

                    logger.trace(`Procurando Migrações em '${chalk.bold(modulePath)}'`)

                    let migrationDirectory = path.join(modulePath, migrationData.path, DIR_MODELS);

                    return this.exist(migrationDirectory)
                        .then(exist => {

                            if (exist) {
                                logger.info(chalk.bold.yellow(`Migração encontrada em ${chalk.bold(migrationDirectory)}`))

                                migrationData.result[moduleName] = [];

                                fs.readdirAsync(migrationDirectory)
                                    .then(files => {
                                        for (let file of files) {
                                            let yamlMigrationPath = path.join(migrationDirectory, file)
                                            migrationData.result[moduleName].push(yamlMigrationPath);
                                        }
                                    })

                            }

                        })

                        // Procura em Submodulos
                        .then(() => {

                            return this._findNodeModules(modulePath, migrationData, lv + 1)

                        });
                }

            })


    }

    /**
     * Verifica se diretório/arquivo existe
     *
     * @private
     */
    exist(path) {

        return fs.accessAsync(path)
            .then(() => true)
            .catch(() => false);

    }


    /**
     * Copia lista de modelos Yaml para diretio de modelo do projeto atual
     *
     * @param moduleName    {string}    Nome do Modulo a ser copiado
     * @param modelsList    {array}     Lista de caminhos dos modelos em formato Yaml
     */
    copyModels(moduleName, modelsList) {


        let destinyPath = path.join(this.dirModels, moduleName);

        return this.exist(destinyPath)
            .then(exist => {

                if (exist) {

                    throw new Error(`Módulo '${moduleName}' já está instalado.`);
                    return false;

                } else {

                    logger.info(`Criando diretório '${destinyPath}'...`)
                    return mkdirp(destinyPath);
                }


            })
            .then(() => {


                return Promise.map(modelsList, file => {

                    logger.info(`Copiando '${file}' para '${destinyPath}'`)
                    return fs.copyAsync(file, path.join(destinyPath, path.basename(file)))

                })


            })


    }
}


module.exports = MigrationDirectory;