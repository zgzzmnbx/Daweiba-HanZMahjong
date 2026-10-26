import test from 'node:test';import assert from 'node:assert/strict';import {unicodeRangeContains} from '../../apps/web/src/table-ui/deck-font';
test('font coverage accepts singleton, interval and wildcard unicode ranges without treating unrelated chunks as ready',()=>{
 assert(unicodeRangeContains('U+4E00,U+4E03-4E09',0x4e00));assert(unicodeRangeContains('U+4E00,U+4E03-4E09',0x4e08));assert(!unicodeRangeContains('U+4E00,U+4E03-4E09',0x4e01));assert(unicodeRangeContains('U+9F??',0x9f98));assert(!unicodeRangeContains('U+9F??',0x9e98));assert(unicodeRangeContains('U+20000-2FFFF',0x20001));
});
