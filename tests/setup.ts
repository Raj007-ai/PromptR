import { expect } from 'bun:test';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// Add basic mocks if necessary
global.fetch = (async () => new Response('{}')) as unknown as typeof fetch;
