/**
 * **Created on 18/12/16**
 *
 * lib/migration/databaseCreator.js
 * @author André Timermann <andre@andregustvo.org>
 *
 * Classe usada para gerar consultar para criação do Banco de dados
 *
 */
'use strict';

const Knex = require('knex');

const Logger = require('../util/logger');
let logger;

const UiPrompt = require('../../plugins/ui/uiPrompt');

const MigrationDirectory = require('../migrationDirectory');

const chalk = require('chalk');

const Promise = require('bluebird');

const OpearationCanceled = require('../../errors/operationCanceled');

const knexTypes = [
    'integer',
    'bigInteger',
    'text',
    'string',
    'float',
    'decimal',
    'boolean',
    'date',
    'dateYime',
    'time',
    'timestamp',
    'timestamps',
    'binary',
    'enum',
    'enu',
    'json',
    'jsonb',
    'uuid',
    'increments',
    'bigincrements'
];


class DatabaseCreator {

    constructor(config = {}) {

        this.config = config;

        logger = this.config.logger || new Logger(this.config.customLogger, 'INFO');
        logger.category = 'DatabaseCreator';


        this.ui = config.ui || new UiPrompt();

        //logger.debug(schema);

        this.migrationDirectory = new MigrationDirectory({
            logger: this.config.logger,
            ui: this.ui,
            dataPath: this.config.dataPath
        });

        this.dbConfig = this.migrationDirectory.configMigration;

        let knexConfig = {
            client: this.dbConfig.sgbd,
            connection: {
                user: this.dbConfig.user,
                password: this.dbConfig.password,
                port: this.dbConfig.port || 3306,
            },
            pool: {min: 0, max: 1}
        };

        // noDatabase diz para não conectar em um database especifico
        if (!this.config.noDatabase) {
            knexConfig.connection.database = this.dbConfig.database;
        }

        if (this.dbConfig.host) {
            knexConfig.connection.host = this.dbConfig.host;
        } else if (this.dbConfig.socketPath) {
            knexConfig.connection.socketPath = this.dbConfig.socketPath;
        }

        this.knex = Knex(knexConfig);

        this.debug = config.debug;

    }


    /**
     * Cria Base de Dados
     */
    create(schema, options = {}) {


        this.schema = schema;

        logger.info('Criando Base de Dados');

        let querys = [];

        /////////////////////////////////////////////
        // Cria querys e salva em um array (No formato Objeto, pronto para executar then)
        /////////////////////////////////////////////

        querys = querys.concat(this._createTables());
        querys = querys.concat(this._createReferences());


        /////////////////////////////////////////////
        // Executa Query
        /////////////////////////////////////////////

        // Executa Querys
        return this._execute(querys, options);


    }

    /**
     * Cria Todas as Tabelas do Schema
     *
     * @returns {Array}
     * @private
     */
    _createTables() {

        logger.debug('Criando Tabelas...');

        let querys = [];

        for (let [tableName, tableInfo] of Object.entries(this.schema)) {

            querys.push(this._createTable(tableName, tableInfo));

        }


        return querys;

    }

    /**
     * Cria Tabela e suas entidades(coluna, indice etc...)
     *
     * @param tableName {string}    Nome da Tabela
     * @param tableInfo {object}    Dados da Tabela
     * @private
     */
    _createTable(tableName, tableInfo) {

        logger.debug(`Criando tabela '${chalk.bold(tableName)}'...`);

        return this.knex.schema.createTable(tableName, table => {

            // Métodos aqui só serão chamados ao executar sql (portanto não é impresso agora)

            /////////////////////////////////////////////////////////
            // Cria Coluna
            /////////////////////////////////////////////////////////
            this._createColumns(tableName, tableInfo, table);

            /////////////////////////////////////////////////////////
            // Configura Chave Primária
            /////////////////////////////////////////////////////////

            // TODO: ATENÇÃO: Não é possível definir uma chave primaria auto increment separadamente necessário criar por fora, então um dia para salvar mais de uma chave, teremos q alterar aqui
            //t.primary(table.primaryKey.columns);


            /////////////////////////////////////////////////////////
            // Configura Indices
            /////////////////////////////////////////////////////////

            this._crateIndexes(tableName, tableInfo, table);


        });


    }


