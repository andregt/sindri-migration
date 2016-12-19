# sindri-migration

Módulo para gerenciamento de Migrações através de Arquivos YAML e Diagrama DIA

# Componentes 

Todo Sistema de Migração é organizados nos seguintes componentes:

## 1) Dia2yaml

Componente responsável por converter diagramas dia para YAML;

É usado um módulo externo chamado dia-parser

TODO: Desenvolver o módulo para converter yaml para DIA

## 2) Schema Install

Procura schemas nos submodulos e instala ou atualiza


## 3) Migration Creator

Migration Creator é o componente responsável por criar novas migrações, carregando, processando, validando e salvando schemas schemas no formato usado interno (JSON);
Ao salvar um novo schema é gerado uma migração que é o conjunto de duas versões do schemas, e uma solução.

Desta forma o Migration Creator é dividido nos seguintes Sub-Componentes

Verifica se existe algum schema não instalado e avisa

### 3.1) Schema

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

Um caso de uso que insirou a criação deste componente é o sindri-admin, módulo administrador básico.

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

