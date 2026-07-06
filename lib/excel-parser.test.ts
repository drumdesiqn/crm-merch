import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseExcelBuffer } from './excel-parser';

function makeBuffer(rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buf as ArrayBuffer;
}

const BASE_ROW = {
  store_id: 'BRU001',
  store_name: 'Carrefour Express',
  store_address: 'Rue de la Loi 1',
  store_zipcode: '1000',
  store_city: 'Bruxelles',
  assortment: 'Food',
  visit_type: 'Maintenance',
  'Day Period 2': '2026-06-23',
  'Visit Frequence': 'Hebdomadaire',
  Merchandiser: 'Jean',
  'Sales rep': 'Marie',
  Remarks: 'RAS',
  Materials: 'Display',
  materialType: 'Halfmoon',
};

describe('parseExcelBuffer', () => {
  it('parses a valid row correctly', () => {
    const buf = makeBuffer([BASE_ROW]);
    const result = parseExcelBuffer(buf);

    expect(result.visits).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);

    const v = result.visits[0];
    expect(v.storeId).toBe('BRU001');
    expect(v.storeName).toBe('Carrefour Express');
    expect(v.storeCity).toBe('Bruxelles');
    expect(v.salesRep).toBe('Marie');
    expect(v.materialType).toBe('Halfmoon');
    // Date stored at UTC noon
    expect(v.visitDate.getUTCHours()).toBe(12);
    expect(v.visitDate.getUTCDate()).toBe(23);
  });

  it('produces correct week label', () => {
    const buf = makeBuffer([BASE_ROW]);
    const result = parseExcelBuffer(buf);
    // 2026-06-23 is ISO week 26
    expect(result.weekNum).toBe(26);
    expect(result.year).toBe(2026);
    expect(result.label).toBe('W26 2026');
  });

  it('filters out rows with empty store_id', () => {
    const buf = makeBuffer([
      { ...BASE_ROW, store_id: '' },
      { ...BASE_ROW, store_id: 'BRU002' },
    ]);
    const result = parseExcelBuffer(buf);
    expect(result.visits).toHaveLength(1);
    expect(result.visits[0].storeId).toBe('BRU002');
  });

  it('warns about missing store_id', () => {
    const buf = makeBuffer([{ ...BASE_ROW, store_id: '' }]);
    const result = parseExcelBuffer(buf);
    expect(result.warnings.some((w) => w.includes('store_id'))).toBe(true);
  });

  it('handles invalid date and warns', () => {
    const buf = makeBuffer([{ ...BASE_ROW, 'Day Period 2': 'not-a-date' }]);
    const result = parseExcelBuffer(buf);
    expect(result.warnings.some((w) => w.includes('date valide'))).toBe(true);
    // Falls back to today — visit still created
    expect(result.visits).toHaveLength(1);
    expect(result.visits[0].visitDate).toBeInstanceOf(Date);
  });

  it('handles null date and warns', () => {
    const buf = makeBuffer([{ ...BASE_ROW, 'Day Period 2': null }]);
    const result = parseExcelBuffer(buf);
    expect(result.warnings.some((w) => w.includes('date valide'))).toBe(true);
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = { ...BASE_ROW } as Record<string, unknown>;
    delete minimal.Merchandiser;
    delete minimal.Remarks;
    delete minimal.Materials;
    delete minimal.materialType;
    delete minimal["Visit Frequence"];
    const buf = makeBuffer([{ ...minimal, 'Day Period 2': '2026-06-23' }]);
    const result = parseExcelBuffer(buf);
    const v = result.visits[0];
    expect(v.merchandiser).toBeNull();
    expect(v.remarks).toBeNull();
    expect(v.materials).toBeNull();
    expect(v.materialType).toBeNull();
    expect(v.visitFrequence).toBeNull();
  });

  it('uses median date for week detection with multiple rows', () => {
    const rows = [
      { ...BASE_ROW, store_id: 'A', 'Day Period 2': '2026-06-22' },
      { ...BASE_ROW, store_id: 'B', 'Day Period 2': '2026-06-23' },
      { ...BASE_ROW, store_id: 'C', 'Day Period 2': '2026-06-24' },
    ];
    const buf = makeBuffer(rows);
    const result = parseExcelBuffer(buf);
    expect(result.visits).toHaveLength(3);
    // Median is 2026-06-23 → W26 2026
    expect(result.weekNum).toBe(26);
  });

  it('returns empty visits for empty sheet', () => {
    const buf = makeBuffer([]);
    const result = parseExcelBuffer(buf);
    expect(result.visits).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('trims storeId whitespace', () => {
    const buf = makeBuffer([{ ...BASE_ROW, store_id: '  BRU001  ' }]);
    const result = parseExcelBuffer(buf);
    expect(result.visits[0].storeId).toBe('BRU001');
  });

  it('defaults visitType to Maintenance when missing', () => {
    const row = { ...(BASE_ROW as Record<string, unknown>) };
    delete row.visit_type;
    const buf = makeBuffer([{ ...row, 'Day Period 2': '2026-06-23' }]);
    const result = parseExcelBuffer(buf);
    expect(result.visits[0].visitType).toBe('Maintenance');
  });

  it('rejects sheets with too many rows', () => {
    const bigRows = Array.from({ length: 5002 }, (_, i) => ({
      ...BASE_ROW,
      store_id: `ROW-${i}`,
      'Day Period 2': '2026-06-23',
    }));
    const buf = makeBuffer(bigRows);
    expect(() => parseExcelBuffer(buf)).toThrow(/trop volumineux/i);
  });

  it('clamps oversized string values', () => {
    const veryLong = 'x'.repeat(12000);
    const buf = makeBuffer([{ ...BASE_ROW, Remarks: veryLong, Materials: veryLong }]);
    const result = parseExcelBuffer(buf);
    expect(result.visits[0].remarks!.length).toBe(5000);
    expect(result.visits[0].materials!.length).toBe(2000);
  });
});