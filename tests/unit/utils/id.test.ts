import { describe, it, expect } from 'vitest';
import { generateId } from '../../../src/utils/id.ts';

describe('generateId', () => {
    it('starts with the given prefix', () => {
        expect(generateId('job')).toMatch(/^job_/);
        expect(generateId('pal')).toMatch(/^pal_/);
    });

    it('generates unique IDs on repeated calls', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateId('x')));
        expect(ids.size).toBe(100);
    });

    it('includes a timestamp component', () => {
        const before = Date.now();
        const id = generateId('test');
        const after = Date.now();
        const parts = id.split('_');
        const ts = Number(parts[1]);
        expect(ts).toBeGreaterThanOrEqual(before);
        expect(ts).toBeLessThanOrEqual(after);
    });

    it('contains only alphanumeric chars and underscores', () => {
        const id = generateId('prefix');
        expect(id).toMatch(/^[a-z0-9_]+$/);
    });

    it('works with empty prefix', () => {
        const id = generateId('');
        expect(id).toMatch(/^_\d+_/);
    });
});
