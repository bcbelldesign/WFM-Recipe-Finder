const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3001;

// Simple in-memory cache for recipe images
const imageCache = new Map();

app.use(cors());
app.use(express.json());

// Serve static files from React build FIRST
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(process.cwd(), 'build');
  console.log('Current working directory:', process.cwd());
  console.log('Build path:', buildPath);
  console.log('Build folder exists:', fs.existsSync(buildPath));
  if (fs.existsSync(buildPath)) {
    console.log('Build folder contents:', fs.readdirSync(buildPath));
  }
  app.use(express.static(buildPath));
}

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
    // Remove measurements and quantities
    cleanIngredient = cleanIngredient.replace(/^\d+[\s\-]*/, ''); // Remove leading numbers
    cleanIngredient = cleanIngredient.replace(/\d+\/\d+/g, ''); // Remove fractions like 1/2
    cleanIngredient = cleanIngredient.replace(/\([^)]*\)/g, ''); // Remove parentheses content
    cleanIngredient = cleanIngredient.replace(/\*+/g, ''); // Remove asterisks
    cleanIngredient = cleanIngredient.replace(/[\)\]\}]/g, ''); // Remove closing brackets
    cleanIngredient = cleanIngredient.replace(/,.*$/, ''); // Remove everything after comma
    
    const words = cleanIngredient.split(/\s+/);
    const stopWords = [
      // Measurements
      'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp', 
      'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'gram', 'grams', 'g', 'kg', 'ml', 
      'piece', 'pieces', 'clove', 'cloves', 'can', 'cans', 'jar', 'jars', 'bottle', 'bottles',
      'package', 'packages', 'box', 'boxes', 'bag', 'bags', 'container', 'containers',
      // Descriptors to remove
      'of', 'to', 'for', 'topping', 'optional', 'fresh', 'dried', 'chopped', 'sliced', 'diced',
      'minced', 'grated', 'shredded', 'crushed', 'ground', 'whole', 'half', 'quarter',
      'large', 'medium', 'small', 'extra', 'plus', 'more', 'additional', 'needed'
    ];
    
    const meaningfulWords = words.filter(word => {
      const cleaned = word.replace(/[^a-z]/g, '');
      return cleaned.length > 2 && !stopWords.includes(cleaned) && !/^\d+$/.test(cleaned);
    });
    
    cleanIngredient = meaningfulWords.join(' ').trim() || 'ingredient';
    
    const searchUrl = `https://www.wholefoodsmarket.com/grocery/search?k=${encodeURIComponent(cleanIngredient)}`;
    console.log(`Cleaned "${ingredient}" to "${cleanIngredient}"`);
    console.log('Searching Whole Foods:', searchUrl);
    
    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('Navigating to:', searchUrl);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const product = await page.evaluate(() => {
        const productLinks = document.querySelectorAll('a[href*="/grocery/product/"]');
        if (productLinks.length === 0) return null;
        
        const firstLink = productLinks[0];
        const url = firstLink.href;
        
        let container = firstLink;
        for (let i = 0; i < 5; i++) {
          container = container.parentElement;
          if (!container) break;
        }
        
        const allText = container ? container.innerText : '';
        const lines = allText.split('\n').filter(line => line.trim().length > 3 && line.trim().length < 100);
        const name = lines[0] || 'Product';
        
        const priceMatch = allText.match(/\$([\d.]+)/);
        const price = priceMatch ? priceMatch[1] : '4.99';
        
        const img = container ? container.querySelector('img') : null;
        const image = img ? img.src : '';
        
        return { name, price, image, url };
      });
      
      await browser.close();
      
      console.log('Extracted product:', product);
      
      if (product && product.url) {
        const products = [{
          name: product.name,
          price: parseFloat(product.price) || 4.99,
          image: product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
          url: product.url,
          available: true,
          amazonUrl: product.url
        }];
        return res.json({ products });
      }
      
      const products = [{
        name: cleanIngredient.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        price: Math.floor(Math.random() * 8) + 2.99,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
        url: searchUrl,
        available: true,
        amazonUrl: searchUrl
      }];
      res.json({ products });
      
    } catch (error) {
      console.error('Puppeteer error:', error.message);
      const products = [{
        name: cleanIngredient.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        price: Math.floor(Math.random() * 8) + 2.99,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&q=80',
        url: searchUrl,
        available: true,
        amazonUrl: searchUrl
      }];
      res.json({ products });
    }
    
  } catch (error) {
    console.error('Whole Foods search error:', error);
    res.status(500).json({ error: 'Failed to search Whole Foods' });
  }
});

app.post('/api/validate-product-url', async (req, res) => {
  const { url } = req.body;
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
      timeout: 5000
    });
    const finalUrl = response.url;
    const isAvailable = !finalUrl.includes('/grocery/search?k=');
    res.json({ available: isAvailable });
  } catch (error) {
    res.json({ available: false });
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });
    
    console.log('Search response status:', response.status);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
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
    
    // If no recipes found, return some fallback recipes
    if (recipes.length === 0) {
      const fallbackRecipes = [
        {
          title: `${query} Recipe`,
          url: 'https://www.bonappetit.com/recipes',
          image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
        },
        {
          title: `Easy ${query}`,
          url: 'https://www.bonappetit.com/recipes',
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
        },
        {
          title: `${query} Delight`,
          url: 'https://www.bonappetit.com/recipes',
          image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
        }
      ];
      console.log(`No recipes found, returning ${fallbackRecipes.length} fallback recipes`);
      res.json({ recipes: fallbackRecipes });
    } else {
      res.json({ recipes });
    }
    
  } catch (error) {
    console.error('Recipe search error:', error);
    // Always return fallback recipes if there's an error
    const fallbackRecipes = [
      {
        title: `${query} Recipe`,
        url: 'https://www.bonappetit.com/recipes',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
      },
      {
        title: `Easy ${query}`,
        url: 'https://www.bonappetit.com/recipes', 
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
      },
      {
        title: `${query} Delight`,
        url: 'https://www.bonappetit.com/recipes',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'
      }
    ];
    console.log(`Error occurred, returning ${fallbackRecipes.length} fallback recipes`);
    res.json({ recipes: fallbackRecipes });
  }
});

app.get('/api/featured-recipes', async (req, res) => {
  try {
    const recipesUrl = 'https://www.bonappetit.com/recipes';
    console.log('Fetching featured recipes from Bon Appétit');
    
    const response = await fetch(recipesUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });
    
    console.log('Featured recipes response status:', response.status);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    console.log('Featured recipes HTML length:', html.length);
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
    
    if (recipes.length === 0) {
      console.warn('No featured recipes found, returning empty array');
    }
    
    res.json({ recipes });
    
  } catch (error) {
    console.error('Featured recipes error:', error.message);
    console.error('Error stack:', error.stack);
    // Return fallback featured recipes
    const fallbackRecipes = [
      {
        title: 'Classic Pasta Recipe',
        url: 'https://www.bonappetit.com/recipes',
        image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop'
      },
      {
        title: 'Perfect Roasted Chicken',
        url: 'https://www.bonappetit.com/recipes',
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop'
      },
      {
        title: 'Fresh Garden Salad',
        url: 'https://www.bonappetit.com/recipes',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
      }
    ];
    res.json({ recipes: fallbackRecipes });
  }
});

// Catch-all route for React Router (only for non-API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const buildPath = path.join(process.cwd(), 'build');
    const indexPath = path.join(buildPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Build files not found');
    }
  });
}

app.listen(PORT, () => {
  console.log(`Recipe scraper server running on http://localhost:${PORT}`);
});
