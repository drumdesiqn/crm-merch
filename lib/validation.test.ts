import { describe, it, expect } from 'vitest';
import { CreateStoreSchema, CreateVisitSchema, validate } from './validation';

describe('CreateStoreSchema', () => {
  it('validates a complete store', () => {
    const result = validate(CreateStoreSchema, {
      storeId: "BRU001",
      storeName: "Carrefour Express",
      storeAddress: "Rue de la Loi 1",
      storeZipcode: "1000",
      storeCity: "Bruxelles",
      assortment: "Food",
      visitType: "Maintenance",
      visitFrequence: "Hebdomadaire",
    });
    expect(result.success).toBe(true);
  });

  it('rejects a store without required fields', () => {
    const result = validate(CreateStoreSchema, {
      storeId: "",
      storeName: "",
      storeAddress: "",
      storeZipcode: "",
      storeCity: "",
    });
    expect(result.success).toBe(false);
  });
});

describe('CreateVisitSchema', () => {
  it('validates a visit with storeId and date', () => {
    const result = validate(CreateVisitSchema, {
      storeId: "BRU001",
      visitDate: "2026-06-30",
    });
    expect(result.success).toBe(true);
  });

  it('rejects a visit without storeId', () => {
    const result = validate(CreateVisitSchema, {
      visitDate: "2026-06-30",
    });
    expect(result.success).toBe(false);
  });
});
