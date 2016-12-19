/**
 * **Created on 06/07/16**
 *
 *  Gera uma Nova Migração
 *
 * lib/createMigration.js
 * @author André Timermann <andre@andregustvo.org>
 *
 *     // TODO: Validar default, deve estar entre aspas, casos possiveis: "0", "'texto'", "CURRENT_TIMESTAMP"
 *
 *     // TODO: Renomear para Migration, e desmembrar a classe em classes auxiliares
 *
 */
'use strict';

const _ = require('lodash');
const path = require('path');
const yaml = require('js-yaml');

const Promise = require('bluebird');

const fs = require('fs');
Promise.promisifyAll(fs);
require('colors');

const md5 = require('md5');

// const inspect = require('eyes').inspector({maxLength: false, stream: null});

const schemaValidation = require('./schemaValidation');
const extendSchema = require('./extendSchema');

// const reDiffColumnType = /([0-9A-Za-z\s]*)\((.*)\)/;
const reDiffColumnType = /([0-9A-Za-z\s]*)\((.*)\)([0-9A-Za-z_\s]*)+/;

class Migration {

    static createMigration(schemaDirectory, migrationDirectory) {
        let self = this;

        // TODO: Cuidado com memoria, fazer todas as operações no disco, usar yield, pense em base de 10M registros
        // TODO: Permitir modo interativo e não interativo

        self
        //  ////////////////////////////////////////////////////////////////////////
        //  //  Carrega todos os schemas em formato YAML dos diretórios passados
        //  ////////////////////////////////////////////////////////////////////////
            .loadYamlSchema(schemaDirectory)

            // ////////////////////////////////////////////////////////////////////////
            // Processa Herança de Esquemas TODO: Separar em outra classe
            // ////////////////////////////////////////////////////////////////////////
            .then((schemas) => extendSchema.extendSchema(schemas))

            // ////////////////////////////////////////////////////////////////////////
            // Valida Schema com erros warining e avisos TODO: Separar em outra classe
            // ////////////////////////////////////////////////////////////////////////
            .then((schema) => schemaValidation.validateSchema(schema).then((valid) => [schema, valid]))

            // ////////////////////////////////////////////////////////////////////////
            // Cria Migração
            // ////////////////////////////////////////////////////////////////////////
            .then(function (result) {
                let currentSchema = result[0];
                let valid = result[1];

                if (valid) {
                    // Inicializa Diretório para sistema de Migração
                    self._initDirectory(migrationDirectory)

                        .then(() => self._getLastRevision(migrationDirectory))
                        .then(function (lastRevision) {
                            self.createNewSchemaAndMigration(migrationDirectory, currentSchema, lastRevision);
                        });
                }
            });

        // Cria versão no formato schema-[DATA:YYYYMMDDHHmmSS]-[NUMERO SEQUENCIAL DE 5 DIGITOS].json

        // Verifica se é primeira versão, caso negativo, cria um diff da versão anterior para esta

        // Analisa diferenças e realiza questionário e gera arquivo de migração: migration-[VERSÃO ANTIGA]-[VERSÃO NOVA]
        // ex: migration-00001-00002.js

        // Cria script de conversão com  prototipo de funções para usuário implementar as conversões

        // Coluna Nova: Qual valor padrão? <Se especificado gera função que retorna valor padrão, caso cotrário só gera protótipo>
        // Coluna removida: Valor é perdido! <Não precisa de função>

        // Tipo Mudou: cria função (dependendo do tipo gera modelo pré-definido) ex: int 2 string basta converter, mas gera funlçao

        // Size Mudou: Trunca valor? se sim gera script padrão para truncar, caso contrário gera protótipo com throw not implemented

        // Muda notNULL: Valor padrão, caso valor antigo seja null

        // Muda Default: Conversão simples, não exige função

        // Novo Indice Unico:
        // Função que recebe todos os valores
        // Função que recebe apenas valores repetidos
        // Função que é chamada várias vezes com um valor

        // Nova Tabela: Não faz nada, tabela vazia, talvez seja necessário criar um registro padrão para usar em relacionamentos obrigatório

        // Novo Relacionamento: Valor padrão, se a tabela de relacionamento for nova, criar um registro novo em newTable

        // Gerar Up and Down

        // run-migration
        // - Cria recomentação para não usar a mesma base de dados, deve ser possível reverter migração facilmente e de forma segura
        // - Faz Dump de todos os dados da base em arquivo json, salva no disco
        // - Criar Progresso
        // - Validar Erros
        // - Criar sempre com transação, para em caso de erro possibilitar roolback simples
    }

