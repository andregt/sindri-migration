/**
 * **Created on 14/12/16**
 *
 * <File Reference Aqui: schemaValidator>
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

const Logger = require('../../util/logger');

// Logger Padrão
let logger = new Logger();
logger.category = 'SchemaValidator';

//TODO: Substituir color por chalk
require('colors');

let _ = require('lodash');


const validKnexTypes = [
    'primary', // Não é do Knex, mas é usado internamente
    'integer',
    'bigInteger',
    'text',
    'string',
    'float',
    'decimal',
    'boolean',
    'date',
    'dateTime',
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
    'bigIncrements'
];

// TODO: Atenção, só para MYSQL, No Knexjs só postgres aceita este parâmetro, validar se der problema
const typesAllow = [
    'unique index',
    'fulltext index',
    'spatial index',
    'index'
];


class SchemaValidator {

    constructor(schemas) {

        this.schemas = schemas;

        this.validateResult = {
            error: [],
            warn: [],
            info: []
        };

        // Lista de indices para validar indices duplicados
        this.indexesList = [];

        // Lista de relacionamentos para validar relacionamentos duplicados
        this.relationList = [];



    }

    /**
     * Valida Schema
     */
    validate() {

        for (let [tableName, tableInfo] of Object.entries(this.schemas)) {
            this._validateTable(tableName, tableInfo);
        }

        return this.validateResult;


    }


    /**
     * Valida Tabela Especifica
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validateTable(tableName, tableInfo) {

        logger.info(`Validando tabela '${tableName}'`);
        // logger.trace(tableInfo);

        this._validatePrimaryKey(tableName, tableInfo);
        this._validateColumns(tableName, tableInfo);
        this._validateTableNameAndRelations(tableName, tableInfo);
        this._validateIndexes(tableName, tableInfo);
        this._validateRelations(tableName, tableInfo);

    }

    /**
     * Valida Chave Primária
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validatePrimaryKey(tableName, tableInfo) {

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Valida Se Chave Primária Existe e se é apenas 1 (Sem suporta a mais de uma chave primaria por enquanto)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        if (!tableInfo.primaryKey) {
            this.validateResult.error.push(`Na tabela '${tableName.bold}' a chave não foi definida!`);
        }

        if (tableInfo.primaryKey && tableInfo.primaryKey.length !== 1) {
            this.validateResult.error.push(`Na tabela '${tableName.bold}' apenas uma chave primária!`);
        }


        if (tableInfo.primaryKey && tableInfo.primaryKey.length === 1) {

            let primaryKey = tableInfo.primaryKey[0];


            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Valida Se Chave Primária está com nome correto
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            if (primaryKey !== `${tableName}_id`) {
                this.validateResult.warn.push(`Na tabela '${tableName.bold}' chave primária deve se chamar: '${(tableName + '_id').bold}'!`);
            }

            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Valida Se Chave Primária está com tipo Correto
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            if (!tableInfo.columns[primaryKey]) {
                this.validateResult.error.push(`Na tabela '${tableName.bold}', a chave primária definida '${primaryKey.bold}' não existe!`);
            }

            else if (tableInfo.columns[primaryKey].type !== 'PRIMARY') {
                this.validateResult.warn.push(`Na tabela '${tableName.bold}' chave primária deve ser do tipo: 'PRIMARY' e não '${tableInfo.columns[primaryKey].type.bold}'!`);
            }


        }


    }

    /**
     * Valida Colunas
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validateColumns(tableName, tableInfo) {

        /////////////////////////////////////////////
        // Verififica se foi definido Colunas
        /////////////////////////////////////////////
        if (!tableInfo.columns) {
            this.validateResult.error.push(`Colunas não defindas na tabela '${tableName.bold}'. Verifique o atributo ${'columns'.bold}!`);
            return;
        }


        /////////////////////////////////////////////
        // Verififica se foi definido Colunas
        /////////////////////////////////////////////
        if (tableInfo.columns.length == 0) {
            this.validateResult.error.push(`Não foi definido colunas na tabela '${tableName.bold}'`);

        }

        let hasAtivo = false;
        let hasRemovido = false;
        let hasDataCadastro = false;


        /////////////////////////////////////////////
        // Valida Colunas
        /////////////////////////////////////////////

        for (let [columnName, column] of Object.entries(tableInfo.columns)) {


            /////////////////////////////////////////////
            // Valida Se Tipo foi definido
            /////////////////////////////////////////////
            if (!column.type) {
                this.validateResult.error.push(`Não foi definido tipo na coluna '${columnName.bold}' da tabela '${tableName.bold}'`);
            } else {

                let type = column.type;

                type = type.replace(/\(\d*\)/, '');

                /////////////////////////////////////////////
                // WARN: Valida se Tipo está em maiusculo
                /////////////////////////////////////////////
                let reType = /^[A-Z\s]+$/;
                if (!type.match(reType)) {
                    this.validateResult.warn.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', o tipo '${type.bold}' deve estar em maiúsculo!`);
                }


                /////////////////////////////////////////////////////
                // ERROR: Verifica se foi definido um PRIMARY para um campo que não é uma chave
                /////////////////////////////////////////////////////

                if (type === 'PRIMARY') {

                    let found = false;

                    // Verifica se é chave primária
                    if (_.includes(tableInfo.primaryKey, columnName)) {
                        found = true;
                    }

                    // Verifica se é uma chave estrangeira
                    _.each(tableInfo.relations, (relation) => {

                        if (columnName === relation.foreignKey) {
                            found = true;
                        }

                    });


                    if (!found) {
                        this.validateResult.error.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', o tipo 'PRIMARY', só deve ser usado em chave primária ou chave estrangeira!`);
                    }


                }

                /////////////////////////////////////////////
                // Alerta se estiver usando um tipo não suportado pelo Knex
                /////////////////////////////////////////////
                let typeLower = type.toLowerCase();
                if (!_.includes(validKnexTypes, typeLower)) {

                    this.validateResult.info.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', você está usando um tipo não padrão: '${typeLower.bold}'. Para manter compatibilidade entre diversos SGBDs na hora de gerar a base de dados, use um dos seguintes tipos: '${validKnexTypes.join(', ').bold}'. Verifique a documentação do KnexJs!\n`);

                }


            }

            /////////////////////////////////////////////
            // Valida se está no formato em CamelCase, exceto quando for uma chave (Campo PRIMARY KEY)
            /////////////////////////////////////////////
            let reCamelCase = /^[a-z][a-zA-Z0-9]*[a-z0-9]$/;
            if (!columnName.match(reCamelCase)) {

                // Se for PRIMARY, significa q é um indice, então tudo bem
                if (column.type !== 'PRIMARY') {
                    this.validateResult.warn.push(`A Coluna '${columnName.bold}' da tabela '${tableName.bold}', não está no formato camelCase!`);
                }

            }

            /////////////////////////////////////////////////////
            // INFO: Campos Recomendados
            /////////////////////////////////////////////////////
            if (_.includes(['ativo', 'status', 'active'], columnName)) {
                hasAtivo = true;
            }

            if (_.includes(['removido', 'deleted', 'apagado'], columnName)) {
                hasRemovido = true;
            }

            if (_.includes(['dataCadastro', 'created_at', 'updated_at', 'dataAtualizado'], columnName)) {
                hasDataCadastro = true;
            }


        }

        /////////////////////////////////////////////////////
        // INFO: Verifica se tem coluna status ou dataCadastro
        /////////////////////////////////////////////////////
        if (!hasAtivo && tableName.indexOf('__') === -1) {
            this.validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${'\'ativo\', \'status\' ou \'active\''.bold} !`);
        }

        if (!hasRemovido && tableName.indexOf('__') === -1) {
            this.validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${'\'removido\', \'deleted\' ou \'apagado\''.bold} !`);
        }

        if (!hasDataCadastro && tableName.indexOf('__') === -1) {
            this.validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${'\'dataCadastro\', \'created_at\', \'updated_at\' ou \'dataAtualizado\''.bold} !`);
        }


    }

    /**
     *  Valida Nome de Tabelas e Relacionamentos
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validateTableNameAndRelations(tableName, tableInfo) {


        let reCamelCase = /^[a-z][a-zA-Z0-9]*[a-z0-9]$/;


        ///////////////////////////////////////////////////////
        // WARN: Valida se nome da tabela está em camelCase
        ///////////////////////////////////////////////////////
        if (!tableName.match(reCamelCase)) {

            ////////////////////////////////////////////////////////////////////////////////
            // Se não está em camelCase significa q deve ser um relacionamento
            ////////////////////////////////////////////////////////////////////////////////
            if (tableName.indexOf('__') !== -1) {

                let s = tableName.split('__');
                let tableA = s[0];
                let tableB = s[1];

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica se Tabela A existe
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                if (!_.has(this.schemas, tableA)) {
                    this.validateResult.warn.push(`Tabela ${tableA.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`);
                }

                if (!_.has(this.schemas, tableA)) {
                    this.validateResult.warn.push(`Tabela ${tableB.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`);
                }


                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica Colunas
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                let targetA = tableA + '_id',
                    targetB = tableB + '_id',
                    targetAFound = false,
                    targetBFound = false;

                _.forIn(tableInfo.columns, (column, columnName) => {

                    if (columnName === targetA) {
                        targetAFound = true;
                    }

                    if (columnName === targetB) {
                        targetBFound = true;
                    }

                });

                if (!targetAFound) {
                    this.validateResult.warn.push(`Tabela '${tableName.bold}' deve ter a coluna '${targetA.bold}'`);
                }

                if (!targetBFound) {
                    this.validateResult.warn.push(`Tabela '${tableName.bold}' deve ter a coluna '${targetB.bold}'`);
                }


                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica INDICE UNICO
                ////////////////////////////////////////////////////////////////////////////////////////////////////
                let indexTarget = 'idx_' + tableA + '__' + tableB;
                let indexTargetFound = false;


                _.each(tableInfo.indexes, (index, indexName) => {

                    if (indexName === indexTarget) {
                        indexTargetFound = true;

                        // Verifica as colunas
                        if (!_.includes(index.columns, targetA)) {
                            this.validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ter a coluna '${targetA.bold}'`);
                        }

                        if (!_.includes(index.columns, targetB)) {
                            this.validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ter a coluna '${targetB.bold}'`);
                        }

                        // Verifica se é indice unico
                        if (index.type != 'unique index') {
                            this.validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ser do tipo '${('unique index'.bold)}'`);
                        }

                    }


                });


                if (!indexTargetFound) {
                    this.validateResult.warn.push(`Tabela '${tableName.bold}' deve ter o índice único com nome  '${indexTarget}'`);
                }

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica RELACIONAMENTOS
                ////////////////////////////////////////////////////////////////////////////////////////////////////
                let targetRelationA = 'fk_' + tableA + '___' + tableName,
                    targetRelationB = 'fk_' + tableB + '___' + tableName,
                    targetRelationAFound = false,
                    targetRelationBFound = false;

                _.forIn(tableInfo.relations, (relation, relationName) => {

                    if (relationName === targetRelationA) {
                        targetRelationAFound = true;

                        if (relation.foreignKey !== targetA) {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', foreignKey deve ser '${targetA.bold}'`);
                        }

                        if (relation.referenceKey !== targetA) {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', referenceKey deve ser '${targetA.bold}'`);
                        }


                        // Verifica onDelete
                        if (!relation.onDelete || relation.onDelete != 'CASCADE') {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', deve ser '${'ON DELETE CASCADE'.bold}'`);
                        }


                    }

                    if (relationName === targetRelationB) {
                        targetRelationBFound = true;

                        if (relation.foreignKey !== targetB) {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', foreignKey deve ser '${targetA.bold}'`);
                        }

                        if (relation.referenceKey !== targetB) {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', referenceKey deve ser '${targetB.bold}'`);
                        }


                        // Verifica onDelete
                        if (!relation.onDelete || relation.onDelete != 'CASCADE') {
                            this.validateResult.warn.push(`A chave estrangeira '${targetRelationB.bold}' na tabela '${tableName.bold}', deve ser '${'ON DELETE CASCADE'.bold}'`);
                        }


                    }


                });

                if (!targetRelationAFound) {
                    this.validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com nome '${targetRelationA.bold}'`);
                }

                if (!targetRelationBFound) {
                    this.validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com nome '${targetRelationB.bold}'`);
                }


            }

            ////////////////////////////////////////////////////////////////////////////////
            // Relacionamento simples OneToMany
            ////////////////////////////////////////////////////////////////////////////////
            else if (tableName.indexOf('_') !== -1) {

                let s = tableName.split('_');
                let tableA = s[0];

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica se Tabela A existe
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                if (!_.has(this.schemas, tableA)) {
                    this.validateResult.warn.push(`Tabela ${tableA.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`);
                }

                if (tableInfo.relations.length === 0) {
                    this.validateResult.warn.push(`Tabela ${tableA.bold} deve ter alguma chave estrangeira!`);
                }


                let found = false;

                _.forIn(tableInfo.relations, relation => {

                    if (relation.referenceTable === tableA) {
                        found = true;
                    }

                });

                if (!found) {
                    this.validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com a tabela '${tableA.bold}'`);
                }


            }
            else {

                this.validateResult.warn.push(`Nome da tabela '${tableName.bold}' deve estar no formato camelCase`);

            }
        }


    }


    /**
     * Valida Indices
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validateIndexes(tableName, tableInfo) {


        _.forIn(tableInfo.indexes, (index, indexName) => {

            /////////////////////////////////////////////////////
            // WARN: Valida se index está com nome correto : idx_[nome_tabela][OPCIONAL]
            /////////////////////////////////////////////////////
            let target = 'idx_' + tableName;
            let targetSize = target.length;

            let targetE = 'idx_' + tableName + '_';

            if (indexName.substring(0, targetSize) !== target) {
                this.validateResult.warn.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' deve começar com '${target.bold}'`);

            }

            // Se o nome do indice for mais complexo, deve ter _ separando
            if (indexName.length > targetSize && indexName.substring(0, targetSize + 1) !== targetE) {
                this.validateResult.warn.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' deve ter um separador '_'`);

            }

            /////////////////////////////////////////////////////
            // ERROR: Valida se os campos especificado no indice existem
            // parse_dia_sql já faz a validação e não adiciona o campo
            /////////////////////////////////////////////////////


            _.each(index.columns, indexColumn => {

                let found = false;

                _.forIn(tableInfo.columns, (column, columnName) => {

                    if (columnName === indexColumn) {
                        found = true;
                    }

                });

                if (!found) {
                    this.validateResult.warn.push(`Coluna '${indexColumn.bold}' do índice '${indexName.bold}', da tabela '${tableName.bold}' não foi encontrado!`);
                }

            });


            /////////////////////////////////////////////////////
            // Verifica se foi definido tipo do indice
            /////////////////////////////////////////////////////
            if (!index.type) {
                this.validateResult.error.push(`Índice '${indexName.bold}', da tabela '${tableName.bold}' não tem tipo definido`);
            }


            /////////////////////////////////////////////////////
            // Valida se o tipo é válido: UNIQUE e (pesquisar os tipos possíveis)
            // validado pelo parse_dia_sql, não carrega se tiver errado
            // TODO: Atenção, só para MYSQL, No Knexjs só postgres aceita este parâmetro, validar se der problema
            /////////////////////////////////////////////////////
            if (index.type && !_.includes(typesAllow, index.type)) {
                this.validateResult.error.push(`Índice '${indexName.bold}', da tabela '${tableName.bold}' está com tipo inválido ('${index.type.bold}'), deve ser: '${typesAllow.join(', ').bold}'`);

            }

            /////////////////////////////////////////////////////
            //- ERROR: Verifica se indice já existe
            /////////////////////////////////////////////////////

            if (_.includes(this.indexesList, indexName)) {
                this.validateResult.error.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' já existe`);
            }

            this.indexesList.push(indexName);


        });


    }


    /**
     * Valida Restrições e relacionamento
     *
     * @param tableName
     * @param tableInfo
     * @private
     */
    _validateRelations(tableName, tableInfo) {


        _.forIn(tableInfo.relations, (relation, relationName) => {


            ////////////////////////////////////////////////
            // WARN: valida se o nome está no formato fk_[tabela1]_ _ _[tabela2]_[OPCIONAL]
            ////////////////////////////////////////////////

            let targetName = 'fk_' + relation.referenceTable + '___' + tableName;
            let targetNameE = 'fk_' + relation.referenceTable + '___' + tableName + '_';
            let targetSize = targetName.length;


            if (relationName.substring(0, targetSize) !== targetName) {
                this.validateResult.warn.push(`ForeingKey '${relationName}' da tabela '${tableName.bold}' deve ter o nome iniciado com '${targetName.bold}'!`);

            }


            // Se o nome do indice for mais complexo, deve ter _ separando
            if (relationName.length > targetSize && relationName.substring(0, targetSize + 1) !== targetNameE) {
                this.validateResult.warn.push(`ForeingKey '${relationName.bold}' da tabela '${tableName.bold}' deve ter o nome iniciado com '${targetNameE.bold}' e separador '_'!`);

            }


            ////////////////////////////////////////////////
            // ERRO: Valida se referenceTable existe
            ////////////////////////////////////////////////


            if (!_.has(this.schemas, relation.referenceTable)) {

                this.validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma tabela que não existe: '${relation.referenceTable.bold}'!`);


            } else {

                ////////////////////////////////////////////////
                //- ERRO: Valida se referenceKey existe na tabela remota
                ////////////////////////////////////////////////

                let found = false;
                _.forIn(this.schemas[relation.referenceTable].columns, (column, columnName) => {

                    if (relation.referenceKey === columnName) {
                        found = true;
                        return false;
                    }

                });


                if (!found) {
                    this.validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma coluna na tabela '${relation.referenceTable.bold}' que não existe: '${relation.referenceKey.bold}'!`);

                }

                ////////////////////////////////////////////////
                // ERRO: Valida se foreignKey existe localmente
                ////////////////////////////////////////////////

                found = false;

                _.forIn(tableInfo.columns, (column, columnName) => {

                    if (relation.foreignKey === columnName) {
                        found = true;

                        // Valida se é do tipo primary
                        if (column.type !== 'PRIMARY') {
                            this.validateResult.warn.push(`Coluna '${columnName.bold}' da tabela '${tableName.bold}' deve ser do tipo '${'PRIMARY'.bold}' e não '${column.type.bold}', pois pertence a chave estrangeira!`);
                        }

                        return false;
                    }

                });


                if (!found) {
                    this.validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma coluna que não existe: '${relation.foreignKey.bold}'!`);
                }

            }

            /////////////////////////////////////////////////////
            //ERROR: Verifica se restrição já existe
            /////////////////////////////////////////////////////

            if (_.includes(this.relationList, relationName)) {
                this.validateResult.error.push(`Relacionamento '${relationName.bold}' da tabela '${tableName.bold}' já existe`);
            }

            this.relationList.push(relationName);

        });

    }


    /**
     * Caso Usuario deseja um log personalizado Ex: Interface gráfica
     *
     * @param customLogger
     */
    static set logger(customLogger) {

        logger = new Logger(customLogger);
        logger.category = 'SchemaValidator';

    }

    static validate(schema) {

        logger.info('Iniciando Validação do Schema');

        let validator = new SchemaValidator(schema);

        return validator.validate();


    }

}


module.exports = SchemaValidator;