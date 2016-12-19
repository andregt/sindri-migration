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
    set logger(customLogger){
        logger = new Logger(customLogger);
        logger.category = 'YamlLoader';

    },

    /**
     * Carrega todos os yaml de um diretório
     *
     * @param directoryPath
     * @returns {Promise.<Array>}
     */
    load(directoryPath = process.cwd()) {

        // Pode carregar um ou mais diretórios
        let directoryList = Array.isArray(directoryPath) ? directoryPath : [directoryPath];


        let fileList = [];

        return Promise

            .map(directoryList, directory => {

                logger.debug(`Carregando diretório '${directory}'`);

                return fs.readdirAsync(directory)
                    .then(files => {

                        for (let file of files) {
                            fileList.push(path.join(directory, file));
                        }

                    });

            })

            .then(() => this._loadFiles(fileList));

    },

    /**
     * Carrega todos os schemas à partir de uma lista de arquivos
     *
     * @param files
     * @private
     */
    _loadFiles(files) {

        let validFiles = files.filter(file => path.extname(file) === '.yaml');

        let schemas = [];
        return Promise
            .map(validFiles, filePath => {

                logger.debug(`Carregando arquivo '${b(filePath)}'`);

                return fs.readFileAsync(filePath)
                    .then(buffer => {

                        let yamlSchema = yaml.safeLoad(buffer);
                        yamlSchema.name = path.basename(filePath, '.yaml');
                        schemas.push(yamlSchema);

                    });


            })
            .then(() => schemas);


    }


};


