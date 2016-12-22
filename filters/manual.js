/**
 * **Created on 17/07/16**
 *
 * sindri-migration/filters/manual.js
 *
 * @author André Timermann <andre@andregustvo.org>
 *
 */
'use strict';

class ManualMigrationFilter {


    /**
     * Verifica se este filtro pro tratar a Inconscistência passada
     *
     * @param type  Tipo de Inconscistnecia, podendo ser 'column', 'relation' ou 'index'
     * @param info
     */
    static match(type, info) {

        return true;

    }

    static getName() {
        return 'Criar Função';
    }
}


module.exports = ManualMigrationFilter;