    /**
     * Configura Herança
     *
     * @param schemas
     * @param output    StdOut
     *
     * @returns {*}
     */
    static extendSchema(schemas, output) {
        return extendSchema.extendSchema(schemas, output);
    }

    /**
     * Valida Schema
     *
     * @param schema
     * @param ui    StdOut
     */
    static validateSchema(schema, ui) {
        return schemaValidation.validateSchema(schema, ui);
    }

    /**
     * Salva Schema no disco
     *
     * @param migrationDirectory
     * @param schema
     * @param revision
     * @param output
     */
    static saveSchema(migrationDirectory, schema, revision, output) {
        let self = this;

        let schemaDirectory = path.join(migrationDirectory, 'migration', 'schema-' + _.padStart(1, 5, revision));

        return self._createDirectory(schemaDirectory, output)

            .then(function () {
                let schemaPath = path.join(schemaDirectory, 'schema.json');
                return fs.writeFileAsync(schemaPath, JSON.stringify(schema));
            });
    }

    /**
     * Salva Schema no disco
     *
     * @param migrationDirectory
     * @param schema
     * @param revision
     * @param output
     */
    static saveMigration(output, migrationDirectory, revision, migrationObject) {
        let self = this;

        let schemaDirectory = path.join(migrationDirectory, 'migration', 'schema-' + _.padStart(1, 5, revision));

        // Migration Up
        let migrationUpPath = path.join(schemaDirectory, 'migration_up.json');

        // Migration Down
        let migrationDownPath = path.join(schemaDirectory, 'migration_down.json');
    }

    /**
     * Cria Novo Schema e prapara nova migração
     *
     * @param migrationDirectory
     * @param currentSchema
     * @param lastRevision
     * @param output
     */
    static createNewSchemaAndMigration(migrationDirectory, currentSchema, lastRevision, output) {
        let self = this;

        // Deve existir um arquivo config.json global, com algumas atributos importantes:
        // currentSchema = 0   // Schema atualmente carregado - Importante que este valor nunca fique errado, pois vai quebrar a migração

        // Verifica se diretório migration existe, se não existir cria
        // Cada migração terá um diretório no formato: schema-00001
        // Onde termos os arquivos:
        //      - schema.json
        //      - migration_up.js:  Script de migração do schema anterior
        //      - migration_down.js: Script de migração reverso para o schema anterior
        //      - config.json: Configurações Gerais : Data de criação,
        // TODO: Tratar erro, se esforçar para não deixar o estado das migrações inconsistentes (isso dá muito trabalho pra arrumar depois)
    }

    /**
     * Passado uma lista de diretório carrega todos os arquivos de schema dentro deles em um array unico
     *
     * @param schemaDirectory
     * @param output
     * @returns {Promise.<Array>}
     */
    static loadYamlSchema(schemaDirectory, output) {
        let self = this;

        let unifiedScheme = {};

        // Se String, converte para Array
        if (!_.isArray(schemaDirectory)) {
            schemaDirectory = [schemaDirectory];
        }

        // //////////////////////////////////////////////////////////////////////////
        // Itera Sobre todos os diretorios
        // //////////////////////////////////////////////////////////////////////////

        return Promise.map(schemaDirectory, function (directory) {
            return fs.readdirAsync(directory).then((files) => self._readYamlSchema(directory, files, output));
        })

        // //////////////////////////////////////////////////////////////////////////
        // Unifica resultado de cada diretório em um unico diretório
        // //////////////////////////////////////////////////////////////////////////
            .then((result) => _.flatten(result));
    }

    /**
     * Carrega Todos os Arquivos Yaml e retorna um array
     *
     * @param directory
     * @param files
     * @private
     */
    static _readYamlSchema(directory, files, output) {
        let validFiles = _.filter(files, (file) => path.extname(file) === '.yaml');

        return Promise.map(validFiles, function (file) {
            let pathFile = path.join(directory, file);

            let log = `${file}...`;
            return fs.readFileAsync(pathFile)

                .then(function (buffer) {
                    output.info(`${log}OK!`);

                    let yamlSchema = yaml.safeLoad(buffer);
                    yamlSchema.name = path.basename(file, '.yaml');
                    return yamlSchema;
                });
        });
    }

