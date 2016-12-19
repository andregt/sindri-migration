/**
 * Created by André Timermann on 06/07/16.
 *
 *
 */
'use strict';
//
// const migration = require('./lib/migration');
// const blessed = require('blessed');
// const SindriInterface = require('sindri-interface');
//
// // migration.createMigration(["/home/andre/projetos/nodejs/dia-parser/output", "/home/andre/projetos/nodejs/dia-parser/teste-heranca", "/home/andre/projetos/nodejs/dia-parser/teste-heranca2"], "data");
//
//
// class Interface extends SindriInterface {
//
//
//     constructor() {
//
//         super();
//
//         let self = this;
//
//         ///////////////////////////////////
//         // Cria um novo Menu
//         ///////////////////////////////////
//         // self.createMenu([
//         //     {
//         //         title: "Inicializa Projeto",
//         //         description: "Executa Projeto em modo desenvolvimento",
//         //         callback: function(){
//         //             self.runServer();
//         //         }
//         //     },
//         //     {
//         //         title: "Instalar Assets",
//         //         description: "Copia Arquivos estáticos das aplicações para pasta 'public'",
//         //         callback: self.installAssets
//         //     },
//         //     {
//         //         title: "Compilar Cliente",
//         //         description: "Compila aplicativos 'browse-side' (cliente) escrito em WebPack",
//         //         callback: self.compileClient
//         //     }
//         //
//         // ]);
//
//         blessed.image({
//             parent: self.interface.screen,
//             file: "/home/andre/projetos/sindri/sindri-migration/smarti_logo.png",
//             type: "ansi",
//             width: 60,
//             height: 10,
//             left: "center"
//             // ascii: true
//         });
//
//         // Carrega Scripts usando Método Legacy
//         Promise.resolve()
//
//         // .then(() => self.loadLegacyScriptsFolder('/home/andre/projetos/sindri/sindri-framework/scripts'))
//
//         // Carrega Intarfaces
//             .then(() => self.loadInterfacesFolder("/home/andre/projetos/sindri/sindri-migration/interfaces"))
//
//             // Permite carregar Interfaces em subdiretório, Adiciona um Menu
//             .then(() => self.createMainMenu());
//
//
//     }
//
//
//     // runServer() {
//     //
//     //     let self = this;
//     //
//     //     self.createStatusBar({
//     //         clock: true,
//     //         cpu: true,
//     //         memory: true
//     //     });
//     //
//     //
//     //     // Cria Box com Rotação de Log
//     //     self.createLogRotate({});
//     //
//     //     // Cria Process Stat (Statistica de uso de cpu e memoria do processo, com gráficos)
//     //     self.createProcessStat({});
//     //
//     //     // Cria Terminal (TTY/XTERM)
//     //
//     //     // Inicializa Servidor
//     //
//     //
//     // }
//     //
//     // installAssets() {
//     //
//     //     let self = this;
//     //
//     //
//     // }
//     //
//     // compileClient() {
//     //
//     //     let self = this;
//     //
//     //
//     // }
//
//
// }
//
// let screen = new Interface();
//
// screen.start();
