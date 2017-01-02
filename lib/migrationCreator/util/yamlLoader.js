/**
 * **Created on 13/12/16**
 *
 * lib/migrationCreator/util/yamlLoader.js
 * @author André Timermann <andre@andregustvo.org>
 *
 * Carrega em um diretório ou diretórios, todos os arquivos Yaml e gera um schema representando todos os modelos
 *
 */
'use strict';

const chalk = require('chalk');
const Promise = require('bluebird');

const fs = require('fs');
Promise.promisifyAll(fs);

const b = chalk.blue.bold;

const path = require('path');
const yaml = require('js-yaml');

const Logger = require('../../util/logger');

// Logger Padrão
let logger = new Logger();
logger.category = 'YamlLoader';

module.exports = {


    /**
     * Caso Usuario deseja um log personalizado Ex: Interface gráfica
     *
     * @param customLogger
     */
    set logger(customLogger) {
        logger = new Logger(customLogger);
        logger.category = 'YamlLoader';

    },


    /**
     * Verifica se caminho especificado é um diretório
     */
    isDirectory(filePath){

        return fs
            .lstatAsync(filePath)
            .then(r => r.isDirectory() || r.isSymbolicLink());
    },

    /**
     * Carrega todos os yaml de um diretório e subdiretórios
     *
     * @param directoryPath
     * @returns {Promise.<Array>}
     */
    load(directoryPath = process.cwd()){


        logger.debug('Load all Yaml:');
        logger.debug(chalk.bold(directoryPath));

        return this._load(directoryPath)
            .then(schemas => {

                let result = {};

                for (let schema of schemas) {
                    result[schema.name] = schema;
                }

                return result;

            });


    },


    /**
     * Usado internamente para carregar todos os schemas
     *
     * @param directoryPath
     * @private
     */
    _load(directoryPath) {

        return Promise.resolve()

        // Carrega Schemas
            .then(() => {

                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Se Directory é um Array, deve ser chamado _load para cada item do array (devemos processar cada diretório separadamente)
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                if (Array.isArray(directoryPath)) {

                    let schemas = [];

                    return Promise
                        .mapSeries(directoryPath, directory => {

                            return this
                                ._load(directory)
                                .then(s => schemas = schemas.concat(s));

                        })

                        .then(() => schemas);


                }
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Se Directory é uma String então é o caminho do diretório, então vamos carregar Todos os Arquivos dentro
                ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                else {

                    return this._loadDirectory(directoryPath);

                }
            });


    },

    /**
     * Carrega todos os Modelos Yaml em um determinado Diretório e seus Subdiretórios
     *
     * @param directoryPath
     * @private
     */
    _loadDirectory(directoryPath){


        return fs.readdirAsync(directoryPath)
            .then(files => {

                let schemas = [];

                // Percorre Todos os Arquivos Neste Diretório
                return Promise
                    .mapSeries(files, fileName => {

                        let filePath = path.resolve(directoryPath, fileName);

                        return this
                            ._loadFiles(fileName, filePath)
                            .then(s => schemas = schemas.concat(s));

                    })

                    .then(() => schemas);

            });

    },


    /**
     * Carrega Modelo no Formato YAML ou Lista de arquivos caso seja passado um Diretório
     *
     * @param fileName
     * @param filePath
     * @private
     */
    _loadFiles(fileName, filePath){

        logger.debug(`Carregando schama yaml: ${chalk.bold(fileName)}`);

        return this.isDirectory(filePath)

            .then(isDirectory => {

                ////////////////////////////////////////////////////////////////////////////////////////////////
                // DIRETÒRIO
                ////////////////////////////////////////////////////////////////////////////////////////////////
                if (isDirectory) {
                    logger.debug('É Diretório');
                    return this._load(filePath);
                }
                ////////////////////////////////////////////////////////////////////////////////////////////////
                // ARQUIVO YAML
                ////////////////////////////////////////////////////////////////////////////////////////////////
                else {
                    logger.debug('É Arquivo');

                    // converte pra array (padronizando saída)
                    return this._loadFile(filePath).then(s => [s]);
                }


            });


    },


    /**
     * Carrega todos os schemas à partir de uma lista de arquivos
     *
     * @param files
     * @private
     */
    _loadFile(filePath) {


        if (path.extname(filePath) === '.yaml') {

            logger.debug(`Carregando arquivo '${b(filePath)}'`);

            return fs.readFileAsync(filePath)
                .then(buffer => {

                    let yamlSchema = yaml.safeLoad(buffer);
                    yamlSchema.name = path.basename(filePath, '.yaml');
                    return yamlSchema;

                });

        }


    }


};


