# 🧲 Magnet Studio

Admin tool for laying out and printing photo fridge magnets. Built with Next.js (JavaScript), MongoDB and Cloudinary. There is no login.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in MongoDB + Cloudinary keys
npm run dev                        # http://localhost:3000
```

## How it works

1. **Dashboard (`/`)**: create a magnet sheet. Pick a sheet size (A4, Letter, 4×6, 13×19, or custom), a magnet size, and a unit (mm, cm, in, px).
2. **Photo library (`/photos`)**: upload photos to Cloudinary. Tag them by customer or order to find them later.
3. **Editor (`/editor/:id`)** has a canvas in the middle with tabs on the left:
   - **Photos**: click or drag a photo onto a magnet, or tick several photos and auto-fill them with N copies each.
   - **Sheet**: paper size, portrait/landscape, margins, background colour.
   - **Frame**: magnet size, shape (rectangle, rounded, circle, heart, hexagon, star), bleed/wrap, Polaroid-style border.
   - **Grid**: auto-fit, or a fixed rows × cols grid. Set horizontal and vertical spacing, spread magnets evenly, center the grid, or resize magnets to fill the sheet.
   - **Marks**: crop marks, cut outline, safe-area and margin guides.
   - **Right panel**: crop by fill or fit, zoom, drag to move the photo, rotate and flip, adjust brightness, contrast, saturation, B&W and sepia, add a caption, check print quality (DPI warning), and copy the magnet to all empty slots or the whole sheet.
4. **Print**: prints at the exact size (the CSS `@page` is set in mm). In the print dialog, set Scale to **100%**, Margins to **None**, and turn on **Background graphics**. Run the *calibration test* once to check that your printer prints true to size.

All sizes are stored in **mm**. The unit dropdown only changes how sizes are displayed and entered (px = 1/96 in).
Projects auto-save to MongoDB. Undo and redo use Ctrl+Z and Ctrl+Y.
