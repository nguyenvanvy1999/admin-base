import { Entity, Property } from '@mikro-orm/core';
import { BaseEntity } from './base-entity';

@Entity()
export class User extends BaseEntity {
  constructor() {
    super();
  }

  @Property()
  username!: string;

  @Property()
  password!: string;

  @Property()
  role!: string;
}
