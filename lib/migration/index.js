/**
 * **Created on 13/12/16**
 *
 * lib/migration/index.js
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

const chalk = require('chalk');

const UiPrompt = require('../../plugins/ui/uiPrompt');
const Logger = require('../util/logger');

const path = require('path');

let logger;

const MigrationDirectory = require('../migrationDirectory');

const DatabaseCreator = require('./databaseCreator');

const moment = require('moment');
moment.locale('pt_BR');

const OpearationCanceled = require('../../errors/operationCanceled');

const _ = require('lodash');

class Migration {

    constructor(config = {}) {


        this.config = config;

        logger = this.config.logger || new Logger(this.config.customLogger, 'INFO');
        logger.category = 'Migration';

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
     * Retorna Revisão Atual
     */
    get currentRevision() {
        return require(path.join(process.cwd(), 'data', 'config.json')).currentMigration;
    }


    /**
     * Valida se estrutura de diretório foi criado
     */
    validate() {
        return this.migrationDirectory.validate();
    }


    /**
     * Carrega todas as revisões disponíveis no Intervalo especificado
     *
     * @param from
     * @param to
     *
     * @returns {Array}
     */
    getListRevisions(from = 0, to = Infinity) {

        return this.migrationDirectory.getSchemasFile().then(schemas => {

            let reFile = /schema-(\d{12})-(\d{5}).json$/;

            let list = [];

            for (let schema of schemas) {
                let [, date, revision, ,] = schema.match(reFile);
                list.push([parseInt(revision), moment(date, 'YYYYMMDDHHmm').format("L LT")]);
            }

            // Ordena pelo primeiro elemento
            list.sort((a, b) => a[0] > b[0]);

            // Filtra apenas para elementros selecionados
            list = list.filter(v => v[0] >= from && v[0] <= to);

            return list;


        });

    }


    /**
     * Inicia Processo de Migração para próxima versão
     *
     * TODO: Permitir caminhar por várias migrações diferentes
     */
    up() {

        // let databaseManager = new DatabaseManager();

        // Realiza Backup
        // Valida Schema Atual
        // Dump Data
        // Drop Database
        // Create Database
        // Executa Schema
        // Recupera dados com script de migração


    }


    /**
     * Reinicia Revisão atual da base de dados
     *
     * @param options
     */
    reset(options = {}) {

        let revision = options.revision || 1;


        return Promise.resolve()
            .then(() => {

                if (options.persist && !options.quiet) {
                    return this.ui
                        .confirm(`Base de dados '${this.migrationDirectory.configMigration.database}' será excluida e todos os dados serão perdidos, continuar?`, false)
                } else {

                    return true;
                }

            })

            .then(confirm => {

                if (confirm) {
                    logger.info(`Resetando base de dados para revisão ${chalk.bold.blue('r' + revision)}`);
                    return true;
                } else {
                    throw new OpearationCanceled('Operação Cancelada');
                }

            })
            .then(() => this.backup())

            .then(() => this.dropCreateDatabase(options))

            .then(() => this.loadSchema(revision))

            .then(schema => this.executeSchema(schema, options))

            .then(() => {

                // Salva Revisão
                this.migrationDirectory.configMigration = _.defaults({currentMigration: revision}, this.migrationDirectory.configMigration);


            });


    }

    /**
     * Realiza Backup da base
     */
    backup() {

        logger.warn(chalk.yellow('Backup não implementado ainda!!!'));
        return true;

    }

    /**
     * Carrega Schema
     *
     * @param revision
     */
    loadSchema(revision) {

        return this.migrationDirectory.loadSchema(revision);

    }


    /**
     * Remove e Cria Base de Dados
     * @returns {*}
     * @param options
     */
    dropCreateDatabase(options) {


        if (options.dropDatabase) {

            let database = new DatabaseCreator({
                noDatabase: true,
                logger: this.config.logger,
                debug: this.config.debug
            });

            return database.dropDatabase(options);

        } else {
            return true;
        }

    }

    /**
     * Carrega Schema
     *
     * @param schema
     * @param options
     */
    executeSchema(schema, options) {


        let database = new DatabaseCreator({
            debug: this.config.debug,
            logger: this.config.logger
        });

        return database.create(schema, {
            persist: options.persist,
            showSql: options.showSql
        });

    }


    /**
     * Salva Configuração da Base de Dados
     *
     * @param config
     */
    saveConfig(config) {


        this.migrationDirectory.configMigration = _.defaults(config, this.migrationDirectory.configMigration);


    }


}


module.exports = Migration;