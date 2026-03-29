Fire Defense is an educational, tower-defense-style web game designed to teach the real-world principles of "firescaping" and defensible space. Players must protect a home from advancing ground fires and flying embers by utilizing proper landscaping techniques across the Home Ignition Zone (HIZ).

Tech stack and dependencies:

This game is built entirely within a single, portable React component (App.jsx). It does not rely on heavy game engines (like Phaser or Unity), but rather uses standard React state and a custom requestAnimationFrame loop.

React (18.2.0 or higher): Uses hooks (useState, useEffect, useRef) for game state and the rendering engine.

Tailwind CSS (3.0.0 or higher): Used extensively for all layout, coloring, grid math, and UI styling.

lucide-react (0.200.0 or higher): Provides the SVG icons used in the UI (Shield, Info, RotateCcw, ChevronRight).