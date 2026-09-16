import { calculateCommercialMetrics, formatBatchExpiryDate, formatScheme, parseSchemeQuantities } from '../src/utils/commercial.utils';

describe('Commercial Metrics & Scheme Utilities', () => {
  describe('calculateCommercialMetrics (Authoritative Margin Calculation)', () => {
    it('calculates the exact user reference case accurately', () => {
      const result = calculateCommercialMetrics(194.28, 255, 5, '10+3', 5);
      expect(result.purchasedQuantity).toBe(10);
      expect(result.freeQuantity).toBe(3);
      expect(result.sellableQuantity).toBe(13);
      expect(result.purchaseCost).toBeCloseTo(1937.943, 2);
      expect(result.sellingValue).toBe(3315);
      expect(result.profit).toBeCloseTo(1377.057, 2);
      expect(result.profitPerUnit).toBeCloseTo(105.927, 2);
      expect(result.formattedProfit).toBe('₹105.93');
      expect(result.marginPercent).toBeCloseTo(41.54, 2);
      expect(result.formattedMargin).toBe('41.54%');
      expect(result.isProfit).toBe(true);
      expect(result.formattedSellingPrice).toBe('₹255.00');
    });

    it('calculates metrics with no trade scheme (single unit default)', () => {
      const result = calculateCommercialMetrics(80, 100, 10, null, 18);
      expect(result.purchasedQuantity).toBe(1);
      expect(result.freeQuantity).toBe(0);
      expect(result.sellableQuantity).toBe(1);
      expect(result.purchaseCost).toBeCloseTo(84.96, 2);
      expect(result.sellingValue).toBe(100);
      expect(result.profit).toBeCloseTo(15.04, 2);
      expect(result.profitPerUnit).toBeCloseTo(15.04, 2);
      expect(result.formattedProfit).toBe('₹15.04');
      expect(result.marginPercent).toBeCloseTo(15.04, 2);
      expect(result.isProfit).toBe(true);
    });

    it('handles zero discount and zero GST', () => {
      const result = calculateCommercialMetrics(150, 200, 0, '10+2', 0);
      expect(result.purchaseCost).toBe(1500);
      expect(result.sellingValue).toBe(2400);
      expect(result.profit).toBe(900);
      expect(result.profitPerUnit).toBe(75);
      expect(result.formattedProfit).toBe('₹75.00');
      expect(result.marginPercent).toBe(37.5);
      expect(result.formattedMargin).toBe('37.50%');
    });

    it('correctly calculates metrics for 10+1 and 9+1 schemes', () => {
      // 10+1 scheme
      const res10plus1 = calculateCommercialMetrics(100, 150, 10, '10+1', 5);
      expect(res10plus1.purchasedQuantity).toBe(10);
      expect(res10plus1.freeQuantity).toBe(1);
      expect(res10plus1.sellableQuantity).toBe(11);
      // Purchase cost = 10 * (100 * 0.90 * 1.05) = 10 * 94.5 = 945
      expect(res10plus1.purchaseCost).toBe(945);
      // Selling value = 11 * 150 = 1650
      expect(res10plus1.sellingValue).toBe(1650);
      // Scheme profit = 1650 - 945 = 705
      expect(res10plus1.profit).toBe(705);
      // Profit per strip = 705 / 11 = 64.09
      expect(res10plus1.profitPerUnit).toBeCloseTo(64.09, 2);
      expect(res10plus1.formattedProfit).toBe('₹64.09');
      // Margin % = (705 / 1650) * 100 = 42.73%
      expect(res10plus1.marginPercent).toBeCloseTo(42.73, 2);
      expect(res10plus1.formattedMargin).toBe('42.73%');

      // 9+1 scheme
      const res9plus1 = calculateCommercialMetrics(90, 120, 0, '9+1', 0);
      expect(res9plus1.purchasedQuantity).toBe(9);
      expect(res9plus1.freeQuantity).toBe(1);
      expect(res9plus1.sellableQuantity).toBe(10);
      expect(res9plus1.purchaseCost).toBe(810);
      expect(res9plus1.sellingValue).toBe(1200);
      expect(res9plus1.profit).toBe(390);
      expect(res9plus1.profitPerUnit).toBe(39);
      expect(res9plus1.formattedProfit).toBe('₹39.00');
      expect(res9plus1.marginPercent).toBe(32.5);
      expect(res9plus1.formattedMargin).toBe('32.50%');
    });

    it('handles object scheme formats such as { buy: 10, free: 2 }', () => {
      const result1 = calculateCommercialMetrics(100, 150, 0, { buy: 10, free: 2 }, 0);
      expect(result1.purchasedQuantity).toBe(10);
      expect(result1.freeQuantity).toBe(2);

      const result2 = calculateCommercialMetrics(100, 150, 0, { description: '10+2' }, 0);
      expect(result2.purchasedQuantity).toBe(10);
      expect(result2.freeQuantity).toBe(2);
    });

    it('handles negative or zero prices gracefully without throwing', () => {
      const result = calculateCommercialMetrics(0, 0, 0, null, 0);
      expect(result.marginPercent).toBe(0);
      expect(result.isProfit).toBe(true);
    });
  });

  describe('parseSchemeQuantities', () => {
    it('correctly parses 10+2 and 10 + 3', () => {
      expect(parseSchemeQuantities('10+2')).toEqual({ buy: 10, free: 2 });
      expect(parseSchemeQuantities('10 + 3')).toEqual({ buy: 10, free: 3 });
    });

    it('correctly parses Buy 10 Get 2 Free', () => {
      expect(parseSchemeQuantities('Buy 10 Get 2 Free')).toEqual({ buy: 10, free: 2 });
      expect(parseSchemeQuantities('buy 5 get 1')).toEqual({ buy: 5, free: 1 });
    });

    it('returns null for unparseable strings or empty values', () => {
      expect(parseSchemeQuantities(null)).toBeNull();
      expect(parseSchemeQuantities('')).toBeNull();
      expect(parseSchemeQuantities('No Scheme')).toBeNull();
    });
  });

  describe('formatScheme', () => {
    it('formats various scheme types nicely', () => {
      expect(formatScheme(null)).toBe('None');
      expect(formatScheme('10+2')).toBe('10+2');
      expect(formatScheme({ buy: 10, free: 2 })).toBe('10+2');
      expect(formatScheme({ text: 'Special MR Bonus' })).toBe('Special MR Bonus');
      expect(formatScheme({ description: '10+3' })).toBe('10+3');
      expect(formatScheme('{"description":"10+3"}')).toBe('10+3');
      expect(formatScheme('{"description":"9+1"}')).toBe('9+1');
      expect(formatScheme({ scheme: '9+1' })).toBe('9+1');
    });
  });

  describe('formatBatchExpiryDate', () => {
    it('formats ISO timestamps to human readable dates', () => {
      expect(formatBatchExpiryDate('2028-06-01T00:00:00.000Z')).toBe('01 Jun 2028');
      expect(formatBatchExpiryDate('2028-06-01')).toBe('01 Jun 2028');
      expect(formatBatchExpiryDate('2026-12-31')).toBe('31 Dec 2026');
    });

    it('handles month/year patterns', () => {
      expect(formatBatchExpiryDate('06/2028')).toBe('Jun 2028');
      expect(formatBatchExpiryDate('6/28')).toBe('Jun 2028');
    });

    it('handles empty or missing date gracefully', () => {
      expect(formatBatchExpiryDate(null)).toBe('');
      expect(formatBatchExpiryDate('')).toBe('');
    });
  });
});
