/**
 * Created by André Timermann on 08/12/16.
 *
 * Biblioteca para criaçãod e Migração
 *
 * TODO: Expêriencia, talvez voltar a usar classe Estática
 * TODO: Tentar Factoring ex: module.exports = { build () { AQUI INSTANCIA A CLASSE MIGRATION E RETORNA, SEM NECESSIDADE DE NEW } )
 *
 */
'use strict';

module.exports = {

    /**
     * Cria Migração
     */
    build (){

        // TODO: Organizar Projeto por Modulos e por métodos
        // TODO: Ex: LoadYaml deve ficar no createMigration ou num modulo independente
        // TODO: Criar funções pequenas, separar bem responsabilidades

        // 1) loadYamlSchema
        // 2) extendSchema (Processa Herança)
        // 3) validaSchema
        // 4) Inicializa Diretório (init_schema) caso não está configurado
        // 5) Obtém ultima revisão

        // Na verdade começa em BuildSChema (Interface, trazer para script)

        // Se existir Migração (Cria esquema)
            // Apenas salva esquema em um arquivo versionado
        // Se não inicializa Sistema de migração


        // Criar um json principal, com um ponteiro para a versão atualmente ativa

        // Log pode ser terceirizado
        // Interatividade pode ser terceirizado (inquirer, blessed) COMO? Qual melhor abordagem?

        /////////// CONSOLIDADO /////////

        // 1) Carrega Todos os YAML atuais
        // 2) COnfigura herança, cria schema com objetos já herdado
        // 3) Valida se esquema criado está OK
        // 4) Configura diretório se não tiver OK
        // 5) Salva Esquema em um JSON com versão definida

        // 6) Se Existe uma versão diferente do schema, precisamos criar um arquivo de migração
            // 6a) usar _compareTable para analisar as diferenças



        // TODO: DOcumentar para que funções sempre que possível retornar valores em vez de processar um possível this. Muito menos passar por referencia, a
        // TODO: não ser que esteja MUITO CLARO e explicico na função e argumentos ex: transformArray(array)


    },


    /**
     * Cria Próxima versão do Arquivo de Schema
     * Retorna Nova Versão
     *
     * @private
     */
    _createFileSchema(){


    },

    /**
     * Carrega Todos os arquivos Yaml em um determinado diretório e retorna um array representando os schemas
     *
     * @private
     */
    _loadYaml(){


    },


    /**
     * Processa Herança entre os esquemas
     *
     * TODO: Documentar como funciona Herança ao criar novos esquemas
     * TODO: Seprar em outra lib
     *
     * @private
     */
    _parseinheritance(){


    },


    /**
     * Valida Esquema se está definido corretamente
     * @private
     */
    _validateSchema(){


    },

    /**
     * Carrega ultima revisão disponível da Migração
     *
     * @private
     */
    _getLastRevision(){


    }


};