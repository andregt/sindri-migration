/**
 * **Created on 13/12/16**
 *
 * lib/migrationCreator/index.js
 * @author André Timermann <andre@andregustvo.org>
 *
 *     Cria uma nova versão de migração
 *
 */
'use strict';


const Logger = require('../util/logger');
let logger;

const chalk = require('chalk');

const UiPrompt = require('../../plugins/ui/uiPrompt');

const Schema = require('./schema');
const SchemaDiff = require('./schemaDiff');
const Solution = require('./solution');

const MigrationDirectory = require('../migrationDirectory');

const OpearationCanceled = require('../../errors/operationCanceled');

class MigrationCreator {


    /**
     * Construtor
     *
     *
     * @param config    Configuração do Migration Creator
     *                  Parâmentros:
     *                      logger: Objeto para sobrescrever o logger, deve ser compatível com o log4js
     *                      level: Nível de Log, pode ser TRACE, DEBUG, INFO, WARN, ERROR ou FATAL (Padrão: INFO)
     *
     */
    constructor(config = {}) {


        this.config = config;
        ////////////////////////////////////////////////////////////////////////////////
        // Inicializa Log
        // Padrão usa o log4js
        // REF: https://www.npmjs.com/package/log4js
        //
        // Métodos disponíveis
        //      this.logger.trace('Entering cheese testing');
        //      this.logger.debug('Got cheese.');
        //      this.logger.info('Cheese is Gouda.');
        //      this.logger.warn('Cheese is quite smelly.');
        //      this.logger.error('Cheese is too ripe!');
        //      this.logger.fatal('Cheese was breeding ground for listeria.');
        //
        ////////////////////////////////////////////////////////////////////////////////

        logger = this.config.logger || new Logger(this.config.customLogger, 'INFO');
        logger.category = 'SindriMigration';
        logger.info('Instanciando Migration Creator...');

        if (config.dataPath) logger.debug(`Diretório de Dados: ${chalk.bold.blue(config.path)}`);

        ////////////////////////////////////////////////////////////////////////////////
        // Inicializa Interface de usuárop
        ////////////////////////////////////////////////////////////////////////////////

        this.ui = config.ui || new UiPrompt();


        this.migrationDirectory = new MigrationDirectory({
            logger: this.config.logger,
            ui: this.ui,
            dataPath: this.config.dataPath
        });


    }

    /**
     * Inicia a Criação de uma nova migração
     */
    create() {

        logger.info('Criando nova Migração...');

        ////////////////////////////////////////////////////////////////////////////////
        // Cria Novo Schema
        ////////////////////////////////////////////////////////////////////////////////

        let newSchema, oldSchema;

        return Promise.resolve()

            .then(() => this.migrationDirectory.validate())

            .then(() => this._loadNewSchema())

            .then(r => {
                newSchema = r;
                return this._loadOldSchema(newSchema.revision);
            })

            .then(r => {
                oldSchema = r;
                return this._createMigrationScript(oldSchema, newSchema);
            })

            .then(() => {
                return this.ui
                    .confirm('Migração finalizada. Deseja Salvar?', true);
            })

            .then(confirm => {

                if (!confirm) throw new OpearationCanceled();
                return newSchema.save();

            });


    }


    /**
     * Cria diferença entre schema antigo e novo(up) e entre o novo e antigo(down)     *
     *
     *
     * @param oldSchema
     * @param newSchema
     */
    createDiffs(oldSchema, newSchema) {

        // TODO: Se não existir diferença cancelar migração

        // TODO: Implementar
        throw new Error('Não Implementado');

        // console.log('====================================================================================================')
        // logger.debug(oldSchema);
        // console.log('====================================================================================================')
        // logger.debug(newSchema);
        // console.log('====================================================================================================')


    }

    /**
     * Carrega Novo SChema
     *
     * @returns {Promise.<TResult>}
     * @private
     */
    _loadNewSchema() {

        let newSchema = new Schema({
            logger: this.config.logger,
            ui: this.ui,
            dataPath: this.config.dataPath
        });


        return newSchema.importFromYaml(this.migrationDirectory.dirModels)

            .then(() => {


                if (newSchema.valid) {

                    return this.ui
                        .confirm('Schema carregado e validado, continuar?', false)
                        .then(confirm => {

                            if (!confirm) throw new OpearationCanceled();

                            return newSchema;

                        });

                } else {

                    throw new Error('Operação Inválida');
                }

            });

    }

    /**
     * Carrega Esquema Antigo Caso não seja primeira revisão
     *
     * @returns {Promise.<T>}
     * @private
     */
    _loadOldSchema(revision) {

        // TODO: Implementar


        if (revision > 1) {

            let oldSchema = new Schema({
                logger: this.config.logger,
                dataPath: this.config.dataPath
            });


            return oldSchema.load(revision);

        } else {


            // Nenhum Schema
            return Promise.resolve(null);

        }


    }

    /**
     * Cria Script de Migração Up e Down para o novo schema
     *
     * @param oldSchema
     * @param newSchema
     * @returns {boolean}
     * @private
     */
    _createMigrationScript(oldSchema, newSchema) {

        if (!oldSchema) {

            logger.debug('Migração na primeira revisão, não será necessário criar scripts de migração.');
            return true;

        } else {

            // TODO: Implementar Diferença, solução
            throw new Error('Não Implementado');

            // return this
            //     .createDiffs(oldSchema, newSchema)
            //     .then(() => this.createSolution(oldSchema, newSchema));

        }


    }
}


module.exports = MigrationCreator;