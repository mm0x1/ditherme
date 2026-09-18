import { describe, expect, it } from 'vitest';
import { getApprovedExternalURL } from '../../../electron/external-links.ts';

describe('getApprovedExternalURL', () => {
    it('allows the repository and issue tracker URLs', () => {
        expect(getApprovedExternalURL('https://github.com/mm0x1/ditherme')).toBe(
            'https://github.com/mm0x1/ditherme'
        );
        expect(getApprovedExternalURL('https://github.com/mm0x1/ditherme/issues')).toBe(
            'https://github.com/mm0x1/ditherme/issues'
        );
    });

    it('rejects other hosts, paths, and protocols', () => {
        expect(getApprovedExternalURL('https://example.com')).toBeNull();
        expect(getApprovedExternalURL('https://github.com/mm0x1/ditherme/wiki')).toBeNull();
        expect(getApprovedExternalURL('http://github.com/mm0x1/ditherme')).toBeNull();
        expect(getApprovedExternalURL('file:///tmp/example')).toBeNull();
        expect(getApprovedExternalURL('javascript:alert(1)')).toBeNull();
    });
});