    /**
     * Cria as Colunas da tablea
     *
     * @param tableName {string}    Nome da Tabela
     * @param tableInfo {object}    Dados da Tabela
     * @param table     {object}    Objeto Knex que representa a tabela a ser criada
     * @private
     */
    _createColumns(tableName, tableInfo, table) {

        logger.debug(`Criando colunas em '${tableName}'`);


        for (let [columnName, columnInfo] of Object.entries(tableInfo.columns)) {
            this._createColumn(columnName, columnInfo, tableInfo, table);
        }


    }

    /**
     * Cria Coluna na tabela passada
     *
     * @param columnName    {string}    Nome da Coluna
     * @param columnInfo    {object}    Dados da Coluna
     * @param tableInfo     {object}    Dados da Tabela
     * @param table         {object}    Objeto Knex que representa a tabela a ser criada
     * @private
     */
    _createColumn(columnName, columnInfo, tableInfo, table) {

        let newColumn;

        logger.debug(`Criando coluna '${chalk.bold(columnName)}'...`);

        ////////////////////////////////////////////////////////////////
        // TIPO ESPECIAL PRIMARY
        ////////////////////////////////////////////////////////////////
        if (columnInfo.type === 'PRIMARY') {

            // TODO: Por padrão chave primária é auto increment, obrigatóriamente, mas pode existir casos que não será, tratar, criando um novo tipo como PRIMARY_AUTOINCRMENT ou APRIMARY


            if (tableInfo.primaryKey.indexOf(columnName) !== -1) {

                // Chave Primaria
                newColumn = table.increments(columnName);

            } else {

                // Chave Estrangeira
                newColumn = table.specificType(columnName, 'int unsigned');

            }


        }

        ////////////////////////////////////////////////////////////////
        // SE COLUNA TIVER TAMANHO
        ////////////////////////////////////////////////////////////////
        // Note que vamos criar o tipo arbitráriamente, se foi criado errado no modelo, vai falhar aqui
        else if (columnInfo.size) {

            // newColumn = this._defineKnexColumn(columnName, columnInfo.type, columnInfo.size, table);
            throw new Error('Deprectaded, defina tamanho em type. ex: STRING(23)');

        }

        ////////////////////////////////////////////////////////////////
        // SE COLUNA NÃO TIVER TANANHO
        ////////////////////////////////////////////////////////////////
        else {


            newColumn = this._defineKnexColumn(columnName, columnInfo.type, table);

        }

        ////////////////////////////////////////////////////////////////
        // NULLABLE
        ////////////////////////////////////////////////////////////////

        if (columnInfo.notNull) {
            newColumn.notNullable();
        } else {
            newColumn.nullable();

        }

        ////////////////////////////////////////////////////////////////
        // VALOR DEFAULT
        ////////////////////////////////////////////////////////////////
        // TODO: Existe os casos especiais, tratar
        // TODO: Testar com a geração do dia, pois tem gerado com aspas
        if (columnInfo.default) {

            newColumn.defaultTo(this.knex.raw(columnInfo.default));

        }


        ////////////////////////////////////////////////////////////////
        // COMENTARIO
        ////////////////////////////////////////////////////////////////
        if (columnInfo.comment) {
            newColumn.comment(columnInfo.comment);
        }


    }

