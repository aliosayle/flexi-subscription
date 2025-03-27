// Helper function to format error responses
const formatError = (message, error = null, statusCode = 500) => {
  const response = { message };
  
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message;
    response.details = error.stack;
  }
  
  return { statusCode, response };
};

// Format an inventory item for response
const formatInventoryItem = (item) => ({
  id: item.id.toString(),
  name: item.name,
  description: item.description || '',
  sku: item.sku || '',
  barcode: item.barcode || '',
  quantity: parseInt(item.quantity) || 0,
  price: parseFloat(item.price) || 0,
  cost: parseFloat(item.cost) || 0,
  category: item.category || 'Uncategorized',
  imageSrc: item.image_src || 'https://placehold.co/100x100',
  createdAt: item.created_at,
  updatedAt: item.updated_at
});

// Format a transaction for response
const formatTransaction = (transaction) => ({
  id: transaction.id.toString(),
  itemId: transaction.item_id.toString(),
  itemName: transaction.item_name,
  itemSku: transaction.item_sku,
  type: transaction.type,
  quantity: parseInt(transaction.quantity) || 0,
  price: transaction.price ? parseFloat(transaction.price) : null,
  totalAmount: parseFloat(transaction.total_amount) || 0,
  notes: transaction.notes || '',
  customerSupplier: transaction.customer_supplier || '',
  paymentStatus: transaction.payment_status || '',
  createdBy: transaction.created_by ? transaction.created_by.toString() : null,
  createdByName: transaction.created_by_name || 'System',
  createdAt: transaction.created_at
});

// Parse features from JSON or string
const parseFeatures = (featuresStr) => {
  let parsedFeatures = [];
  try {
    if (featuresStr) {
      // Try to parse as JSON first
      try {
        parsedFeatures = JSON.parse(featuresStr);
      } catch (jsonErr) {
        // If JSON parsing fails, try to split by newlines
        parsedFeatures = String(featuresStr)
          .split('\n')
          .map(feature => feature.trim())
          .filter(feature => feature.length > 0);
      }
    }
  } catch (err) {
    console.error(`Error parsing features:`, err);
    parsedFeatures = [];
  }
  return parsedFeatures;
};

module.exports = {
  formatError,
  formatInventoryItem,
  formatTransaction,
  parseFeatures
}; 