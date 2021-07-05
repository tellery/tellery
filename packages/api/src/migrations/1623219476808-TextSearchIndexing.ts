import config from 'config'
import { MigrationInterface, QueryRunner } from 'typeorm'
import { getParticiple, PostgreSQLConfig } from '../clients/db/orm'
import { BlockType } from '../types/block'

export class TextSearchIndexing1623219476808 implements MigrationInterface {
  private readonly searchIndexName = 'block_searchable_text_idx'

  private readonly regIndexName = 'searchable_text_trgm_idx'

  private readonly textSendFunctionName = 'textsend_i'

  public async up(queryRunner: QueryRunner): Promise<void> {
    const cfg = config.get<PostgreSQLConfig>('postgres')
    if (cfg.searchPlugin && cfg.searchLanguage) {
      // create extensions
      await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS ${cfg.searchPlugin}; 
        DO
            $$BEGIN
            CREATE TEXT SEARCH CONFIGURATION ${cfg.searchLanguage} (PARSER = ${cfg.searchPlugin});
            ALTER TEXT SEARCH CONFIGURATION ${cfg.searchLanguage} ADD MAPPING FOR n,v,a,i,e,l,t,r WITH simple;
            EXCEPTION
            WHEN unique_violation THEN
                NULL;
            END;
        $$;`)
    }
    const p = getParticiple(cfg)
    // create gin index on blocks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ${this.getIndexName(
        cfg,
      )} ON blocks USING GIN (to_tsvector('${p}', "blocks"."searchableText"));`,
    )

    // create gin index on question blocks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS ${this.getIndexName(
        cfg,
      )}_sql ON blocks USING GIN (to_tsvector('${p}', "blocks"."content"->>'sql')) WHERE type='${
        BlockType.QUESTION
      }';`,
    )

    // regex index
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION ${this.textSendFunctionName} (text) RETURNS bytea AS $$    
        select textsend(lower($1));    
      $$ LANGUAGE sql STRICT IMMUTABLE;`)
    await queryRunner.query(
      `CREATE INDEX ${this.regIndexName} ON blocks USING GIN(text(${this.textSendFunctionName}("searchableText")) gin_trgm_ops);`,
    )
    // create gin index on question blocks
    await queryRunner.query(
      `CREATE INDEX ${this.regIndexName}_sql ON blocks USING GIN(text(${this.textSendFunctionName}("content"->>'sql')) gin_trgm_ops);`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const cfg = config.get<PostgreSQLConfig>('postgres')
    // drop index before search configuration, because it depends on search configuration
    await queryRunner.query(`DROP INDEX IF EXISTS ${this.getIndexName(cfg)}`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${this.getIndexName(cfg)}_sql`)

    if (cfg.searchPlugin && cfg.searchLanguage) {
      await queryRunner.query(`DROP TEXT SEARCH CONFIGURATION IF EXISTS ${cfg.searchLanguage}`)
      // await queryRunner.query(`DROP EXTENSION IF EXISTS ${cfg.searchPlugin}`)
    }

    await queryRunner.query(`DROP INDEX IF EXISTS ${this.regIndexName}`)
    await queryRunner.query(`DROP INDEX IF EXISTS ${this.regIndexName}_sql`)
    await queryRunner.query(`DROP FUNCTION IF EXISTS ${this.textSendFunctionName}`)
  }

  private getIndexName(cfg: PostgreSQLConfig) {
    return `${getParticiple(cfg)}_${this.searchIndexName}`
  }
}