    /**
     * Carrega Revisão Atual
     *
     * @returns {number}
     */
    static getLastRevision(directory) {
        let revision;
        let lastRevision = 0;

        let reFile = /-(\d{5})$/;

        // noinspection JSUnresolvedFunction,JSValidateTypes
        return fs.readdirAsync(path.join(directory, 'migration'))
            .then(function (files) {
                // /////////////////////////////////
                // Itera por arquivos
                // /////////////////////////////////
                _.each(files, function (file) {
                    let result = file.match(reFile);

                    if (result) {
                        revision = parseInt(result[1]);

                        if (revision > lastRevision) {
                            lastRevision = revision;
                        }
                    }
                });

                // /////////////////////////////////
                // Resultado
                // /////////////////////////////////
                return lastRevision;
            });
    }

    /**
     * Cria Estrutura de Migração
     *
     * @param migrationDirectory
     */
    static initDirectory(migrationDirectory, output) {
        let self = this;

        return self._createDirectory(migrationDirectory, output)
            .then(() => self._createDirectory(path.join(migrationDirectory, 'migration'), output))
            .then(() => self._createDirectory(path.join(migrationDirectory, 'backup'), output));
    }

    /**
     * Cria Diretório caso não exista
     *
     * @param directory
     * @param output
     * @returns {Promise.<T>}
     * @private
     */
    static _createDirectory(directory, output) {
        // noinspection JSUnresolvedFunction
        return fs.statAsync(directory)

            .then(() => output.info(directory))

            .catch(function (err) {
                return Promise.delay().then(function () {
                    // Se Diretório Não existe Cria ENOENT = No Such File or Directory
                    // http://man7.org/linux/man-pages/man3/errno.3.html
                    if (err.code === 'ENOENT') {
                        return fs.mkdirAsync(directory).then(() => output.info(directory));
                    } else {
                        throw err;
                    }
                });
            });
    }


    /**
     * Carrega Schema do Arquivo
     * @param output
     * @param migrationDirectory
     * @param lastRevision
     */
    static loadSchema(output, migrationDirectory, lastRevision) {
        let self = this;

        let schemaDirectory = 'schema-' + _.padStart(lastRevision, 5, 0);

        let schemaFile = path.join(migrationDirectory, 'migration', schemaDirectory, 'schema.json');

        output.info(schemaFile);
        // self.ui.output.info("Analisando Migração...", 'blue');

        return fs.readFileAsync(schemaFile)

            .then((content) => JSON.parse(content));
    }

    /**
     * Gera um Objeto de diferença entre os dois schemas (migrationObjeto)
     *
     * @param output
     * @param {Object}  lastSchema      Schema Anterior
     * @param {Object}  currentSchema   Schema Atual
     * @param migrationObject
     */
    static loadTables(output, lastSchema, currentSchema, migrationObject) {
        let self = this;

        // Reinicia Indice
        delete migrationObject.indexA;
        delete migrationObject.indexB;
        migrationObject.indexA = [];
        migrationObject.indexB = [];

        // A to B
        output.info('Analisando Migração Antigo => Novo...', 'blue');
        self._compareTables(output, lastSchema, currentSchema, migrationObject.schemaA, migrationObject.indexA);

        // B to A
        output.info('Analisando Migração Novo => Antigo...', 'blue');
        self._compareTables(output, currentSchema, lastSchema, migrationObject.schemaB, migrationObject.indexB);
    }

    /**
     * Compara Modelo anterior com novo e retorna uma solução
     * Se solução já existir trabalha se baseando nele
     *
     * @param output                    StdOut (Impressão de resultado), usar outout.info
     * @param oldSchema                 Schema Antigo de onde está migrando
     * @param newSchema                 Schema Novo para onde vai migrar
     * @param migrationObject           Objeto com as informações de Migração do schema
     * @param index                     Objeto com as informações de Migração, mas indexado por id em vez do nome
     * @private
     */
    static _compareTables(output, oldSchema, newSchema, migrationObject, index) {
        let self = this;

        // //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // Itera por todas as tabelas
        // //////////////////////////////////////////////////////////////////////////////////////////////////////////

        _.each(oldSchema, function (schemaInfo, schemaName) {
            output.info(schemaName);

            // //////////////////////////////////////
            // Inicializa Resultado
            // //////////////////////////////////////

            // Solução para esta tabela
            if (!migrationObject[schemaName]) migrationObject[schemaName] = {};

            // Link Direto para fácil acesso
            let migrationTable = migrationObject[schemaName];
            migrationTable.name = schemaName;

            // Link Indexado
            index.push(migrationTable);

            // Nome usado na outra tabela (pode ter sido renomeado)
            let newSchemaName = migrationTable.renamedTo || migrationTable.name;

            // //////////////////////////////////////
            // Verifica se table foi removido no outro schema
            // //////////////////////////////////////
            if (!newSchema[newSchemaName]) {
                migrationTable.deleted = true;
                migrationTable.columns = {};
                migrationTable.relations = {};
                migrationTable.indexes = {};
            }
            // //////////////////////////////////////
            // Verifica se Tem alterações
            // //////////////////////////////////////
            else {
                delete migrationTable.deleted;
                self._diffTables(output, schemaInfo, newSchema[newSchemaName], migrationTable);
            }
        });
    }

