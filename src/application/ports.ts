import type { Block, DayRecord, Project, Section } from '../domain/entities';
import type { DomainEvent } from '../domain/events';

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(): string;
}

export interface Repository<T> {
  get(key: string): Promise<T | undefined>;
  put(entity: T): Promise<void>;
}

/** Everything a use case can touch inside one atomic unit of work. */
export interface StoreTransaction {
  blocks: Repository<Block>;
  sections: Repository<Section>;
  projects: Repository<Project>;
  days: Repository<DayRecord>;
  appendEvent(event: DomainEvent): Promise<void>;
}

export interface Store {
  /**
   * Runs `work` atomically: entity changes and their events are saved together,
   * or nothing is saved if `work` throws.
   */
  transaction<T>(work: (tx: StoreTransaction) => Promise<T>): Promise<T>;
}

export interface AppContext {
  store: Store;
  clock: Clock;
  ids: IdGenerator;
}