    /**
     * Define uma Coluna Knex
     *
     * @param columnName
     * @param columnType
     * @param table
     * @returns {*}
     * @private
     */
    _defineKnexColumn(columnName, columnType, table) {


        ////////////////////////////////////////////////////////////
        // Verifica se Coluna é Sem Sinal
        ////////////////////////////////////////////////////////////
        let unsigned = false;

        if (columnType.match(/UNSIGNED/)) {
            columnType = columnType.replace('UNSIGNED', '');
            unsigned = true;
        }


        logger.debug(chalk.green('|-------------------------------'));
        logger.debug(chalk.green(`|Tabela: ${table._tableName}`));
        logger.debug(chalk.green(`|Coluna: ${columnName}`));
        logger.debug(chalk.green(`|Unsigned: ${unsigned}`));

        ////////////////////////////////////////////////////////////
        // Extrai Tipo e Tamanho
        ////////////////////////////////////////////////////////////
        let reType = /^\s*([A-Z]+)\s?(\(([0-9,]*)\))?/;

        let [, type, , size] = columnType.match(reType);

        logger.debug(chalk.green(`|Type: ${type}`));
        logger.debug(chalk.green(`|Size: ${size}`));

        ////////////////////////////////////////////////////////////
        // Verifica se é um tipo Embutido
        ////////////////////////////////////////////////////////////
        let searchArray = knexTypes.map(v => v.toLowerCase());

        if (searchArray.includes(type.toLowerCase())) {


            let idx = searchArray.indexOf(type.toLowerCase());

            let createFn = table[knexTypes[idx]];

            let column = size ? createFn.call(table, columnName, size) : createFn.call(table, columnName);

            logger.debug(chalk.green('|KnexType: Sim'));
            logger.debug(chalk.green('|-------------------------------'));

            return unsigned ? column.unsigned() : column;


        }
        ////////////////////////////////////////////////////////////
        // Tipo Personalizado
        ////////////////////////////////////////////////////////////
        else {

            logger.debug(chalk.green('|KnexType: Não'));
            logger.debug(chalk.green('|-------------------------------'));

            return table.specificType(columnName, columnType);

        }


    }

    /**
     * Cria Relacionamentos para a tabela
     *
     *
     * Devido a uma limitação do Knex que não permite adicionar chave estrangeira sem recriar a coluna,
     * tive que fazer este "workAround",
     * TODO: verificar se já foi atualizado: https://github.com/tgriesser/knex/issues/558
     * TODO: Funciona para mysql, outros sgbds será necessário implementar
     * TODO: Colocar este código no adapter correspondente
     *
     *
     * Precisamos criar os releacionamento depois de gerar todas as tabelas. Porém o Knex dá duas opções:
     *  - Criar o relacionamento emquanto cria a coluna (Quebra, pois a tabela referenciada pode não ter sido criado ainda)
     *
     *  - Alterar a tabela: Porém o knex tenta criar a coluna denovo (não sei pq, é um bug).
     *
     *  Vamos então usar o knex para criar o SQL de alteração de tabela, mas depois de gerado vamos cortar o fora o trecho
     *  que tenta recriar a Coluna, para isso vamos usar uma expressão regular
     *
     *  Aproveitando, o knex não suporta o nome personalizado de relacionamento, vamos adicionar este suporte (acompanhe)
     *
     *  Podemos usar o Knex para gerar as consultas e executa-las imediatamente, mas neste caso vamos fazer diferente:
     *  - Mandamos o Knex gerar as consultas
     *  - Em vez de executar, vamos pegar essas consultas
     *  - Processa-las
     *
     * @private
     */
    _createReferences() {

        logger.debug('Criando Relacionamentos...');


        let querys = [];

        for (let [tableName, tableInfo] of Object.entries(this.schema)) {


            logger.debug(`Criando Relacionamento na tabela '${tableName}'`);


            /////////////////////////////////////////////////////////////////////////////////////
            // Vamos Iniciar o processo de alteração de tabela
            /////////////////////////////////////////////////////////////////////////////////////

            let alterTable = this._alterTableWithReferences(tableName, tableInfo);


            /////////////////////////////////////////////////////////////////////////////////////
            // Gera RELACIONAMENTO
            /////////////////////////////////////////////////////////////////////////////////////

            // Aqui é o pulo do gato, vamos percorrer todas as linhas geradas pelo knex (toString), e vamos descrtar as
            // linhas que cria a coluna (vamos ficar apenas com as consultas q iniciam com alter table)

            // Aproveitando vamos dividir a consulta em 7 pedaços:
            // Pedaço 1: Inicio da Consulta
            // Pedaço 2: Nome do relacionamento que o knex gerou que não queremos (vamos jogar fora esse pedaço)
            // Pedaço 3: Parte do meio da consulta
            // Pedaço 4: O nosso curinga, que vamos usar para a expressão regular encontrar o nome desejado (vamos jogar fora este pedaço)
            // Pedaço 5: O nome que queremos para o relacionamento
            // Pedaço 6: O outro curinga q delimita o nome desejado (vamos jogar fora este pedaço)
            // Pedaço 7: O restante da consulta

            // Agora vamos juntar as partes: Pedaços: 1(inicio) + 5(nome desejado) + 3(meio) + 7(fim)


            let reWorkAround = /^(alter table `\w+` add constraint `?)(\w+)(`? foreign key.*)(\|)([\w]+)(\|)(.*)$/;

            for (let line of alterTable.toString().split('\n')) {
                let match = line.match(reWorkAround);


                if (match) {

                    let newQuery = `${match[1]}${match[5]}${match[3]}${match[7]}`;
                    querys.push(this.knex.raw(newQuery));

                }
            }


        }

        return querys;

    }


