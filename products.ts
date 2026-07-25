import type { CustomerType, Product, UnitType } from '../db/types';

export function getTierPrice(product: Product, customerType: CustomerType | 'walkin'): number {
  switch (customerType) {
    case 'wholesale':
      return product.prices.wholesale;
    case 'semi':
      return product.prices.semiWholesale;
    case 'retail':
    case 'walkin':
    default:
      return product.prices.retail;
  }
}

export function getUnitPrice(
  product: Product,
  unit: UnitType,
  customerType: CustomerType | 'walkin',
): number {
  const cartonFactor = product.units.carton.factor;
  const tierCartonPrice = getTierPrice(product, customerType);
  const unitFactor = product.units[unit].factor;
  return Math.round((tierCartonPrice / cartonFactor) * unitFactor * 100) / 100;
}

export function piecesFromSale(unit: UnitType, quantity: number, product: Product): number {
  return quantity * product.units[unit].factor;
}

export function stockLabel(pieces: number, product: Product): string {
  const cartons = Math.floor(pieces / product.units.carton.factor);
  const rest = pieces % product.units.carton.factor;
  if (rest === 0) return `${cartons} كرتونة`;
  return `${cartons} ك + ${rest} قطعة`;
}

export function isLowStock(product: Product): boolean {
  return product.stockPieces <= product.minStockPieces;
}
