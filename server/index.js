const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory cache for recipe images
const imageCache = new Map();

app.use(cors());
app.use(express.json());

app.post('/api/scrape-recipe', async (req, res) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log('Scraping recipe:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    let name = '';
    let ingredients = [];
    let instructions = [];
    let image = '';
    
    // Try JSON-LD first
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
      try {
        const jsonData = JSON.parse(script.textContent);
        const recipes = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        for (const item of recipes) {
          if (item['@type'] === 'Recipe') {
            if (item.name) name = item.name;
            if (item.image) {
              image = Array.isArray(item.image) ? item.image[0] : (typeof item.image === 'string' ? item.image : item.image?.url);
            }
            if (item.recipeIngredient) ingredients = item.recipeIngredient;
            if (item.recipeInstructions) instructions = extractInstructions(item.recipeInstructions);
            if (ingredients.length > 0) break;
          }
          if (item['@graph']) {
            const recipe = item['@graph'].find(r => r['@type'] === 'Recipe');
            if (recipe) {
              if (recipe.name) name = recipe.name;
              if (recipe.image) {
                image = Array.isArray(recipe.image) ? recipe.image[0] : (typeof recipe.image === 'string' ? recipe.image : recipe.image?.url);
              }
              if (recipe.recipeIngredient) ingredients = recipe.recipeIngredient;
              if (recipe.recipeInstructions) instructions = extractInstructions(recipe.recipeInstructions);
              if (ingredients.length > 0) break;
            }
          }
        }
        if (ingredients.length > 0) break;
      } catch (e) {
        continue;
      }
    }
    
    // Fallback for name
    if (!name) {
      const h1 = doc.querySelector('h1');
      if (h1) name = h1.textContent.trim();
    }
    
    // Fallback to HTML selectors for ingredients
    if (ingredients.length === 0) {
      const selectors = [
        '[itemProp="recipeIngredient"]',
        '.recipe-ingredient',
        '.ingredient',
        '.recipe-ingredients li',
        '.ingredients li',
        '[class*="ingredient"] li'
      ];
      
      for (const selector of selectors) {
        const elements = doc.querySelectorAll(selector);
        if (elements.length > 0) {
          ingredients = Array.from(elements).map(el => el.textContent.trim());
          break;
        }
      }
    }
    
    // Fallback to HTML selectors for instructions
    if (instructions.length === 0) {
      const selectors = [
        '[itemProp="recipeInstructions"] li',
        '.recipe-instructions li',
        '.instructions li',
        '.recipe-steps li',
        '[class*="instruction"] li',
        '[class*="step"] li'
      ];
      
      for (const selector of selectors) {
        const elements = doc.querySelectorAll(selector);
        if (elements.length > 0) {
          instructions = Array.from(elements).map(el => el.textContent.trim());
          break;
        }
      }
    }
    
    // Clean ingredients
    ingredients = ingredients
      .filter(ing => ing && ing.length > 2)
      .map(ing => ing.replace(/^[\d\s\-•]+/, '').trim())
      .slice(0, 12);
    
    // Clean instructions
    instructions = instructions
      .filter(inst => inst && inst.length > 5)
      .map(inst => inst.replace(/^[\d\s\-•]+/, '').trim());
    
    console.log(`Found: ${name}, ${ingredients.length} ingredients, ${instructions.length} instructions`);
    
    res.json({ name, image, ingredients, instructions });
    
  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({ error: 'Failed to scrape recipe' });
  }
});

function extractInstructions(recipeInstructions) {
  if (Array.isArray(recipeInstructions)) {
    return recipeInstructions.map(step => {
      if (typeof step === 'string') return step;
      if (step.text) return step.text;
      if (step['@type'] === 'HowToStep' && step.text) return step.text;
      return '';
    }).filter(s => s);
  }
  if (typeof recipeInstructions === 'string') {
    return [recipeInstructions];
  }
  return [];
}

