/**
 * **Created on 13/12/16**
 *
 * lib/migrationCreator/schema.js
 * @author André Timermann <andre@andregustvo.org>
 *
 * Classe que representa um objeto Schema
 *
 */
'use strict';
const Promise = require('bluebird');

const YamlLoader = require('./util/yamlLoader');
const Logger = require('../util/logger');
let logger;

const moment = require('moment');

const chalk = require('chalk');

const SchemaParser = require('./util/schemaParser');
const SchemaValidator = require('./util/schemaValidator');

const MigrationDirectory = require('../migrationDirectory');

const _ = require('lodash');

const fs = require('fs');
Promise.promisifyAll(fs);

const path = require('path');


// Mudar nome para Schema
class Schema {

    /**
     *
     * @param config
     */
    constructor(config = {}) {

        this.config = config;

        logger = new Logger(this.config.logger);
        logger.category = 'Schema';

        /**
         * Armazenado Internamente o Schema carregado e processado
         *
         * @type {{}}
         * @private
         */
        this._schema = {};


        this.migrationDirectory = new MigrationDirectory({
            logger: this.config.logger,
            ui: this.ui,
            dataPath: this.config.dataPath
        });


    }

    /**
     * Importa schema de todos os arquivos yaml dentro de um ou mais diretórios
     *
     * @param directoryPath
     */
    importFromYaml(directoryPath) {

        /////////////////////////////////////////////
        // Carrega YAML Loader
        /////////////////////////////////////////////

        YamlLoader.logger = this.config.logger;

        return YamlLoader
            .load(directoryPath)

            /////////////////////////////////////////////
            // Processa Herança
            /////////////////////////////////////////////
            .then(schema => {

                if (schema.length == 0){
                    throw new Error('Nenhum schema encontrado!');
                }

                SchemaParser.logger = this.config.logger;
                return SchemaParser.parser(schema);


            })

            /////////////////////////////////////////////
            // Valida Schema Gerado
            /////////////////////////////////////////////
            .then(schema => {

                SchemaValidator.logger = this.config.logger;

                // Grava internamente na instancia
                this._schema = schema;

                return SchemaValidator.validate(schema);

            })

            /////////////////////////////////////////////
            // Resultado da Validação
            /////////////////////////////////////////////
            .then(validation => {

                let {error, warn, info} = validation;


                if (error.length == 0) {

                    for (let msg of warn) {
                        logger.warn(msg);
                    }
                    for (let msg of info) {
                        logger.info(msg);
                    }


                    logger.info('Validação concluída.');
                    logger.trace(this._schema);

                    this.valid = true;

                } else {

                    logger.error(chalk.bold.red('------ Erro ao Validar Schema ------ '));

                    for (let msg of error) {
                        logger.error(chalk.red(msg));
                    }

                    this.valid = false;

                    logger.info('Validação concluída.');
                }

            })

            .then(() => this._loadNewRevision());


    }


    /**
     * Salva Esquemas em um diretório, gerando uma nova revisão
     *
     */
    save() {

        let schemaPath = path.join(this.migrationDirectory.dirSchemas, `schema-${moment().format('YYYYMMDDHHmm')}-${_.padStart(this.revision, 5, 0)}.json`);

        return fs.writeFileAsync(schemaPath, JSON.stringify(this._schema));

    }


    /**
     * Carrega um schema numa revisão especifica
     * @param revision
     */
    load(revision) {

        // TODO: Implementar
        throw  new Error('Não Implementado');

    }

    /**
     * Retorna Schema no formato Json
     */
    getJson() {

        // TODO: Implementar
        throw  new Error('Não Implementado');

    }


    /**
     * Retorna id para uma nova revisão
     * @private
     */
    _loadNewRevision() {

        return this.migrationDirectory.getLastSchemaRevision()
            .then(revision => {

                this.revision = revision + 1;
                logger.info(`Nova Revisão: ${this.revision}`);

            });


    }
}


module.exports = Schema;