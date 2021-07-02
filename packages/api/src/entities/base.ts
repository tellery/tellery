import {
  BaseEntity,
  CreateDateColumn,
  Generated,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm'

export abstract class TelleryBaseWithoutIdEntity extends BaseEntity {
  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @VersionColumn()
  version!: number
}

export abstract class TelleryBaseEntity extends TelleryBaseWithoutIdEntity {
  @PrimaryColumn()
  @Generated('uuid')
  id!: string
}
