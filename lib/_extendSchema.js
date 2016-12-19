/**
 * **Created on 07/07/16**
 *
 * Classe Estática para processar herança entre esquemas no Sindri
 *
 * lib/extendSchema.js
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

const _ = require('lodash');

class ExtendSchema {

    /**
     * Processa Herança de Esquemas
     *
     * @param schemas
     */
    static extendSchema(schemas, ui) {

        let self = this;

        let result = {};

        // Agrupa por nome
        let groups = _.groupBy(schemas, (e) => e.name);


        _.each(groups, function (group) {

            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Se o grupo tiver apenas um elemento, não existe herança de schema
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (group.length === 1) {

                if (result[group[0].name]) {
                    throw  new Error(`Schema '${result[group[0].name]}' está duplicado!"`);
                }

                result[group[0].name] = group[0];
                ui.output.info(group[0].name);

            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            // Existe Herança
            ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            else {


                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Indexa Grupo pelo nome ou pelo alias, todos os schema q extendem outro deve ter um alias ou será levantado exceção
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                let indexedGroup = _.reduce(group, function (indexedGroup, schema) {

                    if (schema.extend && !schema.alias) {
                        throw  new Error(`Schema '${schema.name}', que estende ${schema.extend}, deve ter obrigatóriamente um alias"`);
                    }

                    if (schema.alias) {

                        // Valida schema Repetido
                        if (indexedGroup[schema.alias]) {
                            throw  new Error(`Schema '${schema.alias}' está duplicado, verifique se existe um schema com o nome do alias que criou"`);
                        }

                        indexedGroup[schema.alias] = schema;
                    } else {

                        // Valida schema Repetido
                        if (indexedGroup[schema.name]) {
                            throw  new Error(`Schema '${schema.name}' está duplicado, verifique se existe um alias com o nome do schema que criou"`);
                        }

                        indexedGroup[schema.name] = schema;
                    }

                    return indexedGroup;

                }, {});

                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Processa Herança
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                let treeInheritance = self._getsInheritance(indexedGroup);

                let resultInheritance = _.defaultsDeep.apply(_.defaultsDeep, _.reverse(treeInheritance));

                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Limpa registros removidos (quando no filho é definido como null)
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

                _.each(resultInheritance.columns, function (value, key) {
                    if (value === null) {
                        delete resultInheritance.columns[key];
                    }
                });
                _.each(resultInheritance.relations, function (value, key) {
                    if (value === null) {
                        delete resultInheritance.relations[key];
                    }
                });
                _.each(resultInheritance.indexes, function (value, key) {
                    if (value === null) {
                        delete resultInheritance.relations[key];
                    }
                });


                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                // Renomeia se exigado, Salva
                ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                /**
                 * Permite renomear o nome da tabela
                 */
                let rename = resultInheritance.rename;

                // Remove atributos que não serão mais utilizados
                delete resultInheritance.extend;
                delete resultInheritance.alias;
                delete resultInheritance.rename;

                result[rename || resultInheritance.name] = resultInheritance;

                ui.output.info(rename || resultInheritance.name);

            }


        });

        return result;


    }


    /**
     * Cria uma lista de Registros herdaveis, ordenado do pai para o filho
     *
     * @param indexedGroup
     * @returns {Array}
     * @private
     */
    static _getsInheritance(indexedGroup) {


        let newSchema = {};

        /**
         * Arvore de Herança (Lista em ordem da base para os herdados)
         * @type {Array}
         */
        let tree = [];

        /**
         * Nome do pai cujo filho será buscaso
         */
        let childrenOf;

        // Procura a Base
        _.each(indexedGroup, function (schema) {

            if (!schema.extend) {

                tree.push(schema);
                childrenOf = schema.name;

            } else {

                ////////////////////////////////////////////////
                // Apenas valida se Pai existe
                let found = false;

                _.each(indexedGroup, function (s) {

                    if (schema.extend === s.name || schema.extend === s.alias) {
                        found = true;
                    }

                });

                if (!found) {
                    throw new Error(`No Schema '${schema.alias}', não foi possível encontrar o schema pai: '${schema.extend}'!`);
                }
                ////////////////////////////////////////////////

            }

        });

        if (tree.length === 0) {
            throw new Error(`Não foi possível encontrar um schema base!`);
        }

        // Procura Filhos
        let found;
        do {

            found = false;

            // Procura a Base
            _.each(indexedGroup, function (schema) {

                if (schema.extend && schema.extend === childrenOf) {
                    tree.push(schema);
                    childrenOf = schema.alias;
                    found = true;

                    // Sai do loop (_.each)
                    return false;
                }

            });


        } while (found);

        return tree;


    }
}


module.exports = ExtendSchema;