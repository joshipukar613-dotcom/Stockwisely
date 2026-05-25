import { getAvailableCategories } from '../utils/categoryDetection';

export const initialProducts = [
  {
    id: 1,
    name: 'Samsung Galaxy S24',
    sku: 'SGS24-001',
    description: 'Latest Samsung flagship smartphone',
    category: 'Electronics',
    stock: 45,
    minStock: 10,
    price: 125000,
    averagePrice: 125000,
    totalBatches: 1,
    nearestExpiryDate: null,
    supplier: 'Samsung Nepal',
    location: 'A-1-001',
    batches: [
      {
        id: 'batch-1-1',
        batchNumber: 'BATCH-001',
        quantity: 45,
        quantityRemaining: 45,
        purchasePrice: 125000,
        purchaseDate: '2024-01-15',
        expiryDate: null,
        isExpired: false
      }
    ]
  },
  {
    id: 2,
    name: 'iPhone 15 Pro',
    sku: 'IP15P-001',
    description: 'Apple iPhone 15 Pro 256GB',
    category: 'Electronics',
    stock: 8,
    minStock: 15,
    price: 185000,
    averagePrice: 185000,
    totalBatches: 1,
    nearestExpiryDate: null,
    supplier: 'Apple Store Nepal',
    location: 'A-1-002',
    batches: [
      {
        id: 'batch-2-1',
        batchNumber: 'BATCH-001',
        quantity: 8,
        quantityRemaining: 8,
        purchasePrice: 185000,
        purchaseDate: '2024-01-20',
        expiryDate: null,
        isExpired: false
      }
    ]
  },
  {
    id: 3,
    name: 'MacBook Air M2',
    sku: 'MBA-M2-001',
    description: '13-inch MacBook Air with M2 chip',
    category: 'Electronics',
    stock: 0,
    minStock: 5,
    price: 165000,
    averagePrice: 165000,
    totalBatches: 1,
    nearestExpiryDate: null,
    supplier: 'Apple Store Nepal',
    location: 'A-2-001',
    batches: [
      {
        id: 'batch-3-1',
        batchNumber: 'BATCH-001',
        quantity: 0,
        quantityRemaining: 0,
        purchasePrice: 165000,
        purchaseDate: '2024-01-10',
        expiryDate: null,
        isExpired: false
      }
    ]
  },
  {
    id: 4,
    name: 'Dell XPS 13',
    sku: 'DXS13-001',
    description: 'Dell XPS 13 Laptop Intel i7',
    category: 'Electronics',
    stock: 12,
    minStock: 8,
    price: 145000,
    averagePrice: 145000,
    totalBatches: 1,
    nearestExpiryDate: null,
    supplier: 'Dell Nepal',
    location: 'A-2-002',
    batches: [
      {
        id: 'batch-4-1',
        batchNumber: 'BATCH-001',
        quantity: 12,
        quantityRemaining: 12,
        purchasePrice: 145000,
        purchaseDate: '2024-01-18',
        expiryDate: null,
        isExpired: false
      }
    ]
  },
  {
    id: 5,
    name: 'Nike Air Max',
    sku: 'NAM-001',
    description: 'Nike Air Max Running Shoes',
    category: 'Sports',
    stock: 25,
    minStock: 20,
    price: 15000,
    averagePrice: 15000,
    totalBatches: 1,
    nearestExpiryDate: null,
    supplier: 'Nike Nepal',
    location: 'B-1-001',
    batches: [
      {
        id: 'batch-5-1',
        batchNumber: 'BATCH-001',
        quantity: 25,
        quantityRemaining: 25,
        purchasePrice: 15000,
        purchaseDate: '2024-01-12',
        expiryDate: null,
        isExpired: false
      }
    ]
  },
  {
    id: 6,
    name: 'Organic Milk 1L',
    sku: 'MILK-ORG-001',
    description: 'Fresh organic milk 1 liter',
    category: 'Food & Beverages',
    stock: 48,
    minStock: 10,
    price: 120,
    averagePrice: 115,
    totalBatches: 2,
    nearestExpiryDate: '2024-02-15',
    supplier: 'Dairy Farm Nepal',
    location: 'C-1-001',
    batches: [
      {
        id: 'batch-6-1',
        batchNumber: 'BATCH-001',
        quantity: 24,
        quantityRemaining: 24,
        purchasePrice: 110,
        purchaseDate: '2024-01-20',
        expiryDate: '2024-02-15',
        isExpired: false
      },
      {
        id: 'batch-6-2',
        batchNumber: 'BATCH-002',
        quantity: 24,
        quantityRemaining: 24,
        purchasePrice: 120,
        purchaseDate: '2024-01-25',
        expiryDate: '2024-02-20',
        isExpired: false
      }
    ]
  },
  {
    id: 7,
    name: 'Vitamin C Tablets',
    sku: 'VIT-C-001',
    description: 'Vitamin C 500mg tablets, 100 count',
    category: 'Health & Beauty',
    stock: 15,
    minStock: 5,
    price: 800,
    averagePrice: 800,
    totalBatches: 1,
    nearestExpiryDate: '2025-12-31',
    supplier: 'Pharma Nepal',
    location: 'D-1-001',
    batches: [
      {
        id: 'batch-7-1',
        batchNumber: 'BATCH-001',
        quantity: 15,
        quantityRemaining: 15,
        purchasePrice: 800,
        purchaseDate: '2024-01-10',
        expiryDate: '2025-12-31',
        isExpired: false
      }
    ]
  }
];

export const categories = getAvailableCategories();