    /**
     * Aqui vamos Configurar o para ALTERAR uma tabela com relacionamento.
     *
     * @param tableName
     * @param tableInfo
     * @returns {*|{width, height}}
     * @private
     */
    _alterTableWithReferences(tableName, tableInfo) {

        // Vamos dizer oa knex que queremos alterar uma nova tabela já existente (veja q estamos usando um schema pronto)
        return this.knex.schema.table(tableName, table => {

            // Vamos Percorrer todos os relacionamentos do nosso modelo(vindo dos parãmetros)
            for (let [relationName, relationInfo] of Object.entries(tableInfo.relations)) {


                // Vamos dizer ao knex que queremos criar uma nova coluna (lembre q o knex não permite alterar o
                // relacionamento sem estar criando uma nova coluna)
                let alterColumn = table
                    .specificType(relationInfo.foreignKey, 'int unsigned')
                    // Já aproveitamos e configuramos o relacionamento
                    .references(relationInfo.referenceKey)
                    // Note q o Knex não permite dizer o nome do relacionamento, então vou  injetar o nome depois
                    // do nome ta tabela referenciada, envolta de "|" vamos usar esse simbolo para extrair depois
                    // com regex
                    .inTable(relationInfo.referenceTable + '|' + relationName + '|');


                // COnfiguramos ondelete nesse relacionamento
                if (relationInfo.onDelete) {
                    alterColumn.onDelete(relationInfo.onDelete);
                }

                // COnfiguramos ondelete nesse relacionamento
                if (relationInfo.onUpdate) {
                    alterColumn.onUpdate(relationInfo.onUpdate);
                }

            }


        });

    }


    /**
     * Executa Querys
     *
     * @param querys
     * @param options
     * @private
     */
    _execute(querys, options) {


        let q = [];
        //
        // querys.unshift(this.knex.raw('CREATE DATABASE teste'));
        // querys.unshift(this.knex.raw('DROP DATABASE teste'));

        for (let query of querys) {
            q.push({
                query: query,
                sql: query.toString() + ';'
            });
        }


        return Promise
            .each(q, query => {


                if (options.showSql || this.debug) {
                    console.log(query.sql);
                } else {
                    process.stdout.write('.');
                }

                if (options.persist) {

                    return Promise.resolve()
                        .then(() => {

                            if (this.debug) {
                                return this.ui.confirm('Executar?');
                            } else {
                                return true;
                            }

                        })
                        .then(confirm => {

                            if (confirm) {
                                return query.query;
                            } else {
                                throw new OpearationCanceled('Operação Cancelada');
                            }

                        });

                }


            })
            .then(() => {

                console.log();
                // Desconecta (Destroi todos os pools)
                return this.knex.destroy();

            })

            .catch(err => {
                console.log();
                return this.knex.destroy()
                    .then(() => {
                        logger.error(chalk.red.bold(err.message));
                        throw new OpearationCanceled('Operação Cancelada por erro');


                    });
            });


    }

