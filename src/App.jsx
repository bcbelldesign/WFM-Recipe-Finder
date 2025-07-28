import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const greetings = [
    "Hello World!", // ← Change this text to see it update on the page!
    "Hello Coder!",
    "Hello Designer!",
    "Hello Researcher!",
    "Hello Manager!",
    "Hello Builder!",
    "Hello Creator!"
  ];
  
  const [greeting, setGreeting] = useState(greetings[0]);
  const [currentHost, setCurrentHost] = useState("");

  useEffect(() => {
    setCurrentHost(window.location.host);
  }, []);

  const cycleGreeting = () => {
    const currentIndex = greetings.indexOf(greeting);
    const nextIndex = (currentIndex + 1) % greetings.length;
    setGreeting(greetings[nextIndex]);
  };

  return (
    <div className="soft-retro-container">
      <div className="terminal-header">
        <div className="terminal-line">
          <span className="prompt">$</span> Running on http://{currentHost}
        </div>
        <div className="terminal-line">
          <span className="prompt">$</span> Status: Connected <span className="status-indicator">✓</span>
        </div>
      </div>

      <div className="main-content">
        <h1 className="soft-retro-title" onClick={cycleGreeting}>
          {greeting}
        </h1>
        <p className="click-hint">[Click me to see more greetings]</p>
      </div>

      <div className="instruction-section">
        <p className="welcome-text">
          Welcome to your first code editing experience!
        </p>
        <p className="instruction-text">
          <strong>Instructions:</strong> Find "{greetings[0]}" in App.jsx and change it.
        </p>
        <p className="help-text">
          Save the file to see your changes appear here.
        </p>
      </div>
    </div>
  );
}

export default App;
