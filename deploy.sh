#!/bin/bash

# Deploy script for TSP Host Finder Tool
# This deploys to both Firebase and GitHub Pages

echo "🚀 Deploying to Firebase..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Firebase deployment successful!"

    echo ""
    echo "📦 Syncing to GitHub Pages..."
    cp public/app.js app.js
    cp public/index.html index.html

    git add app.js index.html
    git commit -m "Sync with Firebase deployment

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    git push

    if [ $? -eq 0 ]; then
        echo "✅ GitHub Pages sync successful!"
        echo ""
        echo "🎉 Deployment complete!"
        echo "   Firebase: https://tsp-host-finder-tool.web.app"
        echo "   GitHub Pages: https://nicunursekatie.github.io/sandwichprojectcollectionsites/"
    else
        echo "❌ GitHub Pages sync failed"
        exit 1
    fi
else
    echo "❌ Firebase deployment failed"
    exit 1
fi
