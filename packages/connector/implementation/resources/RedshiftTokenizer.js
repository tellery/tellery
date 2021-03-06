/**
 * @see https://github.com/microsoft/monaco-languages/blob/main/src/pgsql/pgsql.ts
 * getting rid of functions of https://docs.aws.amazon.com/redshift/latest/dg/c_unsupported-postgresql-functions.html
 */

export default {
  defaultToken: '',
  ignoreCase: true,

  brackets: [
    { open: '[', close: ']', token: 'delimiter.square' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' }
  ],

  keywords: [
    'A',
    'ABORT',
    'ABS',
    'ABSENT',
    'ABSOLUTE',
    'ACCESS',
    'ACCORDING',
    'ACTION',
    'ADA',
    'ADD',
    'ADMIN',
    'AFTER',
    'AGGREGATE',
    'ALL',
    'ALLOCATE',
    'ALSO',
    'ALTER',
    'ALWAYS',
    'ANALYSE',
    'ANALYZE',
    'AND',
    'ANY',
    'ARE',
    'ARRAY',
    'ARRAY_MAX_CARDINALITY',
    'AS',
    'ASC',
    'ASENSITIVE',
    'ASSERTION',
    'ASSIGNMENT',
    'ASYMMETRIC',
    'AT',
    'ATOMIC',
    'ATTRIBUTE',
    'ATTRIBUTES',
    'AUTHORIZATION',
    'AVG',
    'BACKWARD',
    'BASE64',
    'BEFORE',
    'BEGIN',
    'BEGIN_FRAME',
    'BEGIN_PARTITION',
    'BERNOULLI',
    'BETWEEN',
    'BIGINT',
    'BINARY',
    'BIT',
    'BLOB',
    'BLOCKED',
    'BOM',
    'BOOLEAN',
    'BOTH',
    'BREADTH',
    'BY',
    'C',
    'CACHE',
    'CALL',
    'CALLED',
    'CARDINALITY',
    'CASCADE',
    'CASCADED',
    'CASE',
    'CAST',
    'CATALOG',
    'CATALOG_NAME',
    'CEIL',
    'CEILING',
    'CHAIN',
    'CHAR',
    'CHARACTER',
    'CHARACTERISTICS',
    'CHARACTERS',
    'CHARACTER_LENGTH',
    'CHARACTER_SET_CATALOG',
    'CHARACTER_SET_NAME',
    'CHARACTER_SET_SCHEMA',
    'CHAR_LENGTH',
    'CHECK',
    'CHECKPOINT',
    'CLASS',
    'CLASS_ORIGIN',
    'CLOB',
    'CLOSE',
    'CLUSTER',
    'COALESCE',
    'COBOL',
    'COLLECT',
    'COLUMN',
    'COLUMNS',
    'COLUMN_NAME',
    'COMMAND_FUNCTION',
    'COMMAND_FUNCTION_CODE',
    'COMMENT',
    'COMMENTS',
    'COMMIT',
    'COMMITTED',
    'CONCURRENTLY',
    'CONDITION',
    'CONDITION_NUMBER',
    'CONFIGURATION',
    'CONFLICT',
    'CONNECT',
    'CONNECTION',
    'CONNECTION_NAME',
    'CONSTRAINT',
    'CONSTRAINTS',
    'CONSTRAINT_CATALOG',
    'CONSTRAINT_NAME',
    'CONSTRAINT_SCHEMA',
    'CONSTRUCTOR',
    'CONTAINS',
    'CONTENT',
    'CONTINUE',
    'CONTROL',
    'CONVERSION',
    'COPY',
    'CORRESPONDING',
    'COST',
    'COUNT',
    'CREATE',
    'CROSS',
    'CSV',
    'CUBE',
    'CUME_DIST',
    'CURRENT',
    'CURRENT_DATE',
    'CURRENT_DEFAULT_TRANSFORM_GROUP',
    'CURRENT_PATH',
    'CURRENT_ROW',
    'CURRENT_SCHEMA',
    'CURRENT_TIME',
    'CURRENT_TIMESTAMP',
    'CURRENT_TRANSFORM_GROUP_FOR_TYPE',
    'CURRENT_USER',
    'CURSOR',
    'CURSOR_NAME',
    'CYCLE',
    'DATA',
    'DATABASE',
    'DATALINK',
    'DATE',
    'DATETIME_INTERVAL_CODE',
    'DATETIME_INTERVAL_PRECISION',
    'DAY',
    'DB',
    'DEALLOCATE',
    'DEC',
    'DECIMAL',
    'DECLARE',
    'DEFAULT',
    'DEFAULTS',
    'DEFERRABLE',
    'DEFERRED',
    'DEFINED',
    'DEFINER',
    'DEGREE',
    'DELETE',
    'DELIMITER',
    'DELIMITERS',
    'DENSE_RANK',
    'DEPENDS',
    'DEPTH',
    'DEREF',
    'DERIVED',
    'DESC',
    'DESCRIBE',
    'DESCRIPTOR',
    'DETERMINISTIC',
    'DIAGNOSTICS',
    'DICTIONARY',
    'DISABLE',
    'DISCARD',
    'DISCONNECT',
    'DISPATCH',
    'DISTINCT',
    'DLNEWCOPY',
    'DLPREVIOUSCOPY',
    'DLURLCOMPLETE',
    'DLURLCOMPLETEONLY',
    'DLURLCOMPLETEWRITE',
    'DLURLPATH',
    'DLURLPATHONLY',
    'DLURLPATHWRITE',
    'DLURLSCHEME',
    'DLURLSERVER',
    'DLVALUE',
    'DO',
    'DOCUMENT',
    'DOMAIN',
    'DOUBLE',
    'DROP',
    'DYNAMIC',
    'DYNAMIC_FUNCTION',
    'DYNAMIC_FUNCTION_CODE',
    'EACH',
    'ELEMENT',
    'ELSE',
    'EMPTY',
    'ENABLE',
    'ENCODING',
    'ENCRYPTED',
    'END',
    'END-EXEC',
    'END_FRAME',
    'END_PARTITION',
    'ENFORCED',
    'ENUM',
    'EQUALS',
    'ESCAPE',
    'EVENT',
    'EVERY',
    'EXCEPT',
    'EXCEPTION',
    'EXCLUDE',
    'EXCLUDING',
    'EXCLUSIVE',
    'EXEC',
    'EXECUTE',
    'EXISTS',
    'EXP',
    'EXPLAIN',
    'EXPRESSION',
    'EXTENSION',
    'EXTERNAL',
    'EXTRACT',
    'FALSE',
    'FAMILY',
    'FETCH',
    'FILE',
    'FILTER',
    'FINAL',
    'FIRST',
    'FIRST_VALUE',
    'FLAG',
    'FLOAT',
    'FLOOR',
    'FOLLOWING',
    'FOR',
    'FORCE',
    'FOREIGN',
    'FORTRAN',
    'FORWARD',
    'FOUND',
    'FRAME_ROW',
    'FREE',
    'FREEZE',
    'FROM',
    'FS',
    'FULL',
    'FUNCTION',
    'FUNCTIONS',
    'FUSION',
    'G',
    'GENERAL',
    'GENERATED',
    'GET',
    'GLOBAL',
    'GO',
    'GOTO',
    'GRANT',
    'GRANTED',
    'GREATEST',
    'GROUP',
    'GROUPING',
    'GROUPS',
    'HANDLER',
    'HAVING',
    'HEADER',
    'HEX',
    'HIERARCHY',
    'HOLD',
    'HOUR',
    'ID',
    'IDENTITY',
    'IF',
    'IGNORE',
    'ILIKE',
    'IMMEDIATE',
    'IMMEDIATELY',
    'IMMUTABLE',
    'IMPLEMENTATION',
    'IMPLICIT',
    'IMPORT',
    'IN',
    'INCLUDING',
    'INCREMENT',
    'INDENT',
    'INDICATOR',
    'INHERIT',
    'INHERITS',
    'INITIALLY',
    'INLINE',
    'INNER',
    'INOUT',
    'INPUT',
    'INSENSITIVE',
    'INSERT',
    'INSTANCE',
    'INSTANTIABLE',
    'INSTEAD',
    'INT',
    'INTEGER',
    'INTEGRITY',
    'INTERSECT',
    'INTERSECTION',
    'INTERVAL',
    'INTO',
    'INVOKER',
    'IS',
    'ISNULL',
    'ISOLATION',
    'JOIN',
    'K',
    'KEY',
    'KEY_MEMBER',
    'KEY_TYPE',
    'LABEL',
    'LAG',
    'LANGUAGE',
    'LARGE',
    'LAST',
    'LAST_VALUE',
    'LATERAL',
    'LEAD',
    'LEADING',
    'LEAKPROOF',
    'LEAST',
    'LEFT',
    'LENGTH',
    'LEVEL',
    'LIBRARY',
    'LIKE',
    'LIKE_REGEX',
    'LIMIT',
    'LINK',
    'LISTEN',
    'LN',
    'LOAD',
    'LOCAL',
    'LOCALTIME',
    'LOCALTIMESTAMP',
    'LOCATION',
    'LOCATOR',
    'LOCK',
    'LOCKED',
    'LOGGED',
    'LOWER',
    'M',
    'MAP',
    'MAPPING',
    'MATCH',
    'MATCHED',
    'MATERIALIZED',
    'MAX',
    'MAXVALUE',
    'MAX_CARDINALITY',
    'MEMBER',
    'MERGE',
    'MESSAGE_LENGTH',
    'MESSAGE_OCTET_LENGTH',
    'MESSAGE_TEXT',
    'METHOD',
    'MIN',
    'MINUTE',
    'MINVALUE',
    'MOD',
    'MODE',
    'MODIFIES',
    'MODULE',
    'MONTH',
    'MORE',
    'MOVE',
    'MULTISET',
    'MUMPS',
    'NAME',
    'NAMES',
    'NAMESPACE',
    'NATIONAL',
    'NATURAL',
    'NCHAR',
    'NCLOB',
    'NESTING',
    'NEW',
    'NEXT',
    'NFC',
    'NFD',
    'NFKC',
    'NFKD',
    'NIL',
    'NO',
    'NONE',
    'NORMALIZE',
    'NORMALIZED',
    'NOT',
    'NOTHING',
    'NOTIFY',
    'NOTNULL',
    'NOWAIT',
    'NTH_VALUE',
    'NTILE',
    'NULL',
    'NULLABLE',
    'NULLIF',
    'NULLS',
    'NUMBER',
    'NUMERIC',
    'OBJECT',
    'OCCURRENCES_REGEX',
    'OCTETS',
    'OCTET_LENGTH',
    'OF',
    'OFF',
    'OFFSET',
    'OIDS',
    'OLD',
    'ON',
    'ONLY',
    'OPEN',
    'OPERATOR',
    'OPTION',
    'OPTIONS',
    'OR',
    'ORDER',
    'ORDERING',
    'ORDINALITY',
    'OTHERS',
    'OUT',
    'OUTER',
    'OUTPUT',
    'OVER',
    'OVERLAPS',
    'OVERRIDING',
    'OWNED',
    'OWNER',
    'P',
    'PAD',
    'PARALLEL',
    'PARAMETER',
    'PARAMETER_MODE',
    'PARAMETER_NAME',
    'PARAMETER_ORDINAL_POSITION',
    'PARAMETER_SPECIFIC_CATALOG',
    'PARAMETER_SPECIFIC_NAME',
    'PARAMETER_SPECIFIC_SCHEMA',
    'PARSER',
    'PARTIAL',
    'PARTITION',
    'PASCAL',
    'PASSING',
    'PASSTHROUGH',
    'PASSWORD',
    'PATH',
    'PERCENT',
    'PERCENTILE_CONT',
    'PERCENTILE_DISC',
    'PERCENT_RANK',
    'PERIOD',
    'PERMISSION',
    'PLACING',
    'PLANS',
    'PLI',
    'POLICY',
    'PORTION',
    'POSITION',
    'POSITION_REGEX',
    'POWER',
    'PRECEDES',
    'PRECEDING',
    'PRECISION',
    'PREPARE',
    'PREPARED',
    'PRESERVE',
    'PRIMARY',
    'PRIOR',
    'PRIVILEGES',
    'PROCEDURAL',
    'PROCEDURE',
    'PROGRAM',
    'PUBLIC',
    'QUOTE',
    'RANGE',
    'RANK',
    'READ',
    'READS',
    'REAL',
    'REASSIGN',
    'RECHECK',
    'RECOVERY',
    'RECURSIVE',
    'REF',
    'REFERENCES',
    'REFERENCING',
    'REFRESH',
    'REINDEX',
    'RELATIVE',
    'RELEASE',
    'RENAME',
    'REPEATABLE',
    'REPLACE',
    'REPLICA',
    'REQUIRING',
    'RESET',
    'RESPECT',
    'RESTART',
    'RESTORE',
    'RESTRICT',
    'RESULT',
    'RETURN',
    'RETURNED_CARDINALITY',
    'RETURNED_LENGTH',
    'RETURNED_OCTET_LENGTH',
    'RETURNED_SQLSTATE',
    'RETURNING',
    'RETURNS',
    'REVOKE',
    'RIGHT',
    'ROLLBACK',
    'ROLLUP',
    'ROUTINE',
    'ROUTINE_CATALOG',
    'ROUTINE_NAME',
    'ROUTINE_SCHEMA',
    'ROW',
    'ROWS',
    'ROW_COUNT',
    'ROW_NUMBER',
    'RULE',
    'SAVEPOINT',
    'SCALE',
    'SCHEMA',
    'SCHEMA_NAME',
    'SCOPE',
    'SCOPE_CATALOG',
    'SCOPE_NAME',
    'SCOPE_SCHEMA',
    'SCROLL',
    'SEARCH',
    'SECOND',
    'SECTION',
    'SECURITY',
    'SELECT',
    'SELECTIVE',
    'SELF',
    'SENSITIVE',
    'SEQUENCE',
    'SEQUENCES',
    'SERIALIZABLE',
    'SERVER',
    'SERVER_NAME',
    'SESSION',
    'SESSION_USER',
    'SET',
    'SETOF',
    'SETS',
    'SHARE',
    'SHOW',
    'SIMILAR',
    'SIMPLE',
    'SIZE',
    'SKIP',
    'SMALLINT',
    'SNAPSHOT',
    'SOME',
    'SOURCE',
    'SPACE',
    'SPECIFIC',
    'SPECIFICTYPE',
    'SPECIFIC_NAME',
    'SQL',
    'SQLCODE',
    'SQLERROR',
    'SQLEXCEPTION',
    'SQLSTATE',
    'SQLWARNING',
    'SQRT',
    'STABLE',
    'STANDALONE',
    'START',
    'STATE',
    'STATEMENT',
    'STATIC',
    'STATISTICS',
    'STDDEV_POP',
    'STDDEV_SAMP',
    'STDIN',
    'STDOUT',
    'STORAGE',
    'STRICT',
    'STRIP',
    'STRUCTURE',
    'STYLE',
    'SUBCLASS_ORIGIN',
    'SUBMULTISET',
    'SUBSTRING',
    'SUBSTRING_REGEX',
    'SUCCEEDS',
    'SUM',
    'SYMMETRIC',
    'SYSID',
    'SYSTEM',
    'SYSTEM_TIME',
    'SYSTEM_USER',
    'T',
    'TABLE',
    'TABLES',
    'TABLESAMPLE',
    'TABLESPACE',
    'TABLE_NAME',
    'TEMP',
    'TEMPLATE',
    'TEMPORARY',
    'TEXT',
    'THEN',
    'TIES',
    'TIME',
    'TIMESTAMP',
    'TIMEZONE_HOUR',
    'TIMEZONE_MINUTE',
    'TO',
    'TOKEN',
    'TOP_LEVEL_COUNT',
    'TRAILING',
    'TRANSACTION',
    'TRANSACTIONS_COMMITTED',
    'TRANSACTIONS_ROLLED_BACK',
    'TRANSACTION_ACTIVE',
    'TRANSFORM',
    'TRANSFORMS',
    'TRANSLATE',
    'TRANSLATE_REGEX',
    'TRANSLATION',
    'TREAT',
    'TRIM',
    'TRIM_ARRAY',
    'TRUE',
    'TRUNCATE',
    'TRUSTED',
    'TYPE',
    'TYPES',
    'UESCAPE',
    'UNBOUNDED',
    'UNCOMMITTED',
    'UNDER',
    'UNENCRYPTED',
    'UNION',
    'UNIQUE',
    'UNKNOWN',
    'UNLINK',
    'UNLISTEN',
    'UNLOGGED',
    'UNNAMED',
    'UNNEST',
    'UNTIL',
    'UNTYPED',
    'UPDATE',
    'UPPER',
    'URI',
    'USAGE',
    'USER',
    'USER_DEFINED_TYPE_CATALOG',
    'USER_DEFINED_TYPE_CODE',
    'USER_DEFINED_TYPE_NAME',
    'USER_DEFINED_TYPE_SCHEMA',
    'USING',
    'VACUUM',
    'VALID',
    'VALIDATE',
    'VALIDATOR',
    'VALUE',
    'VALUES',
    'VALUE_OF',
    'VARBINARY',
    'VARCHAR',
    'VARIADIC',
    'VARYING',
    'VAR_POP',
    'VAR_SAMP',
    'VERBOSE',
    'VERSION',
    'VERSIONING',
    'VIEW',
    'VIEWS',
    'VOLATILE',
    'WHEN',
    'WHENEVER',
    'WHERE',
    'WHITESPACE',
    'WIDTH_BUCKET',
    'WINDOW',
    'WITH',
    'WITHIN',
    'WITHOUT',
    'WORK',
    'WRAPPER',
    'WRITE',
    'YEAR',
    'YES',
    'ZONE'
  ],
  operators: [
    'AND',
    'BETWEEN',
    'IN',
    'LIKE',
    'NOT',
    'OR',
    'IS',
    'NULL',
    'INTERSECT',
    'UNION',
    'INNER',
    'JOIN',
    'LEFT',
    'OUTER',
    'RIGHT'
  ],
  builtinFunctions: [
    'abs',
    'acos',
    'acosd',
    'age',
    'any',
    'ascii',
    'asin',
    'asind',
    'atan',
    'atan2',
    'atan2d',
    'atand',
    'avg',
    'bit',
    'bit_and',
    'bit_length',
    'bit_or',
    'bool_and',
    'bool_or',
    'brin_summarize_new_values',
    'btrim',
    'cbrt',
    'ceil',
    'ceiling',
    'char_length',
    'character_length',
    'chr',
    'clock_timestamp',
    'coalesce',
    'col_description',
    'concat',
    'concat_ws',
    'corr',
    'cos',
    'cosd',
    'cot',
    'cotd',
    'count',
    'covar_pop',
    'covar_samp',
    'cume_dist',
    'current_database',
    'current_date',
    'current_schema',
    'current_schemas',
    'current_setting',
    'current_time',
    'current_timestamp',
    'current_user',
    'currval',
    'date_part',
    'date_trunc',
    'decode',
    'degrees',
    'dense_rank',
    'exp',
    'extract',
    'first_value',
    'floor',
    'format_type',
    'get_bit',
    'get_byte',
    'gin_clean_pending_list',
    'greatest',
    'grouping',
    'has_any_column_privilege',
    'has_column_privilege',
    'has_database_privilege',
    'has_foreign_data_wrapper_privilege',
    'has_function_privilege',
    'has_language_privilege',
    'has_schema_privilege',
    'has_sequence_privilege',
    'has_server_privilege',
    'has_table_privilege',
    'has_tablespace_privilege',
    'has_type_privilege',
    'initcap',
    'isempty',
    'isfinite',
    'json_agg',
    'json_object',
    'json_object_agg',
    'json_populate_record',
    'json_populate_recordset',
    'json_to_record',
    'json_to_recordset',
    'jsonb_agg',
    'jsonb_object_agg',
    'lag',
    'last_value',
    'lastval',
    'lead',
    'least',
    'left',
    'length',
    'ln',
    'localtime',
    'localtimestamp',
    'log',
    'lower',
    'lower_inc',
    'lower_inf',
    'lpad',
    'ltrim',
    'make_date',
    'make_interval',
    'make_time',
    'make_timestamp',
    'make_timestamptz',
    'max',
    'md5',
    'min',
    'mod',
    'mode',
    'nextval',
    'now',
    'nth_value',
    'ntile',
    'nullif',
    'num_nonnulls',
    'num_nulls',
    'obj_description',
    'octet_length',
    'parse_ident',
    'percent_rank',
    'percentile_cont',
    'percentile_disc',
    'pi',
    'position',
    'power',
    'pqserverversion',
    'quote_ident',
    'quote_literal',
    'radians',
    'random',
    'range_merge',
    'rank',
    'regexp_replace',
    'regr_avgx',
    'regr_avgy',
    'regr_count',
    'regr_intercept',
    'regr_r2',
    'regr_slope',
    'regr_sxx',
    'regr_sxy',
    'regr_syy',
    'repeat',
    'replace',
    'reverse',
    'right',
    'round',
    'row_number',
    'row_security_active',
    'row_to_json',
    'rpad',
    'rtrim',
    'scale',
    'session_user',
    'set_bit',
    'set_byte',
    'set_config',
    'setval',
    'shobj_description',
    'sign',
    'sin',
    'sind',
    'split_part',
    'sprintf',
    'sqrt',
    'statement_timestamp',
    'stddev',
    'stddev_pop',
    'stddev_samp',
    'strip',
    'strpos',
    'substr',
    'substring',
    'sum',
    'tan',
    'tand',
    'text',
    'timeofday',
    'timezone',
    'to_ascii',
    'to_char',
    'to_date',
    'to_hex',
    'to_json',
    'to_number',
    'to_regclass',
    'to_regnamespace',
    'to_regoper',
    'to_regoperator',
    'to_regproc',
    'to_regprocedure',
    'to_regtype',
    'to_timestamp',
    'translate',
    'trim',
    'trunc',
    'upper',
    'upper_inc',
    'upper_inf',
    'unnest',
    'user',
    'var_pop',
    'var_samp',
    'variance',
    'version'
  ],
  builtinVariables: [
    // NOT SUPPORTED
  ],
  pseudoColumns: [
    // NOT SUPPORTED
  ],
  tokenizer: {
    root: [
      { include: '@comments' },
      { include: '@whitespace' },
      { include: '@pseudoColumns' },
      { include: '@numbers' },
      { include: '@strings' },
      { include: '@complexIdentifiers' },
      { include: '@scopes' },
      [/[;,.]/, 'delimiter'],
      [/[()]/, '@brackets'],
      [/\{\{[0-9a-zA-Z\-_]{21}( as \w+)?\}\}/, 'transclusion'],
      [
        /[\w@#$]+/,
        {
          cases: {
            '@keywords': 'keyword',
            '@operators': 'operator',
            '@builtinVariables': 'predefined',
            '@builtinFunctions': 'predefined',
            '@default': 'identifier'
          }
        }
      ],
      [/[<>=!%&+\-*/|~^]/, 'operator']
    ],
    whitespace: [[/\s+/, 'white']],
    comments: [
      [/--+.*/, 'comment'],
      [/\/\*/, { token: 'comment.quote', next: '@comment' }]
    ],
    comment: [
      [/[^*/]+/, 'comment'],
      // Not supporting nested comments, as nested comments seem to not be standard?
      // i.e. http://stackoverflow.com/questions/728172/are-there-multiline-comment-delimiters-in-sql-that-are-vendor-agnostic
      // [/\/\*/, { token: 'comment.quote', next: '@push' }],    // nested comment not allowed :-(
      [/\*\//, { token: 'comment.quote', next: '@pop' }],
      [/./, 'comment']
    ],
    pseudoColumns: [
      [
        /[$][A-Za-z_][\w@#$]*/,
        {
          cases: {
            '@pseudoColumns': 'predefined',
            '@default': 'identifier'
          }
        }
      ]
    ],
    numbers: [
      [/0[xX][0-9a-fA-F]*/, 'number'],
      [/[$][+-]*\d*(\.\d*)?/, 'number'],
      [/((\d+(\.\d*)?)|(\.\d+))([eE][-+]?\d+)?/, 'number']
    ],
    strings: [[/'/, { token: 'string', next: '@string' }]],
    string: [
      [/[^']+/, 'string'],
      [/''/, 'string'],
      [/'/, { token: 'string', next: '@pop' }]
    ],
    complexIdentifiers: [[/"/, { token: 'identifier.quote', next: '@quotedIdentifier' }]],
    quotedIdentifier: [
      [/[^"]+/, 'identifier'],
      [/""/, 'identifier'],
      [/"/, { token: 'identifier.quote', next: '@pop' }]
    ],
    scopes: [
      [/(BEGIN|CASE)\b/i, { token: 'keyword.block' }],
      [/END\b/i, { token: 'keyword.block' }],
      [/WHEN\b/i, { token: 'keyword.choice' }],
      [/THEN\b/i, { token: 'keyword.choice' }]
    ]
  }
}
