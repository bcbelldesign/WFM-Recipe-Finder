// Whole Foods product search - uses batch endpoint for speed
export async function findWholeFoodsProducts(ingredients, only365 = false) {
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  try {
    const response = await fetch(`${API_URL}/api/search-whole-foods-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.results.map(r => ({
        id: Math.random().toString(36).substr(2, 9),
        name: r.product.name,
        price: r.product.price,
        originalPrice: null,
        image: r.product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
        rating: 4.5,
        reviews: Math.floor(Math.random() * 500) + 100,
        wholeFoods: true,
        is365: true,
        amazonUrl: r.product.amazonUrl,
        available: r.product.available
      }));
    }
  } catch (error) {
    console.log('Batch search failed, using fallback:', error);
  }
  
  // Fallback to mock data
  return ingredients.map(ingredient => ({
    id: Math.random().toString(36).substr(2, 9),
    name: ingredient,
    price: 4.99,
    originalPrice: null,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
    rating: 4.5,
    reviews: 100,
    wholeFoods: true,
    is365: true,
    amazonUrl: '',
    available: true
  }));
}

export async function validateProductAvailability(products) {
  const API_URL = import.meta.env.VITE_API_URL || '';
  
  const validatedProducts = await Promise.all(
    products.map(async (product) => {
      try {
        const response = await fetch(`${API_URL}/api/validate-product-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: product.amazonUrl })
        });
        const { available } = await response.json();
        return { ...product, available };
      } catch (error) {
        return { ...product, available: true };
      }
    })
  );
  
  return validatedProducts;
}