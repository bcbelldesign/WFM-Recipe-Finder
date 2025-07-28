import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Removing the service worker by default as it can cause issues with users not being able to see new
// versions of the app.
// More info: https://console.harmony.a2z.com/docs/troubleshooting.html#React%20Gotchas

// registerServiceWorker();

reportWebVitals();
