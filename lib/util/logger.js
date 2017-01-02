/**
 * **Created on 14/12/16**
 *
 * lib/util/debugger.js
 * @author André Timermann <andre@andregustvo.org>
 *
 * Debugger utilizado pela Sindri Migration
 *
 * - Permite reenchaminhar depuração
 * - Aceita Categoria
 * - Baseado no log4js
 *
 *
 */
'use strict';

const log4js = require('log4js');
const chalk = require('chalk');
const inspect = require('eyes').inspector({stream: null});

class Logger {

    /**
     * Construtor
     * @param customLogger    Logger deve implementar os métodos: trace, debug, info, warn, error e fatal
     * @param level     Nível de Log
     */
    constructor(customLogger, level = 'INFO') {

        if (customLogger) {
            this.logger = customLogger;
        } else {

            // REF: https://github.com/nomiddlename/log4js-node/wiki/Layouts
            log4js.configure({
                appenders: [
                    {
                        type: 'console',
                        layout: {
                            type: 'pattern',
                            pattern: '%[%d{ABSOLUTE} %-5p%] %m'
                        }
                    }
                ]
            });


            this.logger = log4js.getLogger();
            this.logger.setLevel(level);
            this.level = level;

        }

        this._category = '';

    }

    /**
     * Retorn Categoria Formatada
     *
     * @returns {*|string}
     */
    get category() {

        return chalk.blue.bold(this._category);

    }

    /**
     * Seta Categoria internamente
     * @param value {*|string}ŝ
     */
    set category(value) {
        this._category = value;
    }



    /**
     * ImprimeLog
     *
     * @param func      {function}  Função que será usada para imprimir log
     * @param input     {*}         Dados para serem impressos
     */
    print(func, input) {

        // Imprime de forma diferente para tipos complexos
        if (['string', 'number'].includes(typeof input)) {

            func.call(this.logger, `${this.category}: ${input}`);
        } else {
            func.call(this.logger, `${this.category}:\n ${inspect(input)}` );
        }

    }

    //////////////////////////////////////////////////////
    // Lista de Logs Padrão baseado no log4js
    //////////////////////////////////////////////////////
    trace(input) {

        this.print(this.logger.trace, input);

    }

    debug(input) {

        this.print(this.logger.debug, input);

    }

    info(input) {
        this.print(this.logger.info, input);

    }

    warn(input) {
        this.print(this.logger.warn, input);

    }

    error(input) {
        this.print(this.logger.error, input);

    }

    fatal(input) {
        this.print(this.logger.fatal, input);

    }


}

module.exports = Logger;
