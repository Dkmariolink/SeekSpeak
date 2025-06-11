# Quick Fix: Create Placeholder Icons

Since Chrome extensions require PNG files, here's how to quickly create placeholder icons:

## Method 1: Simple Colored Squares (Quick Fix)
Create 4 PNG files with these specifications:
- **icon16.png**: 16x16px, blue square (#1a73e8)
- **icon32.png**: 32x32px, blue square (#1a73e8)  
- **icon48.png**: 48x48px, blue square (#1a73e8)
- **icon128.png**: 128x128px, blue square (#1a73e8)

You can create these in any image editor or online tool like:
- canva.com (create custom size, add colored rectangle)
- photopea.com (free Photoshop alternative)
- paint.net
- Even MS Paint

## Method 2: Use Online Icon Generator
- favicon.io/favicon-generator (can create multiple sizes from text)
- icon-generator.net
- favicon-generator.org

Just upload any temporary icon and download the PNG pack.

## Save Location
Place the PNG files in: `src/assets/icons/`
- icon16.png
- icon32.png  
- icon48.png
- icon128.png

This will allow the extension to load immediately for testing.