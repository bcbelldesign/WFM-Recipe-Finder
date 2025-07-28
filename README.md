# Vibe Sandbox

A React-based interactive tutorial application designed to provide an inclusive guide for anyone interested at Amazon in learning local development workflows and AI-assisted coding with Amazon Q.

## Overview

This project provides a comprehensive, step-by-step tutorial that guides anyone interested through setting up and using a local development environment. The tutorial is built as a React application with an interactive interface that teaches users how to work with VS Code, make code changes, and leverage Amazon Q for development assistance.

## Features

- **Interactive Tutorial Interface**: Step-by-step guided experience with progress tracking
- **Dark Theme UI**: GitHub-inspired dark theme with smooth animations
- **Responsive Design**: Works on desktop and mobile devices
- **Copy-to-Clipboard**: Easy copying of code snippets and commands
- **Progress Tracking**: Visual timeline showing completed and current steps

## Tutorial Content

The tutorial covers 6 main steps:

1. **What You'll Learn** - Overview of the tutorial goals
2. **Setup Workspace** - Opening VS Code and navigating to files
3. **Modify Text** - Making your first code changes
4. **Try Amazon Q Plugin** - Using the AI assistant in VS Code
5. **Try Amazon Q CLI** - Using the command-line AI assistant
6. **What's Next** - Resetting the app and next steps

## Getting Started

### Prerequisites

- Node.js installed on your system
- VS Code with Amazon Q plugin
- Basic familiarity with terminal/command line

### Installation

1. Clone or download this project
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000`

## Project Structure

```
src/
├── App.js          # Main tutorial component with step navigation
├── App.css         # Complete styling for the tutorial interface
├── index.js        # React app entry point
└── components/     # Additional React components (if any)

public/
├── index.html      # HTML template
├── favicon.svg     # Custom favicon
└── manifest.json   # Web app manifest
```

## Technology Stack

- **React** - Frontend framework
- **CSS3** - Styling with animations and responsive design
- **JavaScript ES6+** - Modern JavaScript features

## Key Features

### Interactive Navigation
- Step-by-step progression through the tutorial
- Visual progress indicator with completion tracking
- Previous/Next navigation with proper state management

### Code Examples
- Syntax-highlighted code blocks
- Copy-to-clipboard functionality for all code snippets
- Real-world examples for Amazon Q usage

### Responsive Design
- Mobile-friendly layout
- Adaptive navigation for smaller screens
- Optimized typography and spacing

## Development

### Available Scripts

- `npm start` - Runs the development server
- `npm build` - Builds the app for production
- `npm test` - Runs the test suite
- `npm eject` - Ejects from Create React App (irreversible)

### Customization

The tutorial content can be modified by editing the step data in `App.js`. Each step contains:
- Title and description
- Instruction steps with numbered guidance
- Code blocks with copy functionality
- Navigation between steps

## Contributing

This project is designed as a starter template for anyone interested at Amazon. Feel free to:
- Customize the tutorial content for your specific needs
- Add additional steps or modify existing ones
- Update styling to match your design preferences
- Extend functionality with additional React components

## License

© 2025 Amazon.com, Inc. or its affiliates. All Rights Reserved.

## Support

For questions about using Amazon Q or setting up your development environment, refer to the internal Amazon documentation or reach out to your development team.
