/**
 * **Created on 07/07/16**
 *
 * Classe Estática para Validação de Schemas do Sindri
 *
 * lib/schemaValidation.js
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

const _ = require('lodash');

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

const inquirer = require('inquirer');

class SchemaValidation {


    /**
     * Valida Schema, verifica se está seguindo padrões e se existem erros
     *
     * A Meta aqui é nunca dar erro ao criar um novo banco de dados, se der erro é pq a validação falhou
     *
     * @param schema
     */
    static validateSchema(schema) {

        let self = this;

        let validateResult = {
            error: [],
            warn: [],
            info: []
        };

        // Lista de indices para validar indices duplicados
        let indexesList = [];

        // Lista de relacionamentos para validar relacionamentos duplicados
        let relationList = [];


        _.forIn(schema, function (table, tableName) {

            self._validateTable(schema, table, tableName, validateResult, indexesList, relationList);

        });

        _.each(validateResult.error, (msg) => console.log(msg.red));

        _.each(validateResult.warn, (msg) => console.log(msg.yellow));

        if (validateResult.error.length === 0) {
            _.each(validateResult.info, (msg) => console.log(msg.green));
        }

        /////////////////////////////////////////////////
        // ERROR
        /////////////////////////////////////////////////
        if (validateResult.error.length > 0) {
            return false;
        }

        /////////////////////////////////////////////////
        // WARNING
        /////////////////////////////////////////////////
        if (validateResult.warn.length > 0) {

            return inquirer.prompt([{
                type: 'confirm',
                name: 'continue',
                default: false,
                message: 'Foram encontrados possíveis problemas no seu esquema. Deseja Continuar?'
            }]).then(function (result) {

                return result.continue;

            });

        } else {

            return inquirer.prompt([{
                type: 'confirm',
                name: 'continue',
                default: true,
                message: 'Validação finalizada! criar nova migração agora?'
            }]).then(function (result) {

                return result.continue;

            });
        }


    }


    /**
     * Valida Tabela
     *
     * @param schema
     * @param tableInfo
     * @param tableName
     * @param validateResult
     * @private
     */
    static _validateTable(schema, tableInfo, tableName, validateResult, indexesList, relationList) {


        let self = this;

        //////////////////////////////////////////////////////////////////////
        // Valida Chave Primária
        //////////////////////////////////////////////////////////////////////
        self._validatePrimaryKey(tableInfo, tableName, validateResult);

        //////////////////////////////////////////////////////////////////////
        // Valida Colunas
        //////////////////////////////////////////////////////////////////////
        self._validateColumns(tableInfo, tableName, validateResult);

        //////////////////////////////////////////////////////////////////////
        // Valida Nome de Tabela e Relacionamentos
        //////////////////////////////////////////////////////////////////////
        self._validateTableNameAndRelations(tableInfo, tableName, validateResult, schema);

        //////////////////////////////////////////////////////////////////////
        // Valida Indices
        //////////////////////////////////////////////////////////////////////
        self._validateIndexes(tableInfo, tableName, validateResult, indexesList);


        //////////////////////////////////////////////////////////////////////
        // Valida Restrições
        //////////////////////////////////////////////////////////////////////
        self._validateRelations(tableInfo, tableName, validateResult, relationList, schema);


    }

    /**
     * Valida Chave Primária
     *
     * @param tableInfo
     * @param tableName
     * @param validateResult
     */
    static _validatePrimaryKey(tableInfo, tableName, validateResult) {

        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Valida Se Chave Primária Existe e se é apenas 1 (Sem suporta a mais de uma chave primaria por enquanto)
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


        if (!tableInfo.primaryKey) {
            validateResult.error.push(`Na tabela '${tableName.bold}' a chave não foi definida!`);
        }

        if (tableInfo.primaryKey && tableInfo.primaryKey.length !== 1) {
            validateResult.error.push(`Na tabela '${tableName.bold}' deve existir uma e apenas uma chave primária!`);
        }


        if (tableInfo.primaryKey && tableInfo.primaryKey.length === 1) {

            let primaryKey = tableInfo.primaryKey[0];


            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Valida Se Chave Primária está com nome correto
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            if (primaryKey !== `${tableName}_id`) {
                validateResult.warn.push(`Na tabela '${tableName.bold}' chave primária deve se chamar: '${(tableName + '_id').bold}'!`);
            }

            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Valida Se Chave Primária está com tipo Correto
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

            if (!tableInfo.columns[primaryKey]) {
                validateResult.error.push(`Na tabela '${tableName.bold}', a chave primária definida '${primaryKey.bold}' não existe!`);
            }

            else if (tableInfo.columns[primaryKey].type !== 'PRIMARY') {
                validateResult.warn.push(`Na tabela '${tableName.bold}' chave primária deve ser do tipo: 'PRIMARY' e não '${tableInfo.columns[primaryKey].type.bold}'!`);
            }


        }

    }

    /**
     * Valida Colunas
     * @param tableInfo
     * @param tableName
     * @param validateResult
     *
     * @private
     */
    static _validateColumns(tableInfo, tableName, validateResult) {

        /////////////////////////////////////////////
        // Verififica se foi definido Colunas
        /////////////////////////////////////////////
        if (tableInfo.columns.length == 0) {
            validateResult.error.push(`Não foi definido colunas na tabeça '${tableName.bold}'`);

        }

        let hasAtivo = false;
        let hasRemovido = false;
        let hasDataCadastro = false;


        /////////////////////////////////////////////
        // Valida Colunas
        /////////////////////////////////////////////
        _.each(tableInfo.columns, function (column, columnName) {


            /////////////////////////////////////////////
            // Valida Se Tipo foi definido
            /////////////////////////////////////////////
            if (!column.type) {
                validateResult.error.push(`Não foi definido tipo na coluna '${columnName.bold}' da tabela '${tableName.bold}'`);
            } else {

                let type = column.type;

                type = type.replace(/\(\d*\)/, '');

                /////////////////////////////////////////////
                // WARN: Valida se Tipo está em maiusculo
                /////////////////////////////////////////////
                let reType = /^[A-Z\s]+$/;
                if (!type.match(reType)) {
                    validateResult.warn.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', o tipo '${type.bold}' deve estar em maiúsculo!`)
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
                    _.each(tableInfo.relations, function (relation, relationName) {

                        if (columnName === relation.foreignKey) {
                            found = true;
                        }

                    });


                    if (!found) {
                        validateResult.error.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', o tipo 'PRIMARY', só deve ser usado em chave primária ou chave estrangeira!`)
                    }


                }

                /////////////////////////////////////////////
                // Alerta se estiver usando um tipo não suportado pelo Knex
                /////////////////////////////////////////////
                let typeLower = type.toLowerCase();
                if (!_.includes(validKnexTypes, typeLower)) {

                    validateResult.info.push(`Na Coluna '${columnName.bold}' da tabela '${tableName.bold}', você está usando um tipo não padrão: '${typeLower.bold}'. Para manter compatibilidade entre diversos SGBDs na hora de gerar a base de dados, use um dos seguintes tipos: '${validKnexTypes.join(', ').bold}'. Verifique a documentação do KnexJs!`)

                }


            }

            /////////////////////////////////////////////
            // Valida se está no formato em CamelCase, exceto quando for uma chave (Campo PRIMARY KEY)
            /////////////////////////////////////////////
            let reCamelCase = /^[a-z][a-zA-Z0-9]*[a-z0-9]$/;
            if (!columnName.match(reCamelCase)) {

                // Se for PRIMARY, significa q é um indice, então tudo bem
                if (column.type !== 'PRIMARY') {
                    validateResult.warn.push(`A Coluna '${columnName.bold}' da tabela '${tableName.bold}', não está no formato camelCase!`)
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


        });

        /////////////////////////////////////////////////////
        // INFO: Verifica se tem coluna status ou dataCadastro
        /////////////////////////////////////////////////////
        if (!hasAtivo && tableName.indexOf("__") === -1) {
            validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${"'ativo', 'status' ou 'active'".bold} !`)
        }

        if (!hasRemovido && tableName.indexOf("__") === -1) {
            validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${"'removido', 'deleted' ou 'apagado'".bold} !`)
        }

        if (!hasDataCadastro && tableName.indexOf("__") === -1) {
            validateResult.info.push(`Na tabela '${tableName.bold}', recomenda-se criar a coluna ${"'dataCadastro', 'created_at', 'updated_at' ou 'dataAtualizado'".bold} !`)
        }


    }

    /**
     * Valida Nome de Tabelas e Relacionamentos
     *
     * @param tableInfo
     * @param tableName
     * @param validateResult
     *
     * @param schema
     * @private
     */
    static _validateTableNameAndRelations(tableInfo, tableName, validateResult, schema) {

        let reCamelCase = /^[a-z][a-zA-Z0-9]*[a-z0-9]$/;


        ///////////////////////////////////////////////////////
        // WARN: Valida se nome da tabela está em camelCase
        ///////////////////////////////////////////////////////
        if (!tableName.match(reCamelCase)) {

            ////////////////////////////////////////////////////////////////////////////////
            // Se não está em camelCase significa q deve ser um relacionamento
            ////////////////////////////////////////////////////////////////////////////////
            if (tableName.indexOf("__") !== -1) {

                let s = tableName.split("__");
                let tableA = s[0];
                let tableB = s[1];

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica se Tabela A existe
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                if (!_.has(schema, tableA)) {
                    validateResult.warn.push(`Tabela ${tableA.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`)
                }

                if (!_.has(schema, tableA)) {
                    validateResult.warn.push(`Tabela ${tableB.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`)
                }


                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica Colunas
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                let targetA = tableA + '_id',
                    targetB = tableB + '_id',
                    targetAFound = false,
                    targetBFound = false;

                _.forIn(tableInfo.columns, function (column, columnName) {

                    if (columnName === targetA) {
                        targetAFound = true;
                    }

                    if (columnName === targetB) {
                        targetBFound = true;
                    }

                });

                if (!targetAFound) {
                    validateResult.warn.push(`Tabela '${tableName.bold}' deve ter a coluna '${targetA.bold}'`);
                }

                if (!targetBFound) {
                    validateResult.warn.push(`Tabela '${tableName.bold}' deve ter a coluna '${targetB.bold}'`);
                }


                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica INDICE UNICO
                ////////////////////////////////////////////////////////////////////////////////////////////////////
                let indexTarget = "idx_" + tableA + "__" + tableB;
                let indexTargetFound = false;


                _.each(tableInfo.indexes, function (index, indexName) {

                    if (indexName === indexTarget) {
                        indexTargetFound = true;

                        // Verifica as colunas
                        if (!_.includes(index.columns, targetA)) {
                            validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ter a coluna '${targetA.bold}'`)
                        }

                        if (!_.includes(index.columns, targetB)) {
                            validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ter a coluna '${targetB.bold}'`)
                        }

                        // Verifica se é indice unico
                        if (index.type != "unique index") {
                            validateResult.warn.push(`Indice '${indexName.bold}' na tabela '${tableName.bold}', deve ser do tipo '${("unique index".bold)}'`)
                        }

                    }


                });


                if (!indexTargetFound) {
                    validateResult.warn.push(`Tabela '${tableName.bold}' deve ter o índice único com nome  '${indexTarget}'`);
                }

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica RELACIONAMENTOS
                ////////////////////////////////////////////////////////////////////////////////////////////////////
                let targetRelationA = 'fk_' + tableA + '___' + tableName,
                    targetRelationB = 'fk_' + tableB + '___' + tableName,
                    targetRelationAFound = false,
                    targetRelationBFound = false;

                _.forIn(tableInfo.relations, function (relation, relationName) {

                    if (relationName === targetRelationA) {
                        targetRelationAFound = true;

                        if (relation.foreignKey !== targetA) {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', foreignKey deve ser '${targetA.bold}'`)
                        }

                        if (relation.referenceKey !== targetA) {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', referenceKey deve ser '${targetA.bold}'`)
                        }


                        // Verifica onDelete
                        if (!relation.onDelete || relation.onDelete != 'CASCADE') {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', deve ser '${"ON DELETE CASCADE".bold}'`)
                        }


                    }

                    if (relationName === targetRelationB) {
                        targetRelationBFound = true;

                        if (relation.foreignKey !== targetB) {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', foreignKey deve ser '${targetA.bold}'`)
                        }

                        if (relation.referenceKey !== targetB) {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationA.bold}' na tabela '${tableName.bold}', referenceKey deve ser '${targetB.bold}'`)
                        }


                        // Verifica onDelete
                        if (!relation.onDelete || relation.onDelete != 'CASCADE') {
                            validateResult.warn.push(`A chave estrangeira '${targetRelationB.bold}' na tabela '${tableName.bold}', deve ser '${"ON DELETE CASCADE".bold}'`)
                        }


                    }


                });

                if (!targetRelationAFound) {
                    validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com nome '${targetRelationA.bold}'`)
                }

                if (!targetRelationBFound) {
                    validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com nome '${targetRelationB.bold}'`)
                }


            }

            ////////////////////////////////////////////////////////////////////////////////
            // Relacionamento simples OneToMany
            ////////////////////////////////////////////////////////////////////////////////
            else if (tableName.indexOf("_") !== -1) {

                var s = tableName.split("_");
                var tableA = s[0];

                ////////////////////////////////////////////////////////////////////////////////////////////////////
                // Verifica se Tabela A existe
                ////////////////////////////////////////////////////////////////////////////////////////////////////

                if (!_.has(schema, tableA)) {
                    validateResult.warn.push(`Tabela ${tableA.bold} não existe. Nome da tabela '${tableName.bold}' deve ser composta pelas tabela que ela relaciona!`)
                }

                if (tableInfo.relations.length === 0) {
                    validateResult.warn.push(`Tabela ${tableA.bold} deve ter alguma chave estrangeira!`)
                }


                let found = false;

                _.forIn(tableInfo.relations, function (relation, relationName) {

                    if (relation.referenceTable === tableA) {
                        found = true;
                    }

                });

                if (!found) {
                    validateResult.warn.push(`A tabela '${tableName.bold}', deve ter relacionamento com a tabela '${tableA.bold}'`)
                }


            }
            else {

                validateResult.warn.push(`Nome da tabela '${tableName.bold}' deve estar no formato camelCase`)

            }
        }


    }

    /**
     * Valida Indices
     *
     * @param tableInfo
     * @param tableName
     * @param validateResult
     * @param indexesList
     * @private
     */
    static _validateIndexes(tableInfo, tableName, validateResult, indexesList) {

        _.forIn(tableInfo.indexes, function (index, indexName) {

            /////////////////////////////////////////////////////
            // WARN: Valida se index está com nome correto : idx_[nome_tabela][OPCIONAL]
            /////////////////////////////////////////////////////
            let target = "idx_" + tableName;
            let targetSize = target.length;

            let targetE = "idx_" + tableName + '_';

            if (indexName.substring(0, targetSize) !== target) {
                validateResult.warn.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' deve começar com '${target.bold}'`);

            }

            // Se o nome do indice for mais complexo, deve ter _ separando
            if (indexName.length > targetSize && indexName.substring(0, targetSize + 1) !== targetE) {
                validateResult.warn.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' deve ter um separador '_'`);

            }

            /////////////////////////////////////////////////////
            // ERROR: Valida se os campos especificado no indice existem
            // parse_dia_sql já faz a validação e não adiciona o campo
            /////////////////////////////////////////////////////


            _.each(index.columns, function (indexColumn) {

                let found = false;

                _.forIn(tableInfo.columns, function (column, columnName) {

                    if (columnName === indexColumn) {
                        found = true;
                    }

                });

                if (!found) {
                    validateResult.warn.push(`Coluna '${indexColumn.bold}' do índice '${indexName.bold}', da tabela '${tableName.bold}' não foi encontrado!`);
                }

            });


            /////////////////////////////////////////////////////
            // Verifica se foi definido tipo do indice
            /////////////////////////////////////////////////////
            if (!index.type) {
                validateResult.error.push(`Índice '${indexName.bold}', da tabela '${tableName.bold}' não tem tipo definido`)
            }


            /////////////////////////////////////////////////////
            // Valida se o tipo é válido: UNIQUE e (pesquisar os tipos possíveis)
            // validado pelo parse_dia_sql, não carrega se tiver errado
            // TODO: Atenção, só para MYSQL, No Knexjs só postgres aceita este parâmetro, validar se der problema
            /////////////////////////////////////////////////////
            if (index.type && !_.includes(typesAllow, index.type)) {
                validateResult.error.push(`Índice '${indexName.bold}', da tabela '${tableName.bold}' está com tipo inválido ('${index.type.bold}'), deve ser: '${typesAllow.join(', ').bold}'`)

            }

            /////////////////////////////////////////////////////
            //- ERROR: Verifica se indice já existe
            /////////////////////////////////////////////////////

            if (_.includes(indexesList, indexName)) {
                validateResult.error.push(`Indice '${indexName.bold}' da tabela '${tableName.bold}' já existe`)
            }

            indexesList.push(indexName);


        });

    }

    /**
     * Valida Restrições e relacionamento
     *
     * @param tableInfo
     * @param tableName
     * @param validateResult
     * @param relationList
     * @private
     */
    static _validateRelations(tableInfo, tableName, validateResult, relationList, schema) {

        _.forIn(tableInfo.relations, function (relation, relationName) {


            ////////////////////////////////////////////////
            // WARN: valida se o nome está no formato fk_[tabela1]_ _ _[tabela2]_[OPCIONAL]
            ////////////////////////////////////////////////

            var targetName = "fk_" + relation.referenceTable + '___' + tableName;
            var targetNameE = "fk_" + relation.referenceTable + '___' + tableName + '_';
            var targetSize = targetName.length;


            if (relationName.substring(0, targetSize) !== targetName) {
                validateResult.warn.push(`ForeingKey '${relationName}' da tabela '${tableName.bold}' deve ter o nome iniciado com '${targetName.bold}'!`)

            }


            // Se o nome do indice for mais complexo, deve ter _ separando
            if (relationName.length > targetSize && relationName.substring(0, targetSize + 1) !== targetNameE) {
                validateResult.warn.push(`ForeingKey '${relationName.bold}' da tabela '${tableName.bold}' deve ter o nome iniciado com '${targetNameE.bold}' e separador '_'!`)

            }


            ////////////////////////////////////////////////
            // ERRO: Valida se referenceTable existe
            ////////////////////////////////////////////////


            if (!_.has(schema, relation.referenceTable)) {

                validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma tabela que não existe: '${relation.referenceTable.bold}'!`)


            } else {

                ////////////////////////////////////////////////
                //- ERRO: Valida se referenceKey existe na tabela remota
                ////////////////////////////////////////////////

                let found = false;
                _.forIn(schema[relation.referenceTable].columns, function (column, columnName) {

                    if (relation.referenceKey === columnName) {
                        found = true;
                        return false;
                    }

                });


                if (!found) {
                    validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma coluna na tabela '${relation.referenceTable.bold}' que não existe: '${relation.referenceKey.bold}'!`);

                }

                ////////////////////////////////////////////////
                // ERRO: Valida se foreignKey existe localmente
                ////////////////////////////////////////////////

                found = false;

                _.forIn(tableInfo.columns, function (column, columnName) {

                    if (relation.foreignKey === columnName) {
                        found = true;

                        // Valida se é do tipo primary
                        if (column.type !== "PRIMARY") {
                            validateResult.warn.push(`Coluna '${columnName.bold}' da tabela '${tableName.bold}' deve ser do tipo '${"PRIMARY".bold}' e não '${column.type.bold}', pois pertence a chave estrangeira!`);
                        }

                        return false;
                    }

                });


                if (!found) {
                    validateResult.error.push(`ForeignKey '${relationName.bold}', da tabela '${tableName.bold}', referencia uma coluna que não existe: '${relation.foreignKey.bold}'!`);
                }

            }

            /////////////////////////////////////////////////////
            //ERROR: Verifica se restrição já existe
            /////////////////////////////////////////////////////

            if (_.includes(relationList, relationName)) {
                validateResult.error.push(`Relacionamento '${relationName.bold}' da tabela '${tableName.bold}' já existe`)
            }

            relationList.push(relationName);

        });

    }

}


module.exports = SchemaValidation;