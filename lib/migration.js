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
require("colors");

const inquirer = require('inquirer');

const inspect = require('eyes').inspector({maxLength: false});

const schemaValidation = require('./schemaValidation');
const extendSchema = require('./extendSchema');


class Migration {

    static createMigration(schemaDirectory, migrationDirectory) {

        let self = this;

        // TODO: Cuidado com memoria, fazer todas as operações no disco, usar yield, pense em base de 10M registros
        // TODO: Permitir modo interativo e não interativo


        self
        //  ////////////////////////////////////////////////////////////////////////
        //  //  Carrega todos os schemas em formato YAML dos diretórios passados
        //  ////////////////////////////////////////////////////////////////////////
            ._loadYamlSchema(schemaDirectory)

            //////////////////////////////////////////////////////////////////////////
            // Processa Herança de Esquemas TODO: Separar em outra classe
            //////////////////////////////////////////////////////////////////////////
            .then((schemas) => extendSchema.extendSchema(schemas))

            //////////////////////////////////////////////////////////////////////////
            // Valida Schema com erros warining e avisos TODO: Separar em outra classe
            //////////////////////////////////////////////////////////////////////////
            .then((schema) => schemaValidation.validateSchema(schema).then((valid) => [schema, valid]))

            //////////////////////////////////////////////////////////////////////////
            // Cria Migração
            //////////////////////////////////////////////////////////////////////////
            .then(function (result) {

                let currentSchema = result[0];
                let valid = result[1];

                if (valid) {

                    // Inicializa Diretório para sistema de Migração
                    self._initDirectory(migrationDirectory)

                        .then(() => self._getLastRevision(migrationDirectory))
                        .then((lastRevision) => self._createNewSchemaAndMigration(migrationDirectory, currentSchema, lastRevision));


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
     * Cria Novo Schema e prapara nova migração
     *
     * @param migrationDirectory
     * @param currentSchema
     * @param lastRevision
     * @private
     */
    static _createNewSchemaAndMigration(migrationDirectory, currentSchema, lastRevision) {

        let self = this;

        let currentRevision;

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

        inspect(currentSchema);

        let nextRevision = currentRevision ? currentRevision + 1 : 0;
        let schemaDirectory = path.join(migrationDirectory, "migration", "schema-" + _.padStart(1, 5, nextRevision));


        Promise.resolve()

        ////////////////////////////////////////////////////////////////////////////////////////
        // Cria Novo Schema
        ////////////////////////////////////////////////////////////////////////////////////////

        // Cria Diretório
            .then(() => self._createDirectory(schemaDirectory))

            // Cria Arquivo schema.json
            .then(() => fs.writeFileAsync(path.join(schemaDirectory, 'schema.json'), JSON.stringify(currentSchema)))


        // if (lastRevision) {
        //
        //
        //     // Cria Migração
        //
        //
        // } else {
        //
        //     currentRevision = 0;
        //
        //     let schemaDirectory = path.join(migrationDirectory, "migration", "schema-" + _.padStart(1, 5, '0'));
        //
        //     self._createDirectory(schemaDirectory).then(function () {
        //
        //         return fs.writeFileAsync(path.join(schemaDirectory, 'schema.json'), JSON.stringify(currentSchema));
        //
        //
        //     });
        //
        //
        //     // Nova Revisão, não será necessário criar migração
        //
        //
        // }

    }


    /**
     * Passado uma lista de diretório carrega todos os arquivos de schema dentro deles em um array unico
     *
     * @param schemaDirectory
     * @returns {Promise.<Array>}
     * @private
     */
    static _loadYamlSchema(schemaDirectory) {

        let self = this;

        let unifiedScheme = {};


        // Se String, converte para Array
        if (!_.isArray(schemaDirectory)) {
            schemaDirectory = [schemaDirectory];
        }

        ////////////////////////////////////////////////////////////////////////////
        // Itera Sobre todos os diretorios
        ////////////////////////////////////////////////////////////////////////////

        return Promise.map(schemaDirectory, function (directory) {

            return fs.readdirAsync(directory).then((files) => self._readYamlSchema(directory, files))

        })

        ////////////////////////////////////////////////////////////////////////////
        // Unifica resultado de cada diretório em um unico diretório
        ////////////////////////////////////////////////////////////////////////////
            .then((result) => _.flatten(result));

    }

    /**
     * Carrega Todos os Arquivos Yaml e retorna um array
     *
     * @param directory
     * @param files
     * @private
     */
    static _readYamlSchema(directory, files) {

        let validFiles = _.filter(files, (file) => path.extname(file) === '.yaml');

        return Promise.map(validFiles, function (file) {

            let pathFile = path.join(directory, file);

            return fs.readFileAsync(pathFile)

                .then(function (buffer) {

                    let yamlSchema = yaml.safeLoad(buffer);
                    yamlSchema.name = path.basename(file, '.yaml');
                    return yamlSchema;

                })

        })


    }


    /**
     * Carrega Revisão Atual
     *
     * @returns {number}
     * @private
     */
    static _getLastRevision(directory) {


        let recentFile,
            rev,
            recent;


        let reFile = /-(\d{5})$/;

        //noinspection JSUnresolvedFunction
        return fs.readdirAsync(path.join(directory, "migration"))
            .then(function (files) {

                ///////////////////////////////////
                // Itera por arquivos
                ///////////////////////////////////
                _.each(files, function (file) {


                    let result = file.match(reFile);

                    if (result) {
                        rev = parseInt(result[1]);

                        if (!recentFile || rev > recent) {
                            recentFile = result.input;
                            recent = rev;
                        }
                    }

                });


                ///////////////////////////////////
                // Resultado
                ///////////////////////////////////
                if (recentFile) {
                    return {
                        file: recentFile,
                        revision: recent
                    };
                } else {
                    return null
                }


            });


    }

    /**
     * Cria Estrutura de Migração
     *
     * @param migrationDirectory
     * @private
     */
    static _initDirectory(migrationDirectory) {

        let self = this;


        return self._createDirectory(migrationDirectory)
            .then(() => self._createDirectory(path.join(migrationDirectory, 'migration')))
            .then(() => self._createDirectory(path.join(migrationDirectory, 'backup')));


    }

    /**
     * Cria Diretório caso não exista
     *
     * @param directory
     * @returns {Promise.<T>}
     * @private
     */
    static _createDirectory(directory) {

        //noinspection JSUnresolvedFunction
        return fs.statAsync(directory)

            .catch(function (err) {

                // Se Diretório Não existe Cria ENOENT = No Such File or Directory
                //http://man7.org/linux/man-pages/man3/errno.3.html
                if (err.code === 'ENOENT') {

                    return fs.mkdir(directory);

                } else {

                    throw  err;

                }

            })

    };


}


module.exports = Migration;