/**
 * **Created on 15/12/16**
 *
 * plugins/uiPrompt.js
 * @author André Timermann <andre@andregustvo.org>
 *
 * Plugin padrão pra interatividade com usuário.
 *
 * Por padrão é usado o Inquirer, mas é possível fornecer um plugin externo Ex Blessed
 *
 *
 */
'use strict';

const inquirer = require('inquirer');

class UiPrompt {

    constructor() {

    }

    /**
     * Dialogo de Confirmação Simples
     *
     * @param question  {string} Pergunta
     * @param def       {boolean} Valor Default
     */
    confirm(question, def = true) {

        return inquirer
            .prompt([{
                type: 'confirm',
                name: 'confirm',
                message: question,
                'default': def
            }])
            .then(result => result.confirm);

    }


    /**
     * Apresenta uma Lista pro usuario selecionar
     * @param question
     * @param list
     * @param def
     */
    checkbox(question, list, def = []) {

        return inquirer
            .prompt([{
                type: 'checkbox',
                name: 'check',
                message: question,
                choices: list,
                'default': def
            }])
            .then(result => result.check);

    }
}


module.exports = UiPrompt;