    /**
     * Analisa Diferença entre as duas tabelas
     * @param output
     * @param oldSchema
     * @param newSchema
     * @param migrationConfig
     * @private
     */
    static _diffTables(output, oldSchema, newSchema, migrationConfig) {
        let self = this;

        // //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // COLUNA ALTERADAS
        // //////////////////////////////////////////////////////////////////////////////////////////////////////////

        // - caso exista pelo menos 1 coluna removida e 1 criada, perguntar se existem colunas renomeadas e relaciona-las
        // - Perguntar se alguma outra coluna foi renomeada

        if (!migrationConfig.columns) migrationConfig.columns = {};

        _.each(oldSchema.columns, function (oldColumnInfo, oldColumnName) {
            if (!migrationConfig.columns[oldColumnName]) migrationConfig.columns[oldColumnName] = {};

            let migrationColumn = migrationConfig.columns[oldColumnName];

            if (!migrationColumn.solution) migrationColumn.solution = null;

            // /////////////////////////////////////////
            // Verifica se Foi removido no outro schema (Para Migração não importa se foi removido, deixei para alguma marcação ou uso futuro)
            // /////////////////////////////////////////
            if (!newSchema.columns[oldColumnName]) {
                migrationColumn.deleted = true;
            }
            // /////////////////////////////////////////
            // Verifica Diferença
            // /////////////////////////////////////////
            else {
                delete migrationColumn.deleted;

                let newColumnInfo = newSchema.columns[oldColumnName];

                // output.info(`  Coluna ${oldColumnName} Alterada:`);
                // Verifica Diferença entre columas e coloca resultado em MigrationColumn
                self._diffColumns(output, oldColumnInfo, newColumnInfo, migrationColumn);
            }

            // Limpa se tiver ok (1 pois solução conta 1 )
            if (_.size(migrationColumn) === 0) throw new Error('Não pode ser Zero');

            if (_.size(migrationColumn) === 1) delete migrationConfig.columns[oldColumnName];
        });

        // //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // NOVAS COLUNAS
        // //////////////////////////////////////////////////////////////////////////////////////////////////////////

        _.each(newSchema.columns, function (newColumnInfo, newColumnName) {
            if (!oldSchema.columns[newColumnName]) {
                if (!migrationConfig.columns[newColumnName]) migrationConfig.columns[newColumnName] = {};

                let migrationColumn = migrationConfig.columns[newColumnName];

                // /////////////////////////////////////////
                // Atributos de Novo Campo
                // /////////////////////////////////////////

                let newType = self._explodeType(newColumnInfo.type);

                migrationColumn.new = true;
                migrationColumn.newType = newType.type;
                migrationColumn.newSize = newType.size;
                if (!migrationColumn.solution) migrationColumn.solution = null;

                // /////////////////////////////////////////
                // Se Mudou de Null para NotNull e não tem valor default
                // /////////////////////////////////////////
                if (newColumnInfo.notNull && !newColumnInfo.default) {
                    // let oldSolution = (migrationColumn.notNull && migrationColumn.notNull.solution) ? migrationColumn.notNull.solution : null

                    migrationColumn.notNull = true;
                    // migrationColumn.notNull = {
                    //     // Se já tem solução não apaga
                    //     solution: oldSolution
                    // }
                } else {
                    delete migrationColumn.notNull;
                }
            }
        });

        // //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // NOVA REFERENCIA
        // //////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (!migrationConfig.relations) migrationConfig.relations = {};

        // Verifica se ocorreu qualquer mudança na referencia
        _.forIn(newSchema.relations, function (newRelationInfo, newRelationName) {
            // Como Vamos Buscar pelas propriedades e não pelo nome, precisamos criar um hash das propriedades
            let newHash = md5(newRelationInfo.foreignKey + newRelationInfo.referenceKey + newRelationInfo.referenceTable);

            // Inicializa Configuração caso não exista
            if (!migrationConfig.relations[newHash]) migrationConfig.relations[newHash] = {};

            // Link
            let migrationRelation = migrationConfig.relations[newHash];

            // Verifica Se Relacionamento já existia anteriormente
            let found = false;

            // Não importa o nome, vamos buscar pelas propriedades
            _.forIn(oldSchema.relations, function (oldRelationInfo) {
                let oldHash = md5(oldRelationInfo.foreignKey + oldRelationInfo.referenceKey + oldRelationInfo.referenceTable);

                if (newHash === oldHash) {
                    found = true;

                    // Sai do loop
                    return false;
                }
            });

            // É uma Refêrencia Nova
            if (!found) {
                migrationRelation.foreignKey = newRelationInfo.foreignKey;
                migrationRelation.referenceKey = newRelationInfo.referenceKey;
                migrationRelation.referenceTable = newRelationInfo.referenceTable;
                migrationRelation.name = newRelationName;

                if (!migrationRelation.solution) migrationRelation.solution = null;
            } else {
                delete migrationConfig.relations[newHash];
            }
        });

        // //////////////////////////////////////////////////////////////////////////////////////////////////////////
        // NOVO INDICE UNICO
        // //////////////////////////////////////////////////////////////////////////////////////////////////////////

        if (!migrationConfig.indexes) migrationConfig.indexes = {};

        // Verifica se ocorreu qualquer mudança na referencia
        _.forIn(newSchema.indexes, function (newIndexInfo, newIndexName) {
            if (newIndexInfo.type.trim() === 'unique index') {
                // Como Vamos Buscar pelas propriedades e não pelo nome, precisamos criar um hash das propriedades
                let newHash = md5(newIndexInfo.columns.sort().toString());

                // Inicializa Configuração caso não exista
                if (!migrationConfig.indexes[newHash]) migrationConfig.indexes[newHash] = {};

                // Link
                let migrationIndex = migrationConfig.indexes[newHash];

                // Verifica Se Relacionamento já existia anteriormente
                let found = false;

                // Não importa o nome, vamos buscar pelas propriedades
                _.forIn(oldSchema.indexes, function (oldIndexInfo) {
                    if (oldIndexInfo.type.trim() === 'unique index') {
                        let oldHash = md5(oldIndexInfo.columns.sort().toString());

                        if (newHash === oldHash) {
                            found = true;

                            // Sai do loop
                            return false;
                        }
                    }
                });

                // É uma Refêrencia Nova
                if (!found) {
                    migrationIndex.columns = newIndexInfo.columns;
                    migrationIndex.name = newIndexName;

                    if (!migrationIndex.solution) migrationIndex.solution = null;
                } else {
                    delete migrationConfig.indexes[newHash];
                }
            }
        });
    }

