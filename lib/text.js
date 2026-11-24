// Text & sticker layers that sit on top of a magnet photo.
// text layer:  { id, type:'text', text, x, y (0–1 of the cut frame), size (pt), font, weight, italic, upper,
//                fillType:'solid'|'gradient'|'none', color, color2, strokeW (mm), strokeColor,
//                effect:'none'|'soft'|'hard'|'3d'|'glow', effectColor, curve (deg), rotate, spacing (% of size),
//                opacity, bg:'none'|'pill'|'box'|'ribbon', bgColor }
// image layer: { id, type:'image', url, w, h (px), x, y, width (mm), rotate, opacity, flipX, name }

export const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Alfa+Slab+One&family=Anton&family=Bebas+Neue&family=Bungee&family=Caveat:wght@700&family=Dancing+Script:wght@700&family=Great+Vibes&family=Kalam:wght@400;700&family=Kaushan+Script&family=Lobster&family=Monoton&family=Montserrat:wght@800&family=Pacifico&family=Permanent+Marker&family=Playfair+Display:ital,wght@0,700;1,700&family=Poppins:wght@400;700;900&family=Righteous&family=Rozha+One&family=Sacramento&family=Satisfy&family=Shrikhand&family=Yatra+One&family=Yellowtail&display=swap';

