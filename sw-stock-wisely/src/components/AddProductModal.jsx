import React from 'react';
import ProductFormModal from './inventory/ProductFormModal';
import { inventoryAPI } from '../api';

function AddProductModal({ isOpen, onClose, onProductAdded, prefilledName }) {
  const handleSave = async (data) => {
    try {
      const payload = {
        product_code: data.sku,
        description: data.description && data.description.trim().length > 0 ? data.description : data.name,
        category: data.category || null
      };
      if (!payload.product_code || !payload.description) {
        alert('Please enter product name and SKU');
        return;
      }
      const res = await inventoryAPI.createProduct(payload);
      const newProduct = res.data?.data || {
        product_code: payload.product_code,
        description: payload.description,
        category: payload.category,
        price: 0
      };
      if (onProductAdded) onProductAdded(newProduct);
      onClose();
    } catch (err) {
      console.error('Failed to create product', err);
      const msg = err.response?.data?.error || err.message || 'Unknown error';
      alert(`Failed to create product: ${msg}`);
    }
  };

  return (
    <ProductFormModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      editingProduct={null}
      allProducts={[]}
      prefilledName={prefilledName}
    />
  );
}

export default AddProductModal;

