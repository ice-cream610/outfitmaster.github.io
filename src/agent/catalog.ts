import merchant from '../../data/merchant-catalog.json';
import demoUsers from '../../data/merchant-users.json';
import type {CatalogItem,DemoUser} from './types.ts';
export const catalog=merchant as unknown as CatalogItem[];
export const users=demoUsers as unknown as DemoUser[];