    static _diffColumns(output, oldColumnInfo, newColumnInfo, migrationColumn) {
        let self = this;

        // /////////////////////////////////////////
        // Mudança de Tipo
        // /////////////////////////////////////////

        let oldType = self._explodeType(oldColumnInfo.type);
        let newType = self._explodeType(newColumnInfo.type);

        if (oldType.type !== newType.type) {
            migrationColumn.type = {
                from: oldType.type,
                to: newType.type
                // // Se já tem solução não apaga
                // solution: (migrationColumn.type && migrationColumn.type.solution) ? migrationColumn.type.solution : null
            };
        } else {
            delete migrationColumn.type;
        }

        if (oldType.type !== newType.type || oldType.size !== newType.size) {
            migrationColumn.size = {
                from: oldType.size,
                to: newType.size
                // // Se já tem solução não apaga
                // solution: (migrationColumn.size && migrationColumn.size.solution) ? migrationColumn.size.solution : null
            };
        } else {
            delete migrationColumn.size;
        }

        // /////////////////////////////////////////
        // Se Mudou de Null para NotNull e não tem valor default
        // /////////////////////////////////////////
        if (!oldColumnInfo.notNull && newColumnInfo.notNull && !newColumnInfo.default) {
            migrationColumn.notNull = true;

            // migrationColumn.notNull = {
            //     // Se já tem solução não apaga
            //     solution: (migrationColumn.notNull && migrationColumn.notNull.solution) ? migrationColumn.notNull.solution : null
            // }
        } else {
            delete migrationColumn.notNull;
        }
    }

    /**
     * Explode Tipo em Tipo e Tamanho
     *
     * @param typeString
     * @private
     */
    static _explodeType(typeString) {
        let type, size, posType;
        let re = typeString.match(reDiffColumnType);

        if (re) {
            type = re[1].trim();
            size = re[2].trim();
            posType = re[3].trim() || '';
        } else {
            type = typeString;
            posType = '';
        }

        return {
            type: (type + ' ' + posType).trim(),
            size: size
        };
    }
}

module.exports = Migration;