app.post('/api/search-whole-foods', async (req, res) => {
  const { ingredient } = req.body;
  
  if (!ingredient) {
    return res.status(400).json({ error: 'Ingredient is required' });
  }

  try {
    let cleanIngredient = ingredient.toLowerCase();
    cleanIngredient = cleanIngredient.replace(/\([^)]*\)/g, '');
    cleanIngredient = cleanIngredient.replace(/\*+/g, '');
    cleanIngredient = cleanIngredient.replace(/[\)\]\}]/g, '');
    cleanIngredient = cleanIngredient.replace(/,.*$/, '');
    
    const words = cleanIngredient.split(/\s+/);
    const stopWords = ['cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp', 'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'gram', 'grams', 'g', 'kg', 'ml', 'piece', 'pieces', 'clove', 'cloves', 'can', 'cans', 'of', 'to', 'for', 'topping', 'optional'];
    
    const meaningfulWords = words.filter(word => {
      const cleaned = word.replace(/[^a-z]/g, '');
      return cleaned.length > 2 && !stopWords.includes(cleaned);
    });
    
    cleanIngredient = meaningfulWords.join(' ').trim() || 'ingredient';
    
    const searchUrl = `https://www.wholefoodsmarket.com/search?text=${encodeURIComponent(cleanIngredient)}`;
    console.log(`Cleaned "${ingredient}" to "${cleanIngredient}"`);
    console.log('Searching Whole Foods:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const products = [];
    const productCards = doc.querySelectorAll('[data-testid="product-tile"], .product-tile, .product-card, [class*="ProductCard"]');
    const searchWords = cleanIngredient.toLowerCase().split(' ');
    
    for (const card of Array.from(productCards).slice(0, 5)) {
      const nameEl = card.querySelector('h2, h3, [class*="ProductName"], [class*="product-name"]');
      const priceEl = card.querySelector('[class*="price"], .price, [data-testid="price"]');
      const imageEl = card.querySelector('img');
      const linkEl = card.querySelector('a');
      
      if (nameEl) {
        const name = nameEl.textContent.trim();
        const nameLower = name.toLowerCase();
        
        const matchCount = searchWords.filter(word => word.length > 2 && nameLower.includes(word)).length;
        if (matchCount === 0) continue;
        
        const priceText = priceEl ? priceEl.textContent.trim() : '';
        const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || Math.floor(Math.random() * 10) + 3.99;
        const url = linkEl ? `https://www.wholefoodsmarket.com${linkEl.href}` : searchUrl;
        
        let image = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80';
        if (url && url.includes('wholefoodsmarket.com/product')) {
          try {
            const productResponse = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }});
            if (productResponse.ok) {
              const productHtml = await productResponse.text();
              const productDom = new JSDOM(productHtml);
              const productDoc = productDom.window.document;
              
              const imageSelectors = ['img[data-testid="product-image"]', 'img[class*="ProductImage"]', '[class*="ImageGallery"] img', 'main img', 'img'];
              for (const selector of imageSelectors) {
                const productImage = productDoc.querySelector(selector);
                if (productImage && productImage.src && !productImage.src.includes('icon')) {
                  image = productImage.src || productImage.getAttribute('data-src') || image;
                  console.log(`Found image with "${selector}": ${image}`);
                  break;
                }
              }
              
              const priceSelectors = ['[class*="price"]', '.price', '[data-testid="price"]', '[class*="Price"]'];
              for (const selector of priceSelectors) {
                const productPrice = productDoc.querySelector(selector);
                if (productPrice) {
                  const detailPrice = parseFloat(productPrice.textContent.replace(/[^\d.]/g, ''));
                  if (detailPrice && detailPrice > 0) {
                    price = detailPrice;
                    console.log(`Found price from detail page: $${price}`);
                    break;
                  }
                }
              }
            }
          } catch (e) { console.log(`Error fetching product details: ${e.message}`); }
        }
        
        products.push({ name, price, image, url });
        break;
      }
    }
    
    console.log(`Found ${products.length} products`);
    res.json({ products });
    
  } catch (error) {
    console.error('Whole Foods search error:', error);
    res.status(500).json({ error: 'Failed to search Whole Foods' });
  }
});

