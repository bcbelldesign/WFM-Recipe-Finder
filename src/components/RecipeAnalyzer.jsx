import React, { useState, useEffect } from 'react';
import { findWholeFoodsProducts } from '../api/wholeFoodsAPI';
import './RecipeAnalyzer.css';

function RecipeAnalyzer() {
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [recipeUrl, setRecipeUrl] = useState('');
  const [recipeData, setRecipeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [only365, setOnly365] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || '';
    fetch(`${API_URL}/api/featured-recipes`)
      .then(res => res.json())
      .then(data => setFeaturedRecipes(data.recipes || []))
      .catch(err => console.error('Failed to load featured recipes:', err));
  }, []);

  const searchRecipes = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    setRecipeData(null);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/search-recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.recipes || []);
      
      if (data.recipes.length === 0) {
        setError('No recipes found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search recipes. Please try again.');
    }
    
    setLoading(false);
  };

  const selectRecipe = async (recipeUrl) => {
    setLoading(true);
    setError('');
    setSearchResults([]);
    setRecipeUrl(recipeUrl);
    await analyzeRecipeByUrl(recipeUrl);
  };

  const analyzeRecipeByUrl = async (url) => {
    try {
      const result = await extractRecipe(url);
      const products = await findWholeFoodsProducts(result.ingredients, only365);
      
      setRecipeData({
        ...result,
        products,
        url
      });
      
      setSelectedItems(new Set());
    } catch (err) {
      console.error('Recipe analysis error:', err);
      setError('Failed to analyze recipe. Please check the URL and try again.');
      setRecipeData(null);
    }
    
    setLoading(false);
  };

  const analyzeRecipe = async () => {
    if (!recipeUrl.trim()) {
      setError('Please enter a recipe URL');
      return;
    }

    if (!recipeUrl.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    await analyzeRecipeByUrl(recipeUrl);
  };

  const toggleItem = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleAll = () => {
    if (selectedItems.size === recipeData.products.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(recipeData.products.map((_, i) => i)));
    }
  };

  const calculateSubtotal = () => {
    return recipeData.products
      .filter((_, i) => selectedItems.has(i))
      .reduce((sum, product) => sum + product.price, 0)
      .toFixed(2);
  };

  const addToCart = () => {
    const selectedProducts = recipeData.products.filter((_, i) => selectedItems.has(i));
    console.log('Adding to cart:', selectedProducts);
    alert(`Adding ${selectedProducts.length} items to cart!`);
  };

  return (
    <div className="recipe-analyzer">
      <div className="hero-section">
        <div className="hero-content">
          <h1>Your favorite recipes, made with our standards.</h1>
          <p>Search for a recipe or paste a link — we'll turn it into a Whole Foods ingredient list built on our quality standards.</p>
        </div>
      </div>

      <div className="input-section">
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <span className="tab-icon">🔍</span>
            Search Recipes
          </button>
          <button 
            className={`tab-btn ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <span className="tab-icon">🔗</span>
            Add Recipe Link
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'search' ? (
            <div className="search-row">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by name, ingredient, or cuisine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
                  className="search-input-field"
                />
              </div>
              <button 
                onClick={searchRecipes} 
                disabled={loading}
                className="search-submit-btn"
              >
                {loading ? 'Searching...' : 'Search Recipes'}
              </button>
            </div>
          ) : (
            <div className="search-row">
              <div className="search-input-wrapper">
                <span className="search-icon">🔗</span>
                <input
                  type="url"
                  placeholder="Paste recipe URL here..."
                  value={recipeUrl}
                  onChange={(e) => setRecipeUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && analyzeRecipe()}
                  className="search-input-field"
                />
              </div>
              <button 
                onClick={analyzeRecipe} 
                disabled={loading}
                className="search-submit-btn"
              >
                <span className="btn-plus">+</span>
                {loading ? 'Importing...' : 'Import Recipe'}
              </button>
            </div>
          )}
        </div>
        {error && <div className="error-message">{error}</div>}
      </div>

      {loading && !recipeData && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading recipe...</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="search-results">
          <h2>Search Results</h2>
          <div className="recipe-grid">
            {searchResults.map((recipe, index) => (
              <div key={index} className="recipe-card">
                <div className="recipe-card-image-wrapper">
                  <img src={recipe.image} alt={recipe.title} className="recipe-card-image" />
                  <div className="recipe-rating">
                    <span className="star">⭐</span>
                    <span>4.9</span>
                  </div>
                </div>
                <div className="recipe-card-content">
                  <h3 className="recipe-card-title">{recipe.title}</h3>
                  <div className="recipe-meta">
                    <span>30 min</span>
                    <span className="dot">•</span>
                    <span>Medium</span>
                  </div>
                  <div className="recipe-tags">
                    <span className="tag">Dinner</span>
                    <span className="tag">Seafood</span>
                    <span className="tag">Keto</span>
                  </div>
                  <button className="view-recipe-btn" onClick={() => selectRecipe(recipe.url)}>
                    View Recipe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!recipeData && !loading && searchResults.length === 0 && featuredRecipes.length > 0 && (
        <div className="search-results">
          <h2>Featured Recipes</h2>
          <div className="recipe-grid">
            {featuredRecipes.map((recipe, index) => (
              <div key={index} className="recipe-card">
                <div className="recipe-card-image-wrapper">
                  <img src={recipe.image} alt={recipe.title} className="recipe-card-image" />
                  <div className="recipe-rating">
                    <span className="star">⭐</span>
                    <span>4.9</span>
                  </div>
                </div>
                <div className="recipe-card-content">
                  <h3 className="recipe-card-title">{recipe.title}</h3>
                  <div className="recipe-meta">
                    <span>30 min</span>
                    <span className="dot">•</span>
                    <span>Medium</span>
                  </div>
                  <div className="recipe-tags">
                    <span className="tag">Dinner</span>
                    <span className="tag">Seafood</span>
                    <span className="tag">Keto</span>
                  </div>
                  <button className="view-recipe-btn" onClick={() => selectRecipe(recipe.url)}>
                    View Recipe
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipeData && (
        <div className="recipe-viewer">
          <div className="recipe-layout">
            <div className="recipe-left">
              {recipeData.image && (
                <img src={recipeData.image} alt={recipeData.name} className="recipe-image" />
              )}

              <div className="recipe-section">
                <h2>{recipeData.name}</h2>
              </div>

              <div className="recipe-section">
                <h3>Recipe Details</h3>
                <div className="details-grid">
                  <div>Prep Time: {recipeData.prepTime || '15 mins'}</div>
                  <div>Cook Time: {recipeData.cookTime || '20 mins'}</div>
                  <div>Servings: {recipeData.servings || '4'}</div>
                  <div>Calories: {recipeData.calories || '420 per serving'}</div>
                </div>
              </div>

              <div className="recipe-section">
                <h3>Instructions</h3>
                <ol>
                  {recipeData.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="recipe-right">
              <div className="ingredients-header">
                <h3>Ingredients</h3>
                <label className="select-all">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === recipeData.products.length}
                    onChange={toggleAll}
                  />
                  Select all
                </label>
              </div>

              <div className="ingredient-cards">
                {recipeData.products.map((product, index) => (
                  <div key={index} className={`ingredient-card ${selectedItems.has(index) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(index)}
                      onChange={() => toggleItem(index)}
                      className="ingredient-checkbox"
                    />
                    <div className="ingredient-info">
                      <a href={product.amazonUrl} target="_blank" rel="noopener noreferrer" className="ingredient-name">{product.name}</a>
                      <div className="ingredient-amount">Need: {recipeData.ingredients[index]}</div>
                    </div>
                    <div className="ingredient-price">${product.price.toFixed(2)}</div>
                    <img src={product.image} alt={product.name} className="ingredient-image" />
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="subtotal">
                  Subtotal ({selectedItems.size} items): <strong>${calculateSubtotal()}</strong>
                </div>
                <button 
                  onClick={addToCart}
                  disabled={selectedItems.size === 0}
                  className="add-to-cart-btn"
                >
                  Add Selected to Cart →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function extractRecipe(url) {
  const API_URL = import.meta.env.VITE_API_URL || '';
  const response = await fetch(`${API_URL}/api/scrape-recipe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  
  if (!response.ok) {
    throw new Error('Failed to scrape recipe');
  }
  
  const data = await response.json();
  
  if (!data.ingredients || data.ingredients.length === 0) {
    throw new Error('No ingredients found in recipe');
  }
  
  return {
    name: data.name || 'Recipe',
    image: data.image || 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&h=400&fit=crop&q=80',
    ingredients: data.ingredients,
    instructions: data.instructions || [],
    prepTime: '15 mins',
    cookTime: '20 mins',
    servings: '4',
    calories: '420 per serving'
  };
}

export default RecipeAnalyzer;
