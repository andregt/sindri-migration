# sindri-migration

SindriMigration é um sistema de migração que funciona através de arquivos YAML, que podem ser criados diretamente, ou gerados à partir de diagramas no formato DIA

# Como Usar

Primeiro você precisa criar os modelos, que representam as tabelas no banco de dados.
Você tem duas opções aqui:

* Criar os modelos diretamente em yaml
* Criar os modelos visualmente através de diagrama no formado dia

### 1) Criando Diagrama

Você deve criar os diagramas e salvar na pasta:

    data/diagram

Então pode converte-los para modelo yaml usando o comando:

    migration dia2yaml -f <nome_do_arquivo_na_pasta_diagram>

Serão criados automaticamente arquivos para cada tabela criada:

    data/model/<nome_da_tabela>.yaml

### 2) Criando Modelos


### 3) Criando Migração (Versão da base de dados)


### 4) Executando uma Migração

Quando você inicia um novo banco de dados vazio, significa que você está na revisão 0, ou seja nenhum estrutura foi criada ainda.

Para isso (por enquanto) você pode gerar a primeira versão usando o comando:

    migration reset


Ele vai apagar o banco de dados atual (cuidado) e recriar a estrutura do zero na revisão desejada (por padrão 1)

portanto execute

    migration reset

Por enquanto a migração em si ainda não foi implementado, então só lhe resta utilizar este comando parar criar nova versão da base de dados

No futuro usaremos os script up e down

# Componentes 

O Sistema de Migração é organizados nos seguintes componentes:

## 1) Dia2yaml

Responsável por converter diagramas para yaml.

É opcional, você pode gerar os modelos diretamente em yaml.

TODO: Atualmente só é possível converter diagramas em modelos yaml, implementar o caminho inverso (Atualmente caso crie em YAML, não é mais possível continuar criando diagramas)

## 2) Schema Install

Instala Modelos (yaml) localizados em modulos instalados via npm, procedimento obrigatório ao utilizar aplicações externas.


## 3) Migration Creator

Cria novas migrações, cada migração representa um estado do banco de dados ou ainda uma nova versão do banco de dados atual.
Permitindo migrar o projeto de uma versão do banco de dados para outra mais recente com facilidade.

MigrationCreator irá criar as migrações, validar e salvar internamente (JSON).
Importante notar que aqui apenas estamos criando migrações, não estamos realizando a migração.


Ao salvar um novo schema é gerado uma migração que é o conjunto de duas versões do schemas, e uma solução.
Desta forma o Migration Creator é dividido nos seguintes Sub-Componentes
Verifica se existe algum schema não instalado e avisa

### 3.1) Schemas

Componente que representa um schema, com as seguintes funções:
* Gera schemas à partir de um ou mais diretórios carregando todos os arquivos no formato yaml (cada arquivo representa uma tabela)
* Processa Herança entre diversos schemas (Não implementado)
* Valida schema
* Salva schema
* Carrega schema de um diretório

#### 3.1.1 Load Yaml Schema

Carrega Todos os schemas no formato yaml de um determinado diretório e retorna um objeto javascript 

#### 3.1.2 Processador de Herança

Processa todas as heranças defina nos  schemas carregado 
Lembrando que quando schema herda um schema pai, o schema pai é desconsiderado.

E se eu quise ter duas versões do mesmo schema?

#### 3.1.3 Validação de Schema

Valida se o schema está correto


### 3.2) Schema Diff

Compara dois schemas e retorna a diferença entre eles em formato json

### 3.3) Solution Creator

Processa a diferença e gera uma solução, salvando em formato Javascript, para que possa
ser facilmente manipulado pelo usuário



## 4 Migration

Manipula Migrações, lista todas as migrações disponíveis por id e data e executa o processo de migração 

# Entendendo a Aplicabilidade da Herança

Um caso de uso que inspirou a criação deste componente é o sindri-admin, módulo administrador básico.

Muitos casos nosso projeto já precisa de um administrador parecido, porém com alguns campos diferentes.
Neste caso usamos a herança pra reaproveitar o schema já definido e aplicar algumas alterações

**Alternativa**: apenas copiar os schemas e adaptar
**Problema:** Se houver alguma atualização do admin, essa atualização é perdida
    Isso é ruim ou bom? pode ser que a atualização quebre o sistema, neste caso melhor fazer ajuste manual


# Estrutura de Arquivos

Por padrão as migrações são salvas no diretório **/data** à partir do diretório corrente.
Dentro de /data temos os seguintes diretórios:


|                    | Descrição                                                                                                                                                                                                                                                                                              |
|--------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| config.json        | Contém configuração da migração. Ex: qual migração atual                                                                                                                                                                                                                                               |
| /backup            | Toda operação gera um backup no formato:<br>  **backup-[YYYYMMDDHHmmSS]-[NUMERO_SEQUENCIAL_DE_5_DIGITOS].sql.gz**<br> (Gera No formato Binário ou sql compatado gzip)                                                                                                                                  |
| /diagram           | Arquivos Diagrama no formato dia.                                                                                                                                                                                                                                                                      |
| /sql               | Quando migração for gerada para arquivo sql, será salvo aqui no formato:<br> **sql-[YYYYMMDDHHmmSS]-[NUMERO_SEQUENCIAL_DE_5_DIGITOS].sql**<br>                                                                                                                                                             |
| /models            | Modelo do banco de dados no formato yaml, deve ter o nome **table.yaml**                                                                                                                                                                                                                                   |
| /migration/schemas | Snapshot do banco de dados através dos schemas, é gerado automaticamente ao criar as migração, é versionado e salvo no formato: <br>**schema-[YYYYMMDDHHmmSS]-[NUMERO_SEQUENCIAL_DE_5_DIGITOS].json**<br>                                                                                                  |
| /migration/scripts | Scripts usado para realizar migração entre uma versão para outra, pode ser totalmente ou parcialmente gerado. Pode ser customizado manualmente editando o arquivo diretamente. Será criado nos formatos: <br>**migration-[VERSÃO_ANTIGA]-[VERSÃO_NOVA].js**<br> Para cada migração teremos 2 arquivos (Up e Down). |

**Nota**: Está configuração pode ser personalizada

***TODO:***
* Criar data-00001.sql para gerar novos datos (pensar melhor)




#### Módulo dia-parser
* dia2yaml (Implementado)
* yaml2dia (Não Implementado)