app.post('/api/search-recipes', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  try {
    const searchUrl = `https://www.bonappetit.com/search?q=${encodeURIComponent(query)}`;
    console.log('Searching Bon Appétit:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const recipeLinks = doc.querySelectorAll('a[href*="/recipe/"]');
    const uniqueRecipes = [];
    
    for (const link of Array.from(recipeLinks).slice(0, 9)) {
      const url = link.href.startsWith('http') ? link.href : `https://www.bonappetit.com${link.href}`;
      const titleEl = link.querySelector('h4, h3, h2, [class*="title"], [class*="Title"]');
      
      if (titleEl && !uniqueRecipes.find(r => r.url === url)) {
        uniqueRecipes.push({ title: titleEl.textContent.trim(), url });
      }
    }
    
    // Fetch images in parallel for better performance
    const recipes = await Promise.all(uniqueRecipes.map(async ({ title, url }) => {
      let image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
      
      // Check cache first
      if (imageCache.has(url)) {
        image = imageCache.get(url);
      } else {
        try {
          const recipeResponse = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          if (recipeResponse.ok) {
            const recipeHtml = await recipeResponse.text();
            const recipeDom = new JSDOM(recipeHtml);
            const recipeDoc = recipeDom.window.document;
            
            const scripts = recipeDoc.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              try {
                const jsonData = JSON.parse(script.textContent);
                const recipeData = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Recipe') : (jsonData['@type'] === 'Recipe' ? jsonData : null);
                if (recipeData?.image) {
                  image = Array.isArray(recipeData.image) ? recipeData.image[0] : (typeof recipeData.image === 'string' ? recipeData.image : recipeData.image?.url);
                  imageCache.set(url, image);
                  break;
                }
              } catch (e) { }
            }
          }
        } catch (e) {
          console.log(`Error fetching image for ${title}:`, e.message);
        }
      }
      
      return { title, url, image };
    }));
    
    // Limit cache size to prevent memory issues
    if (imageCache.size > 100) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }
    
    console.log(`Found ${recipes.length} recipes from Bon Appétit`);
    res.json({ recipes });
    
  } catch (error) {
    console.error('Recipe search error:', error);
    res.json({ recipes: [] });
  }
});

app.get('/api/featured-recipes', async (req, res) => {
  try {
    const recipesUrl = 'https://www.bonappetit.com/recipes';
    console.log('Fetching featured recipes from Bon Appétit');
    
    const response = await fetch(recipesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const recipeLinks = doc.querySelectorAll('a[href*="/recipe/"]');
    const uniqueRecipes = [];
    
    for (const link of Array.from(recipeLinks).slice(0, 9)) {
      const url = link.href.startsWith('http') ? link.href : `https://www.bonappetit.com${link.href}`;
      const titleEl = link.querySelector('h4, h3, h2, [class*="title"], [class*="Title"]');
      
      if (titleEl && !uniqueRecipes.find(r => r.url === url)) {
        uniqueRecipes.push({ title: titleEl.textContent.trim(), url });
      }
    }
    
    const recipes = await Promise.all(uniqueRecipes.map(async ({ title, url }) => {
      let image = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
      
      if (imageCache.has(url)) {
        image = imageCache.get(url);
      } else {
        try {
          const recipeResponse = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          
          if (recipeResponse.ok) {
            const recipeHtml = await recipeResponse.text();
            const recipeDom = new JSDOM(recipeHtml);
            const recipeDoc = recipeDom.window.document;
            
            const scripts = recipeDoc.querySelectorAll('script[type="application/ld+json"]');
            for (const script of scripts) {
              try {
                const jsonData = JSON.parse(script.textContent);
                const recipeData = Array.isArray(jsonData) ? jsonData.find(item => item['@type'] === 'Recipe') : (jsonData['@type'] === 'Recipe' ? jsonData : null);
                if (recipeData?.image) {
                  image = Array.isArray(recipeData.image) ? recipeData.image[0] : (typeof recipeData.image === 'string' ? recipeData.image : recipeData.image?.url);
                  imageCache.set(url, image);
                  break;
                }
              } catch (e) { }
            }
          }
        } catch (e) { }
      }
      
      return { title, url, image };
    }));
    
    console.log(`Returning ${recipes.length} featured recipes`);
    res.json({ recipes });
    
  } catch (error) {
    console.error('Featured recipes error:', error);
    res.json({ recipes: [] });
  }
});

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '..', 'build');
  console.log('Serving static files from:', buildPath);
  app.use(express.static(buildPath));
  
  // Catch-all route for React Router (only for non-API routes)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(buildPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Recipe scraper server running on http://localhost:${PORT}`);
});