    /**
     * Remove e Recria Base de dados
     *
     *
     * @param options
     */
    dropDatabase(options) {


        if (options.persist) {

            if (this.dbConfig.sgbd === 'mysql') {

                logger.debug('Recriando Base de Dados');


                // Verifica se Base de Dados Existe

                logger.info(`Verificando se database '${this.dbConfig.database}' existe...`);

                return Promise.resolve()

                    .then(() => {

                        if (this.debug) {
                            console.log('SHOW DATABASES');
                            console.log(`DROP DATABASE \`${this.dbConfig.database}\``);
                            console.log(`CREATE DATABASE \`${this.dbConfig.database}\``);
                            return this.ui.confirm('Executar?');
                        } else {
                            return true;
                        }


                    })

                    .then(confirm => {

                        if (confirm) {
                            return this.knex.raw('SHOW DATABASES');
                        } else {
                            throw new OpearationCanceled('Operação Cancelada');
                        }

                    })
                    .then(result => {

                        for (let row of result[0]) {
                            if (row.Database == this.dbConfig.database) {
                                return true;
                            }
                        }

                        return false;


                    })

                    // Remove Base de Dados
                    .then(databaseExist => {

                        if (databaseExist) {

                            logger.info('Database Existe, removendo...');
                            return this.knex.raw(`DROP DATABASE \`${this.dbConfig.database}\``);
                        } else {

                            logger.info('Base de Dados Não Existe');
                            return true;
                        }

                    })

                    // Cria Base de Dados
                    .then(() => {

                        logger.info(`Recriando database '${this.dbConfig.database}'...`);
                        return this.knex.raw(`CREATE DATABASE \`${this.dbConfig.database}\``);

                    })

                    .then(() => {
                        // Desconecta (Destroi todos os pools)
                        return this.knex.destroy();

                    })

                    .catch(err => {
                        return this.knex.destroy()
                            .then(() => {
                                logger.error(chalk.red.bold(err.message));
                                throw new OpearationCanceled('Operação Cancelada por erro');
                            });
                    });

            } else {

                throw new Error(`SGBD '${this.dbConfig.sgbd}' não suportado para CREATE/DROP DATABASE`);
            }
        }


    }

    /**
     * Cria Indices
     *
     * @param tableName
     * @param tableInfo
     * @param table
     * @private
     */
    _crateIndexes(tableName, tableInfo, table) {

        logger.debug(`Criando colunas em '${tableName}'`);


        for (let [indexName, indexInfo] of Object.entries(tableInfo.indexes)) {
            this._createIndex(indexName, indexInfo, tableInfo, table);
        }

    }

    /**
     * Cria Indice
     *
     * @param indexName
     * @param indexInfo
     * @param tableInfo
     * @param table
     * @private
     */
    _createIndex(indexName, indexInfo, tableInfo, table) {

        if (indexInfo.type === 'unique index') {

            table.unique(indexInfo.columns, indexName);


        } else {

            //TODO: Quando for gerar um indice verificar a forma correta, na documentação diz de uma forma, no fonte outro, testar
            // Problema está no indexName, se vc passar errado ele vai gerar um nome muito grande q vai estourar o limite do mysql
            //t.index(index.columns, index.type);
            table.index(indexInfo.columns, indexName);

            throw new Error('Não testado para outros indices, testar e fazer ajustes se necessário');
        }

    }
}


module.exports = DatabaseCreator;