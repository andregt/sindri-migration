/**
 * **Created on 14/12/16**
 *
 * lib/migrationCreator/util/schemaParser.js
 * @author André Timermann <andre@andregustvo.org>
 *
 *  Processa array de schemas carregados do Yaml (em formato json) e gera objeto indexado, tratando Herança
 *
 */
'use strict';

const Logger = require('../../util/logger');
const _ = require('lodash');

let logger;


class SchemaParser {

    constructor(customLogger) {

        logger = new Logger(customLogger);
        logger.category = 'SchemaParser';


    }

    parser(schemas) {

        let result = {};


        // Agrupa por nome, se tiver o mesmo nome significa que estamos criando uma herança
        let groups = _.groupBy(schemas, e => e.name);

        // Object.entries é proposta  de padrão (ES8), mas tá disponível no nodejs
        for (let [name, group] of Object.entries(groups)) {

            logger.info(`Processando schema '${name}'`);

            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Se o grupo tiver apenas um elemento, não existe herança de schema
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (group.length === 1) {

                logger.debug(`'${name}' não tem herança.`);

                if (result[name]) {
                    throw new Error(`Schema '${result[name]}' está duplicado!"`);
                }

                result[name] = group[0];

            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Existe Herança
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            else {

                // TODO: Opção para definir pai como abstrato
                // TODO: Ver _extendsSchema linha 47
                throw new Error('Não implementado Ainda');

            }


        }

        return result;


    }


}


module.exports = {

    /**
     * Caso Usuario deseja um log personalizado Ex: Interface gráfica
     *
     * @param value
     */
    set logger(value) {
        this._logger = value;
    },


    /**
     * Carrega Schema no formato de entrada, processa Herança e gera objeto na versão final apra ser usado Pelo Migration
     * @param schema
     * @returns {*}
     */
    parser(schema){


        let parser = new SchemaParser(this._logger);

        return parser.parser(schema);


    }

};