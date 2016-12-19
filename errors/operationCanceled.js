/**
 * **Created on 15/12/16**
 *
 * errors/operationCanceled.js
 * @author André Timermann <andre@andregustvo.org>
 *
 *     Representa erro de operação cancelada
 *
 */
'use strict';

class OperationCanceled extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        this.name = 'Opearation Canceled';
    }
}


module.exports = OperationCanceled;