export const TEXT_FONTS = [
  { value: 'Pacifico, cursive', label: 'Pacifico (script)' },
  { value: 'Lobster, cursive', label: 'Lobster' },
  { value: '"Dancing Script", cursive', label: 'Dancing Script' },
  { value: '"Great Vibes", cursive', label: 'Great Vibes (elegant)' },
  { value: 'Sacramento, cursive', label: 'Sacramento (thin script)' },
  { value: 'Yellowtail, cursive', label: 'Yellowtail' },
  { value: 'Satisfy, cursive', label: 'Satisfy' },
  { value: '"Kaushan Script", cursive', label: 'Kaushan Script (brush)' },
  { value: '"Permanent Marker", cursive', label: 'Permanent Marker' },
  { value: 'Caveat, cursive', label: 'Caveat (handwriting)' },
  { value: '"Bebas Neue", sans-serif', label: 'Bebas Neue (tall bold)' },
  { value: 'Anton, sans-serif', label: 'Anton (poster)' },
  { value: 'Bungee, sans-serif', label: 'Bungee (block)' },
  { value: 'Righteous, sans-serif', label: 'Righteous (retro)' },
  { value: 'Monoton, sans-serif', label: 'Monoton (neon lines)' },
  { value: 'Shrikhand, cursive', label: 'Shrikhand (fat retro)' },
  { value: '"Abril Fatface", serif', label: 'Abril Fatface' },
  { value: '"Alfa Slab One", serif', label: 'Alfa Slab One (stamp)' },
  { value: '"Playfair Display", serif', label: 'Playfair Display (luxury)' },
  { value: 'Montserrat, sans-serif', label: 'Montserrat ExtraBold' },
  { value: 'Poppins, sans-serif', label: 'Poppins' },
  { value: '"Yatra One", cursive', label: 'Yatra One (हिंदी)' },
  { value: '"Rozha One", serif', label: 'Rozha One (हिंदी)' },
  { value: 'Kalam, cursive', label: 'Kalam (हिंदी handwriting)' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
];

export const TEXT_DEFAULTS = {
  type: 'text',
  text: 'Your text',
  x: 0.5,
  y: 0.82,
  size: 24,
  font: 'Pacifico, cursive',
  weight: 400,
  italic: false,
  upper: false,
  fillType: 'solid',
  color: '#ffffff',
  color2: '#ffb347',
  strokeW: 0,
  strokeColor: '#000000',
  effect: 'soft',
  effectColor: '#000000',
  curve: 0,
  rotate: 0,
  spacing: 0,
  opacity: 1,
  bg: 'none',
  bgColor: '#ffffff',
  bgColor2: '#c2e9fb',
  bgOpacity: 1,
  bgScale: 1,
};

// Backgrounds behind text. Scenes are drawn as vector art sized to the text.
export const TEXT_BACKGROUNDS = [
  { value: 'none', label: 'None' },
  { value: 'pill', label: 'Pill', c1: '#ffffff', c2: '#ffffff' },
  { value: 'box', label: 'Box', c1: '#1d3557', c2: '#1d3557' },
  { value: 'ribbon', label: 'Ribbon', c1: '#e63946', c2: '#e63946' },
  { value: 'sky', label: '☁ Blue sky', c1: '#4facfe', c2: '#c2e9fb', scene: true },
  { value: 'clouds', label: '☁ Cloud', c1: '#ffffff', c2: '#d7e3f4', scene: true },
  { value: 'fog', label: '🌫 Fog / mist', c1: '#ffffff', c2: '#ffffff', scene: true, opacity: 0.85 },
  { value: 'waves', label: '🌊 Ocean waves', c1: '#48cae4', c2: '#023e8a', scene: true },
  { value: 'mountains', label: '⛰ Mountains', c1: '#2d6a4f', c2: '#95d5b2', scene: true },
  { value: 'sunset', label: '🌅 Sunset', c1: '#ffd166', c2: '#ef476f', scene: true },
  { value: 'beach', label: '🏖 Beach postcard', c1: '#74c0fc', c2: '#0096c7', scene: true },
  { value: 'brush', label: '🖌 Brush stroke', c1: '#ff006e', c2: '#ff006e', scene: true },
];
export const SCENE_BGS = TEXT_BACKGROUNDS.filter((b) => b.scene).map((b) => b.value);

// Ready-made looks. Applying one keeps the layer's text and position.
export const TEXT_PRESETS = [
  { id: 'travel', name: 'Travel Script', style: { font: 'Pacifico, cursive', size: 26, color: '#ffffff', effect: 'soft', effectColor: '#000000' } },
  { id: 'neon', name: 'Neon Glow', style: { font: 'Yellowtail, cursive', size: 30, color: '#ffffff', effect: 'glow', effectColor: '#ff2bd6', strokeW: 0 } },
  { id: 'poster', name: 'Bold Poster', style: { font: 'Anton, sans-serif', size: 30, upper: true, fillType: 'gradient', color: '#fff36b', color2: '#ff7b00', strokeW: 0.35, strokeColor: '#2b1400', effect: 'hard', effectColor: '#2b1400', spacing: 4 } },
  { id: 'retro3d', name: 'Retro 3D', style: { font: 'Shrikhand, cursive', size: 28, color: '#ffd23f', effect: '3d', effectColor: '#e4572e', strokeW: 0 } },
  { id: 'gold', name: 'Gold Luxe', style: { font: '"Playfair Display", serif', weight: 700, italic: true, size: 26, fillType: 'gradient', color: '#fff3b0', color2: '#c8961e', effect: 'soft', effectColor: '#3a2600' } },
  { id: 'arc', name: 'Beach Arc', style: { font: 'Bungee, sans-serif', size: 20, upper: true, color: '#ffffff', strokeW: 0.4, strokeColor: '#0077b6', effect: 'soft', effectColor: '#003049', curve: 110, y: 0.2 } },
  { id: 'ribbon', name: 'Ribbon', style: { font: '"Bebas Neue", sans-serif', size: 22, upper: true, spacing: 8, color: '#ffffff', bg: 'ribbon', bgColor: '#e63946', effect: 'none', strokeW: 0 } },
  { id: 'pill', name: 'Pill Tag', style: { font: 'Poppins, sans-serif', weight: 700, size: 14, color: '#1d2130', bg: 'pill', bgColor: '#ffffff', effect: 'none', strokeW: 0 } },
  { id: 'marker', name: 'Brush Marker', style: { font: '"Permanent Marker", cursive', size: 26, color: '#ffffff', effect: 'hard', effectColor: '#000000', rotate: -6 } },
  { id: 'elegant', name: 'Elegant', style: { font: '"Great Vibes", cursive', size: 34, color: '#ffffff', effect: 'glow', effectColor: '#000000' } },
  { id: 'love', name: 'Love', style: { font: '"Dancing Script", cursive', weight: 700, size: 28, color: '#ff4d6d', strokeW: 0.5, strokeColor: '#ffffff', effect: 'soft', effectColor: '#590d22' } },
  { id: 'sunset', name: 'Sunset', style: { font: 'Lobster, cursive', size: 28, fillType: 'gradient', color: '#ffe259', color2: '#ff5f6d', strokeW: 0.3, strokeColor: '#ffffff', effect: 'soft', effectColor: '#4a0d2e' } },
  { id: 'outline', name: 'Outline', style: { font: '"Alfa Slab One", serif', size: 26, upper: true, fillType: 'none', strokeW: 0.45, strokeColor: '#ffffff', effect: 'none' } },
  { id: 'stamp', name: 'Box Stamp', style: { font: 'Righteous, sans-serif', size: 16, upper: true, spacing: 10, color: '#ffffff', bg: 'box', bgColor: '#1d3557', effect: 'none', strokeW: 0 } },
  { id: 'hindi', name: 'हिंदी Style', sample: 'गोवा', style: { font: '"Yatra One", cursive', size: 28, fillType: 'gradient', color: '#ffd166', color2: '#ef476f', strokeW: 0.35, strokeColor: '#ffffff', effect: 'soft', effectColor: '#3d0c11' } },
  { id: 'monoton', name: 'Disco', style: { font: 'Monoton, sans-serif', size: 24, upper: true, color: '#7df9ff', effect: 'glow', effectColor: '#00a6ff' } },
  // with scenic backgrounds
  { id: 'postcard', name: 'Beach Postcard', style: { font: 'Pacifico, cursive', size: 24, color: '#ffffff', strokeW: 0.45, strokeColor: '#e76f51', effect: 'soft', effectColor: '#5a1e0e', bg: 'beach', bgColor: '#74c0fc', bgColor2: '#0096c7' } },
  { id: 'cloud9', name: 'Cloud Nine', style: { font: 'Pacifico, cursive', size: 24, color: '#3a86ff', effect: 'none', strokeW: 0, bg: 'clouds', bgColor: '#ffffff', bgColor2: '#d7e3f4' } },
  { id: 'misty', name: 'Misty Fog', style: { font: '"Playfair Display", serif', weight: 700, italic: true, size: 26, color: '#1d3557', effect: 'none', strokeW: 0, bg: 'fog', bgColor: '#ffffff', bgOpacity: 0.85 } },
  { id: 'mountain', name: 'Mountain Trip', style: { font: '"Bebas Neue", sans-serif', size: 26, upper: true, spacing: 6, color: '#ffffff', strokeW: 0.3, strokeColor: '#1b4332', effect: 'soft', effectColor: '#081c15', bg: 'mountains', bgColor: '#2d6a4f', bgColor2: '#95d5b2' } },
  { id: 'ocean', name: 'Ocean Waves', style: { font: 'Lobster, cursive', size: 26, color: '#ffffff', effect: 'soft', effectColor: '#03045e', strokeW: 0, bg: 'waves', bgColor: '#48cae4', bgColor2: '#023e8a' } },
  { id: 'sunsetbg', name: 'Sunset Drive', style: { font: 'Righteous, sans-serif', size: 22, upper: true, spacing: 6, color: '#ffffff', effect: 'soft', effectColor: '#6a040f', strokeW: 0, bg: 'sunset', bgColor: '#ffd166', bgColor2: '#ef476f' } },
  { id: 'bluesky', name: 'Blue Sky', style: { font: 'Poppins, sans-serif', weight: 900, size: 20, color: '#ffffff', effect: 'soft', effectColor: '#023e8a', strokeW: 0, bg: 'sky', bgColor: '#4facfe', bgColor2: '#c2e9fb' } },
  { id: 'brushpop', name: 'Brush Pop', style: { font: '"Permanent Marker", cursive', size: 22, color: '#ffffff', effect: 'none', strokeW: 0, rotate: -4, bg: 'brush', bgColor: '#ff006e' } },
];

export const EMOJI_STICKERS = ['❤️', '🌴', '☀️', '✨', '🌊', '🏖️', '📍', '✈️', '🎉', '🌸', '⭐', '😍', '🥥', '🍹', '👑', '💍', '🎂', '🙏', '🇮🇳', '🌺'];

let seq = 0;
export const layerId = () => `l${Date.now().toString(36)}${(seq++).toString(36)}`;

export function newTextLayer(overrides = {}) {
  return { ...TEXT_DEFAULTS, id: layerId(), ...overrides };
}

export function emojiLayer(emoji) {
  return newTextLayer({ text: emoji, font: 'Arial, sans-serif', size: 28, effect: 'none', strokeW: 0, y: 0.25, x: 0.8 });
}

export function imageLayer(photo, frameWidth) {
  return {
    id: layerId(),
    type: 'image',
    url: photo.url,
    name: photo.name,
    w: photo.width,
    h: photo.height,
    x: 0.5,
    y: 0.5,
    width: Math.max(10, frameWidth * 0.4),
    rotate: 0,
    opacity: 1,
    flipX: false,
  };
}

// Width of a text string in mm (measured with the real font once it has loaded)
let ctx = null;
export function measureText(text, layer, fontSizeMM) {
  const chars = [...(text || '')].length;
  const spacing = ((layer.spacing || 0) / 100) * fontSizeMM;
  if (typeof document === 'undefined') return chars * fontSizeMM * 0.6 + spacing * Math.max(0, chars - 1);
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${layer.italic ? 'italic ' : ''}${layer.weight || 400} 100px ${layer.font}`;
  return (ctx.measureText(text || '').width / 100) * fontSizeMM + spacing * Math.max(0, chars - 1);
}

// Old single-caption format -> layer
export function legacyCaptionToLayer(slot, frame) {
  return newTextLayer({
    text: slot.text,
    font: slot.textFont || 'Arial, sans-serif',
    size: slot.textSize || 12,
    weight: slot.textBold ? 700 : 400,
    color: slot.textColor || '#ffffff',
    effect: 'none',
    strokeW: slot.textShadow ? (slot.textSize || 12) * 0.3528 * 0.12 : 0,
    strokeColor: 'rgba(0,0,0,0.55)',
    y: Math.min(0.98, Math.max(0.02, 1 - (slot.textY ?? 5) / frame.height)),
  });
}
