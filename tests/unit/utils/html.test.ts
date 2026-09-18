import { describe, expect, it } from 'vitest';
import { escapeHtml } from '../../../src/utils/html.ts';

describe('escapeHtml', () => {
    it('escapes characters that can create markup or attributes', () => {
        expect(escapeHtml(`<img src="x" onerror='run()'>`)).toBe(
            '&lt;img src=&quot;x&quot; onerror=&#39;run()&#39;&gt;'
        );
    });

    it('escapes ampersands before other entities', () => {
        expect(escapeHtml('A & B')).toBe('A &amp; B');
    });
});
