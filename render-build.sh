#!/bin/bash
# Install frontend dependencies and build
npm install
npm run build

# Install backend dependencies
cd server
npm install
cd ..
