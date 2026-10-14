import studio from '../../data/studio-catalog.json';
import external from '../../data/external-catalog.json';
import demoUsers from '../../data/users.json';
import type {CatalogItem,DemoUser} from './types.ts';
export const catalog=[...studio,...external] as unknown as CatalogItem[];
export const users=demoUsers as unknown as DemoUser[];
