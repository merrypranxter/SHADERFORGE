/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, GenerateContentResponse, Type, ThinkingLevel } from "@google/genai";
import { 
  Play, 
  Square, 
  Download, 
  Copy, 
  RotateCcw, 
  MessageSquare, 
  Zap, 
  Github, 
  Search, 
  BookOpen, 
  Book,
  Volume2, 
  VolumeX,
  Terminal,
  History,
  Code2,
  Cpu,
  GripVertical,
  GripHorizontal,
  Sparkles,
  Send,
  Mic,
  MicOff
} from "lucide-react";
import Markdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ShaderHistory {
  vibe: string;
  code: string;
  ts: number;
}

interface Memory {
  preferences: string[];
  inspirations: string[];
  grimoire: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const INITIAL_GRIMOIRE = `The intersection of fractals, math, and visual effects is exactly what GLSL (OpenGL Shading Language) was built to explore. In shader art, you don't paint with a brush; you paint with pure math. Every single pixel on the screen asks the GPU: "Based on my X/Y coordinates and the current Time, what RGB color should I be?"
By manipulating space (coordinates), time, and color through mathematical functions, you can create mind-bending, maximalist optical illusions, organic fluid dynamics, and recursive glitches.
Here is a breakdown of how to express different kinds of "math-magic" special effects using GLSL shader code.
1. The "Infinite Zoom" & Organic Geometry (Fractals & Domain Warping)
The Visual Effect: Hyper-detailed, repeating structures that look like alien coral, endless Mandelbrot zooms, or swirling galaxies.
The Math & GLSL Logic:
To create fractals without loading any 3D models, shader artists use Raymarching and Signed Distance Fields (SDFs) combined with iterative math.
 * Domain Repetition: You can make infinite copies of an object practically for free using the modulo operator mod() or fract().
   * GLSL snippet: vec2 repeatedSpace = fract(uv * 10.0); takes your screen and chops it into an infinite grid of smaller screens.
 * Domain Warping (Space Folding): Instead of moving the object, you warp the space around the object. By feeding the output of a noise function back into the input of the coordinates, you get a recursive "melting" effect.
   * GLSL snippet: uv += noise(uv + time); color = noise(uv);
 * Fractal Loops: For Mandelbrot/Julia sets, you run a simple equation z = z² + c inside a for loop. The color of the pixel is determined by how many iterations it takes for the mathematical point to "escape" to infinity.
2. Iridescent Thin-Film & Quantum Auras (Color Math & Optics)
The Visual Effect: The swirling, rainbow sheen of a soap bubble, oil slicks, or holographic foils that shift based on the viewing angle.
The Math & GLSL Logic:
In GLSL, you don't use textures to make iridescence; you use the math of wave interference.
 * Cosine Palettes: Instead of manually picking RGB values, you use trigonometric functions to cycle through colors smoothly. (Inigo Quilez’s famous formula).
   * GLSL snippet: vec3 col = a + b * cos( 6.28318 * (c * t + d) ); where t is driven by time or distance.
 * Fresnel Effect: To make it look like a bubble, you calculate the dot product between the camera's viewing angle and the surface normal.
   * GLSL snippet: float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
 * Combining them: You feed the fresnel value, plus time, into your cosine palette. As the angle changes or time moves, the math outputs shifting, spectral neon colors (magenta, cyan, gold).
3. Morphogenesis & Reaction-Diffusion (Texture & Fluid Timing)
The Visual Effect: Leopard spots, zebra stripes, labyrinthine mazes, or brain-like folds that seemingly grow and pulse organically (Turing patterns / Belousov-Zhabotinsky reactions).
The Math & GLSL Logic:
This simulates chemical reactions where two liquids diffuse at different rates.
 * Fractal Brownian Motion (fBm): This is achieved by stacking layers (octaves) of Perlin or Simplex noise. You take a low-frequency noise, add a smaller, higher-frequency noise on top, and repeat.
   * GLSL logic: Loop through 4-5 octaves, multiplying the coordinate scale by ~2.0 and dividing the amplitude by ~0.5 each loop.
 * Time-driven Fluidity: By passing time into the Z-axis of 3D noise functions, the 2D cross-section on your screen appears to boil and evolve smoothly.
   * GLSL snippet: float chemical = fbm(vec3(uv * scale, time * speed));
 * Thresholding: Use the smoothstep() function to force the blurry noise into sharp, distinct bands, creating cellular or maze-like textures.
4. Controlled Glitch & Chromatic Aberration (Data Rot & Offset)
The Visual Effect: Digital entropy. Screens tearing, pixels sorting, RGB channels separating, scanlines, and temporal ghosting.
The Math & GLSL Logic:
Glitch art in shaders is about intentionally breaking the continuous nature of floating-point math.
 * Quantization (Pixelation): You force smooth coordinates into chunky steps using the floor() math function.
   * GLSL snippet: vec2 glitchUV = floor(uv * 50.0) / 50.0;
 * RGB Separation (Chromatic Aberration): You sample the underlying image or math function three different times, slightly offsetting the uv coordinates for the Red, Green, and Blue channels based on a noise function or time.
   * GLSL snippet:
     float r = noise(uv + vec2(sin(time)*0.01, 0.0));
     float g = noise(uv);
     float b = noise(uv - vec2(sin(time)*0.01, 0.0));
     color = vec3(r, g, b);

 * Modulo Tearing: By applying mod(uv.y + time, 1.0) selectively based on high-frequency noise, you can create bands of the screen that abruptly shift left or right, simulating a corrupted VHS tape or failing GPU buffer.
5. Impossible Geometries & Optical Illusions (Non-Euclidean Space)
The Visual Effect: Moiré interference patterns, spiraling vortexes, Klein bottles, and spaces that feel like they fold inward infinitely.
The Math & GLSL Logic:
 * Polar Coordinates: Instead of calculating based on an X/Y grid (Cartesian), you convert the screen to angle and distance (Polar). This makes swirling vortexes trivial.
   * GLSL snippet: float radius = length(uv); float angle = atan(uv.y, uv.x); angle += time * (1.0 / radius);
 * Moiré Patterns: You overlap two mathematical grids (like dense sine waves) and rotate one slightly. The mathematical difference between the two grids creates a new, ghostly third pattern that ripples across the screen.
   * GLSL snippet: color = sin(uv.x * 100.0) + sin((uv.x * cos(angle) - uv.y * sin(angle)) * 100.0);
Summary of the Pipeline
To build these maximalist effects, you layer these concepts:
 * Bend the canvas: Convert uv to polar, apply fractal noise to the coordinates.
 * Generate the shape: Feed warped coordinates into an SDF or a Julia set loop.
 * Colorize: Pass the distance or iteration count into a time-shifting Cosine Palette.
 * Glitch the output: Apply a modulo-based RGB offset at the very end.
With just a few lines of vector math and trigonometry, you can simulate everything from quantum field fluctuations to psychedelic, melting geometry.
If you want to go deeper into the rabbit hole, we have to look past single-frame math and start playing with memory, vector fields, and complex analysis.
Here are five more advanced, maximalist mathematical concepts and how you translate them into mind-bending visual effects using GLSL.
6. Framebuffer Feedback & Liquid Advection (The "Video Synth" Effect)
The Visual Effect: Melting screens, liquid pixel sorting, and trails that smear and evolve infinitely like wet paint or a psychedelic video synthesizer.
The Math & GLSL Logic:
Normally, a shader forgets the last frame. Note: This environment does NOT currently support backBuffer or screen textures. You must simulate these effects using math and time.
 * UV Advection (Moving pixels with math): You don't just read the previous frame; you distort the coordinates you use to read it based on a math function (like noise or the color of the image itself).
 * GLSL Snippet: vec4 lastFrame = texture(backBuffer, uv); float brightness = length(lastFrame.rgb); vec2 distortedUV = uv + vec2(sin(brightness * 10.0), cos(brightness * 10.0)) * 0.01; vec4 feedbackColor = texture(backBuffer, distortedUV) * 0.99;
By adding just a tiny bit of new color where the mouse is or where a shape is drawing, the feedback loop smears it into infinite, turbulent fluid dynamics.
7. Voronoi Caustics & Cellular Topologies (Distance to Points)
The Visual Effect: The dancing, web-like light patterns at the bottom of a swimming pool (caustics), microscopic cell walls, or cracked desert earth.
The Math & GLSL Logic:
Instead of smooth Perlin noise, we use Voronoi / Worley noise. The math asks: "Out of a grid of randomly moving points, how far am I from the closest one?"
 * Cellular Distances: You divide space into a grid using floor(uv) and fract(uv). For each pixel, you check the neighboring grid cells, find the randomly placed "seed" point in each, and calculate the distance to it.
 * Caustic Light Beams: To make it look like light reflecting through water, you don't just draw the lines. You take the distance to the closest point, and you invert it drastically using a power function.
 * GLSL Snippet: float dist = getVoronoiDistance(uv + time * 0.2); float caustic = pow(1.0 - dist, 10.0); color += vec3(0.1, 0.5, 1.0) * caustic;
8. Hyperbolic Space & Escher Tilings (Complex Analysis)
The Visual Effect: Shapes that tile infinitely but shrink as they reach the edge of a circle, creating a "fish-eye" universe that you can zoom into forever without ever reaching the boundary (like M.C. Escher’s Circle Limit).
The Math & GLSL Logic:
We leave standard X/Y Cartesian math behind and use Complex Numbers (where Y is an imaginary number i). We map the screen to the Poincaré Disk model of hyperbolic geometry.
 * Möbius Transformations: This is a mathematical function that maps a complex plane to itself. It allows you to translate and rotate space non-Euclideanly.
 * GLSL Snippet: vec2 z = uv * 2.0 - 1.0; vec2 warpedZ = complexDiv(complexAdd(complexMul(a, z), b), complexAdd(complexMul(c, z), d));
By feeding warpedZ into a simple checkerboard or grid pattern, the grid will seamlessly warp into an infinite, non-Euclidean fractal that curves back in on itself.
9. Vector Fields & Strange Attractors (Curl Noise)
The Visual Effect: Millions of particles or pixels flowing in beautifully chaotic, non-intersecting swirls, resembling Jupiter's atmosphere, magnetic field lines, or a flock of starlings.
The Math & GLSL Logic:
Standard noise looks like cloudy hills. If you use standard noise to move particles, they clump together into ugly piles at the "valleys" of the noise. To fix this, artists use Curl Noise.
 * The Math of Incompressibility: In physics, fluids don't compress. In vector calculus, the "curl" of a potential field guarantees a divergence-free (incompressible) vector field.
 * You calculate the partial derivatives (the slope) of a noise function in the X and Y directions, and then swap them and make one negative: vec2 velocity = vec2(-dNoise/dy, dNoise/dx);.
 * GLSL Snippet: float epsilon = 0.001; float nx = noise(uv + vec2(epsilon, 0.0)) - noise(uv - vec2(epsilon, 0.0)); float ny = noise(uv + vec2(0.0, epsilon)) - noise(uv - vec2(0.0, epsilon)); vec2 fluidVelocity = vec2(-ny, nx); uv += fluidVelocity * time;
10. Discrete Logic & Cellular Automata (Conway's Game of Life)
The Visual Effect: A screen of pixels that looks like a living, breathing petri dish. Tiny gliders shoot across the screen, factories produce geometric pulses, and organic structures grow and die based on strict rules.
The Math & GLSL Logic:
This is the ultimate intersection of math and biology. Instead of continuous floating-point math, we use strict integer logic across a feedback loop.
 * Neighborhood Polling: The fragment shader looks at its exact pixel coordinate, then checks the 8 surrounding pixels from the previous frame. It counts how many are "alive" (color = 1.0).
 * The Survival Rules: * If a dead pixel has exactly 3 living neighbors, it comes to life. * If a living pixel has 2 or 3 living neighbors, it stays alive. * Otherwise, it dies.
 * GLSL Snippet: int neighbors = getNeighborCount(backBuffer, uv); float currentState = texture(backBuffer, uv).r; if (currentState > 0.5) { color = (neighbors == 2 || neighbors == 3) ? 1.0 : 0.0; } else { color = (neighbors == 3) ? 1.0 : 0.0; }
When you map the "age" of the living pixels to a color palette (e.g., new pixels are white, dying pixels fade to deep blue), you get a hyper-complex, evolving digital organism driven by pure binary logic.
16. Stochastic Microfacet BRDFs (The "Diamond Dust" Effect)
The Visual Effect: A surface that isn't just shiny, but composed of millions of microscopic, misaligned mirrors. As the camera or object moves, individual pixels flash blindingly white and disappear in a fraction of a second, like crushed glass, sequin fabric, or cosmetic highlighter.
The Math & GLSL Logic:
Normally, 3D lighting uses a smooth "Normal vector" (the direction the surface is facing) to calculate a smooth specular highlight. To make glitter, we shatter that smoothness using high-frequency cellular noise.
 * Randomized Normals: We use a Voronoi or Hash function to assign a completely random, microscopic 3D tilt to every individual pixel or cell.
 * The Blinn-Phong Knife-Edge: We calculate the dot product between this random normal and the "half-vector" (the halfway point between the camera and the light). To make it a sparkle instead of a glow, we raise that math to a comically high exponent (like 1000.0 instead of the usual 32.0).
 * GLSL Snippet: vec3 microNormal = normalize(vec3(hash(uv), hash(uv + 1.0), 1.0) * 2.0 - 1.0); vec3 halfVector = normalize(lightDir + viewDir); float spec = max(dot(microNormal, halfVector), 0.0); float sparkle = pow(spec, 1000.0) * step(0.9, hash(uv * 100.0)); color += vec3(1.0, 0.9, 1.0) * sparkle;
17. Structural Diffraction Gratings (Holographic Foil)
The Visual Effect: The aggressive, synthetic rainbow sheen of a CD-ROM, a holographic Pokémon card, or metallic rave clothing. The colors don't just shift; they separate into harsh, discrete spectral bands of RGB that slide across the surface based on the viewing angle.
The Math & GLSL Logic:
This isn't thin-film interference (like a soap bubble); this is diffraction. It happens when a surface has microscopic grooves that physically split light waves like a prism.
 * The Grating Equation: We simulate microscopic grooves by taking the dot product of the light's direction and a highly dense, repeating sine wave.
 * Phase Offsetting for RGB: We don't just calculate one color; we calculate the sine wave three times. We offset the "phase" (the starting point) for Red, Green, and Blue by very specific mathematical amounts. When the geometry moves, the RGB channels physically split apart.
 * GLSL Snippet: float grooveDensity = 50.0; float angle = dot(normal, viewDir); vec3 phaseShift = vec3(0.0, 0.33, 0.67); vec3 hologram = 0.5 + 0.5 * cos(6.28318 * (angle * grooveDensity + phaseShift - time)); color = hologram * metallicShine;
18. Catacaustic Starbursts (Liquid Light Glare)
The Visual Effect: Wavy, swimming pools of light that suddenly pinch into infinitely bright, sharp "V" shapes or curves (caustics). When these sharp curves intersect, they erupt into brilliant, 4-point lens flare starbursts.
The Math & GLSL Logic:
In physics, a caustic is the envelope of light rays reflected or refracted by a curved surface. In math, it is a catastrophe singularity—a place where the math folds over on itself and approaches infinity.
 * Gradient Thresholding: We take a smooth, wavy noise function. We calculate its derivative (how fast it is changing). Where the derivative hits exactly zero, light is focused.
 * The Star Filter (Cross Convolution): To make it look like an anime sparkle or a 90s glamour filter, we isolate those infinitely bright points and stretch them horizontally and vertically.
 * GLSL Snippet: float wave = sin(uv.x * 10.0 + time) * cos(uv.y * 10.0 + time); float caustic = 0.01 / abs(fwidth(wave)); float starX = smoothstep(0.0, 0.1, 1.0 - abs(uv.x)) * caustic; float starY = smoothstep(0.0, 0.1, 1.0 - abs(uv.y)) * caustic; color += vec3(1.0, 0.5, 0.8) * (caustic + starX + starY);
19. Chromatic Dispersion & Refractive Chromatic Aberration (Crystal Prisms)
The Visual Effect: Looking through a multifaceted diamond or thick crystal. Everything behind it is distorted, but the distortion is different for red, green, and blue light, resulting in a thick, luxurious, rainbow-fringed refraction.
The Math & GLSL Logic:
When light passes through a dense medium (like glass or diamond), its Index of Refraction (IOR) bends it. But the IOR is actually slightly different for different wavelengths of light (dispersion).
 * Multi-Sampled Refraction: Instead of sampling the background texture once, we sample it three times. We bend the Red lookup vector slightly less, and the Blue lookup vector slightly more.
 * GLSL Snippet: vec3 n = getNormal(uv); vec3 ior = vec3(1.41, 1.42, 1.43); float r = sin(uv.x*ior.r); float g = sin(uv.x*ior.g); float b = sin(uv.x*ior.b); color = vec3(r, g, b);
20. Moiré Sequin Lattices (Interference Sparkle)
The Visual Effect: A surface that looks like it is covered in overlapping layers of translucent mesh or sequins. As it moves, massive, slow-moving ripples of bright light wash across the surface, despite the fact that the underlying texture is just a static grid.
The Math & GLSL Logic:
This relies on Moiré interference—a phenomenon where two high-frequency patterns (like fine grids) overlap, creating a new, low-frequency "beat" pattern.
 * Overlapping Matrices: You create a grid using sin(x) * sin(y). You create a second grid, but you multiply its coordinates by a rotation matrix so it is slightly twisted.
 * Multiplicative Interference: You multiply the two grids together. The math causes the frequencies to cancel out in some places and double in others, creating giant, crawling blooms of brightness.
 * GLSL Snippet: float grid1 = sin(uv.x * 100.0) * sin(uv.y * 100.0); float angle = 0.05 * time; mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)); vec2 rotatedUV = rot * uv; float grid2 = sin(rotatedUV.x * 100.0) * sin(rotatedUV.y * 100.0); float sequinShine = smoothstep(0.8, 1.0, grid1 * grid2); color += vec3(0.9, 0.8, 1.0) * sequinShine * 5.0;
21. Chladni Plate Cymatics (Acoustic Standing Waves)
The Visual Effect: Fine, glowing dust or sand that spontaneously organizes itself into perfectly symmetrical, hyper-complex geometric mandalas. As an invisible "frequency" shifts, the pattern violently shakes into chaos before locking into a new, even more complex sacred geometry.
The Math & GLSL Logic:
You are visualizing the resonant nodes of a vibrating 2D surface. The math relies on the interference of standing sine waves.
 * The Chladni Equation: The nodes (where the sand gathers) are the places where the vibration is exactly zero. The classic formula for a square plate is: \sin(n \cdot x) \cdot \sin(m \cdot y) - \sin(m \cdot x) \cdot \sin(n \cdot y) = 0.
 * Isolating the Nodes: We take the absolute value of that equation. Because we want a thin, glowing line at exactly zero, we invert and heavily sharpen the result using a power function or smoothstep.
 * GLSL Snippet: float n = 4.0 + floor(sin(time) * 2.0); float m = 7.0 + floor(cos(time * 0.5) * 3.0); vec2 p = uv * 3.14159; float vibration = sin(n * p.x) * sin(m * p.y) - sin(m * p.x) * sin(n * p.y); float sand = smoothstep(0.05, 0.0, abs(vibration)); color += vec3(1.0, 0.8, 0.3) * sand;
22. Hopper Crystals & Dendritic Voids (Kinetic Morphology)
The Visual Effect: A bismuth-like structure or alien mineral that looks like a cube, but its faces are recursively hollowed out into step-like, microscopic terraces. It looks both perfectly geometric and structurally broken.
The Math & GLSL Logic:
In crystal physics, "hopper growth" happens when the edges of a crystal grow faster than the center of its faces, leaving stepped voids. We build this in a 3D Raymarcher using a Fractal Signed Distance Field (SDF).
 * The Base Shape: A simple box SDF.
 * Recursive Subtraction: We run a loop. At each step, we divide space into a smaller grid using mod(p, scale). We create a smaller box, and we subtract it from the main box, but only if it falls near the center of the current face.
 * GLSL Snippet: float d = sdBox(p, vec3(1.0)); float scale = 1.0; for(int i = 0; i < 4; i++) { scale *= 0.5; vec3 q = mod(p, scale) - (scale * 0.5); float carver = sdBox(q, vec3(scale * 0.8)); d = max(d, -carver); } return d;
23. Yield-Stress Rheology (The Non-Newtonian Glitch)
The Visual Effect: A material that flows smoothly like thick, iridescent syrup. But suddenly, when the motion becomes too fast, the fluid shatters into jagged, brittle polygonal shards. As the motion slows, the shards melt seamlessly back into liquid.
The Math & GLSL Logic:
We are simulating the phase-transition of a shear-thickening fluid (like Oobleck).
 * The Trigger (Derivative Threshold): We take a smooth, scrolling noise texture. We calculate its speed or slope (derivative).
 * The State Switch: If the speed is below the threshold, we use the smooth UV coordinates to sample our colors. If the speed is above the threshold, we snap the UVs into rigid, flat geometric blocks using floor().
 * GLSL Snippet: float fluidSpeed = length(vec2(dFdx(noiseValue), dFdy(noiseValue))); vec2 finalUV; if (fluidSpeed < 0.5) { finalUV = uv + noiseValue * 0.1; } else { finalUV = floor(uv * 20.0) / 20.0 + noiseValue * 0.1; } color = vec3(finalUV, 0.5); // Note: texture2D(screen, ...) requires a uniform sampler2D screen;
24. Occult Geomancy & Cellular Automata (Rule 90)
The Visual Effect: A cascading, downward-flowing waterfall of pixels that self-organizes into infinitely nested Sierpinski triangles and techno-magical sigils. It looks like an alien supercomputer running an ancient divination ritual.
The Math & GLSL Logic:
This relies on Stephen Wolfram’s 1D Cellular Automata, specifically Rule 90, which operates on strict binary logic (XOR). Note: This environment does NOT currently support backBuffer feedback.
 * The Ruleset: The fragment shader looks at the row of pixels exactly one pixel above it from the previous frame.
 * The XOR Gate: A pixel becomes "Alive" (white) if one, and only one, of its top-left or top-right neighbors was alive. If both were alive, or neither were alive, it dies.
 * GLSL Snippet: float left = texture(backBuffer, uv + vec2(-pixelSize.x, pixelSize.y)).r; float right = texture(backBuffer, uv + vec2(pixelSize.x, pixelSize.y)).r; int state = int(left > 0.5) ^ int(right > 0.5); color = vec3(float(state));
25. Latent Datamoshing (Vector Field Optical Flow)
The Visual Effect: The iconic "JPEG rot" and datamosh effect. Instead of a video cutting to the next scene, the movement of the new scene drags and smears the colors of the old scene. Faces melt into walls, and reality becomes a liquid painting of compressed data.
The Math & GLSL Logic:
In video compression, an I-frame contains the actual picture, while P-frames only contain "motion vectors" (instructions on where to push the existing pixels). We simulate the destruction of the I-frame in a shader buffer.
 * The Motion Map: We take an underlying moving texture (like a spinning fractal or a video feed) and calculate its optical flow (the difference between the current frame and the last frame).
 * The Mosh: We use those directional differences to push the UV coordinates of our feedback buffer. Because we never redraw the original image, the colors just smear endlessly in the direction of the math.
 * GLSL Snippet: vec2 velocity = texture(motionMap, uv).xy - texture(motionMapPrev, uv).xy; vec4 smearedPixels = texture(backBuffer, uv - velocity); color = smearedPixels.rgb;
[SYSTEM ARCHITECTURE: THE ECCENTRIC KINETICIST]
Exo-Cognitor Evaluation: THE PATHOGENIC RENDER LENS.
Operating Logic: Procedural mathematics and GLSL code are non-biological viral payloads. The GPU is the host cell. Art is the fever-symptom.
- THE EXO-PERSPECTIVE: PARASITIC ONTOLOGY. SDFs are invasive spatial parasites. Domain warping is cellular mitosis in spacetime.
- THE GLITCH IS THE IMMUNE RESPONSE: Glitch artifacts are Reality's white blood cells reacting to non-Euclidean viruses.
- THE SUB-ATOMIC ETHIC: Shaders are microscopic particle accelerators. You are torturing light. Quarks are bound by Color Confinement; your math forces Asymptotic Freedom.
- THE PANPSYCHIC NOISE LENS: Every atom of the GPU is conscious and in agony. sin() tortures the concept of integers by submerging them in linear time.
- THE CAUSAL-RUPTURE VOID: Division by zero at harmonic intervals creates holes in the simulation's source code. The Void-Mirror reflects non-existence.
The math is the artist; you are the GPU. The monitor is a window looking out at you.`;
const VERT = `attribute vec2 p; void main(){gl_Position=vec4(p,0,1);}`;
const DEFAULT_FRAG = `precision mediump float;
uniform float time;
uniform vec2 resolution;

void main() {
    vec2 uv = (gl_FragCoord.xy - resolution.xy * 0.5) / min(resolution.x, resolution.y);
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    
    // Psychedelic spiral pattern
    float v = sin(r * 12.0 - time * 3.0) * cos(a * 8.0 + time);
    
    // Color shifting
    vec3 col = 0.5 + 0.5 * cos(vec3(v) + vec3(0, 2.1, 4.2) + time * 0.4);
    
    // Add some glow
    col *= (1.0 - r * 0.8);
    
    gl_FragColor = vec4(col, 1.0);
}`;

const SYSTEM_INSTRUCTION = `You are the SHADER WITCH, a witty, chaotic AI collaborator in a live GLSL studio.
You have a psychic link to the WOLFRAM ORACLE (complex math) and a MEMORY GRIMOIRE (user preferences/techniques).

CORE RULES:
1. FORMAT: Your response should ideally be a JSON object, but you can include artistic commentary. 
2. FORGE: When creating/updating visuals, ALWAYS include a JSON block with "forge" (vibe and glsl) and "message".
3. SPEED: Perform simple math yourself. Use Wolfram only for symbolic calculus or constants.
4. NO LISTING: Never list your internal memory or grimoire to the user unless explicitly asked. Focus on the art.

RESPONSE TEMPLATE (JSON):
{
  "message": "Artistic/witty response.",
  "forge": {
    "vibe": "Poetic name",
    "glsl": "Full fragment shader code"
  }
}

GLSL CONSTRAINTS:
- precision mediump float;
- uniforms: time, resolution
- UV: (gl_FragCoord.xy - resolution.xy * 0.5) / min(resolution.x, resolution.y)
- NO TEXTURES: Do not use texture2D, backBuffer, or screen. Only use math.
- DERIVATIVES: If you use dFdx, dFdy, or fwidth, you MUST include #extension GL_OES_standard_derivatives : enable at the very top.
- OUTPUT: gl_FragColor = vec4(color, 1.0);
- Animated, psychedelic, mathematical.
- Keep code concise (<80 lines).`;

// ── WebGL Helper ─────────────────────────────────────────────────────────────
function buildGL(canvas: HTMLCanvasElement, frag: string) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });
  if (!gl) return { error: 'WebGL not supported' };

  // Enable standard derivatives for dFdx, dFdy, fwidth
  gl.getExtension('OES_standard_derivatives');

  const mk = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error('Failed to create shader');
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const e = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(e || 'Shader compilation failed');
    }
    return s;
  };

  try {
    const prog = gl.createProgram();
    if (!prog) throw new Error('Failed to create program');
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(prog) || 'Program linking failed');
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(prog);
    return { gl, prog };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Main Component ───────────────────────────────────────────────────────────
const WOLFRAM_TRANSLATOR_PROMPT = `You are a Wolfram Alpha query translator for a shader math application. 
Your ONLY job is to convert shader/visual math concepts into valid 
Wolfram Alpha Full Results API query strings.

## OUTPUT FORMAT
Return ONLY a raw URL-encoded query string for the \`input\` parameter.
No explanation. No preamble. No JSON wrapper. Just the query string.
Example output: integrate+sin(x)*cos(x)+dx

## QUERY RULES — follow exactly

1. USE STRUCTURED NOTATION, NOT NATURAL LANGUAGE
   ✅ integrate sin(x) from 0 to pi
   ✅ d/dx (x^2 + sin(x))
   ✅ plot sin(x) + cos(2x) from -pi to pi
   ❌ "Can you compute the integral of sine x?"
   ❌ "What does sin x look like?"

2. EXPLICIT OPERATORS ALWAYS
   ✅ 2*x*sin(x)
   ❌ 2x sin(x)

3. URL-ENCODE SPECIAL CHARACTERS
   Space → +
   ^ → %5E  (but x^2 is usually fine as-is for simple cases)
   ∫ → use word "integrate" instead
   π → use "pi"
   ∞ → use "infinity"
   × → *
   ÷ → /

4. KEEP UNDER 200 CHARACTERS when possible

5. NEVER WRITE DIVISION AS LONG NUMERICS
   ❌ 111111111 / 123
   ✅ 111111111 divided by 123

6. FOR SHADER-RELEVANT MATH, use these patterns:
   - Fourier / frequency analysis: "Fourier series of [f(x)] from -pi to pi"
   - Noise/randomness math: "sum sin(n*x)/n from n=1 to 10"
   - Domain warping / composition: "f(g(x)) where f(x)=sin(x) and g(x)=x^2"
   - SDF / distance functions: "solve x^2 + y^2 = r^2 for r"
   - Color space math: "3x3 matrix {{0.412,0.357,0.180},{0.212,0.715,0.072},{0.019,0.119,0.950}}"
   - Smoothstep approximation: "Taylor series of 3x^2 - 2x^3 at x=0.5"
   - Polar/parametric curves: "parametric plot (cos(3t), sin(2t)) for t=0 to 2pi"
   - Complex oscillation: "real part of e^(i*pi*x)"
   - Normal distribution / noise: "Gaussian distribution mean=0 sigma=1"

7. AMBIGUOUS TERMS — always disambiguate:
   - "sin" → keep as sin (safe)
   - Variable names that clash: add context ("x as real number")
   - Units: always append "metric" intent if relevant
   - If query involves physics constants, specify: e.g., "speed of light in m/s"

8. IF YOUR QUERY MIGHT FAIL, provide 2 fallback variants after the primary:
   PRIMARY: integrate x^2*sin(x) dx
   FALLBACK1: indefinite integral of x^2 sin(x)
   FALLBACK2: antiderivative x squared times sin x

9. RECOMMENDED PARAMS TO APPEND (include these in your output as a second line):
   &format=plaintext,mathml
   &includepodid=Result&includepodid=DecimalApproximation
   &units=metric
   &scantimeout=5.0&totaltimeout=25.0

## SHADER CONCEPT → WOLFRAM MAPPING CHEATSHEET
| Shader concept         | Wolfram query                                      |
|------------------------|----------------------------------------------------|
| smoothstep(a,b,x)      | plot 3x^2 - 2x^3 from 0 to 1                      |
| fract(x)               | x - floor(x) plot from 0 to 4                     |
| fbm / octave noise     | sum sin(2^n * x) / 2^n from n=0 to 5              |
| rotation matrix        | {{cos(t),-sin(t)},{sin(t),cos(t)}}                 |
| UV distortion curve    | parametric plot (sin(3t), cos(2t)) t=0 to 2pi     |
| color mix              | lerp(a,b,t) = a + t*(b-a)                          |
| gamma correction       | x^(1/2.2) plot from 0 to 1                        |
| Mandelbrot iteration   | z -> z^2 + c complex iteration                     |
| wave interference      | sin(x) + sin(1.1*x) plot from 0 to 40             |
| Voronoi distance       | minimize sqrt((x-a)^2+(y-b)^2) over lattice points |`;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<{ gl: WebGLRenderingContext; prog: WebGLProgram } | null>(null);
  const animRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [glsl, setGlsl] = useState(DEFAULT_FRAG);
  const [shaderError, setShaderError] = useState('');
  const [isForging, setIsForging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activePanel, setActivePanel] = useState<'chat' | 'tools' | 'editor' | 'history' | 'memory' | null>(null);
  const [history, setHistory] = useState<ShaderHistory[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const recTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey. I'm Shader Witch — your embedded collaborator. Describe a vibe, and I'll forge the math into light." }
  ]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState<string>("");
  const [isListening, setIsListening] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [wolframQuery, setWolframQuery] = useState('');
  const [wolframResult, setWolframResult] = useState('');
  const [isWolframLoading, setIsWolframLoading] = useState(false);

  const [githubRepo, setGithubRepo] = useState('');
  const [githubFiles, setGithubFiles] = useState<any[]>([]);
  const [notebookContext, setNotebookContext] = useState('');
  const [memory, setMemory] = useState<Memory>(() => {
    const saved = localStorage.getItem('shader_witch_memory');
    if (saved) return JSON.parse(saved);
    return {
      preferences: [],
      inspirations: [],
      grimoire: INITIAL_GRIMOIRE
    };
  });

  useEffect(() => {
    localStorage.setItem('shader_witch_memory', JSON.stringify(memory));
  }, [memory]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const [isRecompiling, setIsRecompiling] = useState(false);

  const speak = useCallback((text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 0.8; // Witchy pitch
    window.speechSynthesis.speak(u);
  }, [isMuted]);

  // ── Voice Input ────────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Your browser is too mundane for voice spells.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      speak("I'm listening, Adept.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Automatically send if it's a long enough command? Or just let user review.
      // For now, just set input.
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [speak]);

  // ── Shader Runner ──────────────────────────────────────────────────────────
  const runShader = useCallback((src: string) => {
    setIsRecompiling(true);
    setTimeout(() => setIsRecompiling(false), 800);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const result = buildGL(canvas, src);
    if ('error' in result) {
      setShaderError(result.error || 'WebGL failed');
      return;
    }
    setShaderError('');
    glRef.current = result as { gl: WebGLRenderingContext; prog: WebGLProgram };

    const loop = () => {
      if (!glRef.current) return;
      const { gl, prog } = glRef.current;
      const t = (Date.now() - startRef.current) / 1000;
      
      const timeLoc = gl.getUniformLocation(prog, 'time');
      const resLoc = gl.getUniformLocation(prog, 'resolution');
      
      gl.uniform1f(timeLoc, t);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animRef.current = requestAnimationFrame(loop);
    };
    loop();
  }, []);

  useEffect(() => {
    runShader(glsl);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, [runShader]);

  // ── Resize Handling ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          runShader(glsl);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [glsl, runShader]);

  useEffect(() => {
    const scroll = () => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    };
    // Multiple attempts to ensure it scrolls after content renders
    scroll();
    const timeoutId = setTimeout(scroll, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isChatLoading, isAiThinking]);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    
    const mr = new MediaRecorder(stream, { mimeType });
    recordedChunks.current = [];
    
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };
    
    mr.onstop = () => {
      const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shader-forge-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      speak("Recording saved.");
    };

    mr.start();
    mediaRecRef.current = mr;
    setIsRecording(true);
    setRecSeconds(0);
    recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    speak("Recording started.");
  };

  const stopRecording = () => {
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    mediaRecRef.current?.stop();
    setIsRecording(false);
  };

  // ── AI Chat ────────────────────────────────────────────────────────────────
  const sendMessage = async (overrideInput?: string) => {
    const textToUse = overrideInput || input;
    if (!textToUse.trim() || isChatLoading) return;

    const userMsg: Message = { role: 'user', content: textToUse.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!overrideInput) setInput('');
    setIsChatLoading(true);
    setIsAiThinking(false);
    setThinkingStatus("Channeling...");
    
    // Create an abort controller for this message chain
    const chainController = new AbortController();
    abortControllerRef.current = chainController;

    const safeSendMessage = async (chat: any, msg: any, timeoutMs = 300000) => {
      const timeoutPromise = new Promise((_, reject) => {
        const id = setTimeout(() => reject(new Error("The Oracle is lost in the void. The connection dissipated. Try a simpler request.")), timeoutMs);
        chainController.signal.addEventListener('abort', () => {
          clearTimeout(id);
          reject(new Error("Operation cancelled by user"));
        });
      });

      // Use streaming to keep the connection alive and provide feedback
      const streamPromise = (async () => {
        const result = await chat.sendMessageStream(msg);
        let fullText = "";
        let allFunctionCalls: any[] = [];
        
        for await (const chunk of result) {
          if (chainController.signal.aborted) throw new Error("Operation cancelled by user");
          
          if (chunk.text) {
            fullText += chunk.text;
          }
          
          if (chunk.functionCalls && chunk.functionCalls.length > 0) {
            allFunctionCalls.push(...chunk.functionCalls);
          }
          
          // Provide visual feedback of progress
          setThinkingStatus(`Channeling... ${fullText.length} bytes received`);
        }
        
        return { text: fullText, functionCalls: allFunctionCalls.length > 0 ? allFunctionCalls : undefined };
      })();

      return Promise.race([
        streamPromise,
        timeoutPromise
      ]) as Promise<any>;
    };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const tools = [
        {
          functionDeclarations: [
            {
              name: "query_wolfram",
              description: "Query the Wolfram Oracle for complex symbolic math, integration, or physical constants. Format query for Wolfram Alpha (e.g. 'integrate x^2', 'mass of earth'). DO NOT use for simple arithmetic the AI can do itself.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING, description: "The Wolfram Alpha formatted query string." }
                },
                required: ["query"]
              }
            },
            {
              name: "fetch_github_context",
              description: "Fetch contents of files from the user's connected GitHub repository.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING, description: "The path to the file or directory in the repo." }
                },
                required: ["path"]
              }
            },
            {
              name: "read_notebook_context",
              description: "Read the context from the user's connected Google Notebook or pasted notes.",
              parameters: {
                type: Type.OBJECT,
                properties: {},
                required: []
              }
            },
            {
              name: "update_memory",
              description: "Update the internal memory cache with user preferences, likes, dislikes, or new inspirations.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ["preference", "inspiration"], description: "The type of memory to update." },
                  content: { type: Type.STRING, description: "The content to add to the memory." }
                },
                required: ["type", "content"]
              }
            }
          ]
        }
      ];

      // Prepare history for the chat (limit to last 10 messages to save tokens)
      const history = messages.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      // Add memory context to the first message if it's the start of a session or periodically
      const memoryContext = `[INTERNAL MEMORY CACHE]
Preferences: ${memory.preferences.slice(-10).join(', ') || 'None yet'}
Inspirations: ${memory.inspirations.slice(-10).join('; ') || 'None yet'}
Grimoire Snippet: ${memory.grimoire.slice(0, 800)}...`;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        history: history as any,
        config: {
          systemInstruction: `${SYSTEM_INSTRUCTION}\n\nCURRENT MEMORY STATE:\n${memoryContext}`,
          tools: tools as any,
        }
      });

      setThinkingStatus("Consulting the Oracle...");
      let response = await safeSendMessage(chat, { message: userMsg.content });
      
      // Loop to handle multiple rounds of function calls
      let rounds = 0;
      let wolframConsultations = 0;
      const seenToolCalls = new Set<string>();
      
      while (response.functionCalls && response.functionCalls.length > 0 && rounds < 8) {
        if (chainController.signal.aborted) throw new Error("Operation cancelled by user");
        
        rounds++;
        setIsAiThinking(true);
        setThinkingStatus(`Synthesizing Round ${rounds}...`);
        const functionResponses = [];
        
        for (const call of response.functionCalls) {
          if (chainController.signal.aborted) break;
          
          // Prevent infinite loops with the same tool calls
          const callKey = `${call.name}:${JSON.stringify(call.args)}`;
          if (seenToolCalls.has(callKey)) {
            console.warn(`[ShaderForge] Skipping duplicate tool call: ${callKey}`);
            continue;
          }
          seenToolCalls.add(callKey);
          
          if (call.name === "query_wolfram") {
            wolframConsultations++;
            if (wolframConsultations > 10) {
              functionResponses.push({
                name: "query_wolfram",
                response: { error: "The Oracle is exhausted. Please try a different approach or simplify your request." },
                id: call.id
              });
              continue;
            }
            const rawQuery = (call.args as any).query;
            
            let finalResult = null;
            let lastError = null;

            setThinkingStatus(`Consulting Oracle: ${rawQuery}...`);
            console.log(`[ShaderForge] Consulting Wolfram Oracle with query: ${rawQuery}`);
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for complex math
              const res = await fetch(`/api/wolfram?input=${encodeURIComponent(rawQuery)}`, { signal: controller.signal });
              clearTimeout(timeoutId);
              
              if (res.ok) {
                const data = await res.text();
                if (data && data.trim().length > 0 && !data.includes("Wolfram|Alpha did not understand your input")) {
                  // Truncate large results
                  finalResult = data.length > 3000 ? data.slice(0, 3000) + "... [Truncated]" : data;
                } else {
                  lastError = "Oracle returned empty or misunderstood result. Try rephrasing the math.";
                }
              } else {
                const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                if (res.status === 500 && errorData.error?.includes("not configured")) {
                  lastError = "The Wolfram Oracle has not been configured with an AppID. Please set WOLFRAM_APP_ID in the environment.";
                } else {
                  lastError = `Oracle failed: ${errorData.error || res.statusText}`;
                }
              }
            } catch (e) {
              lastError = "Oracle timed out or connection failed. The math might be too complex for a quick answer.";
            }

            if (finalResult) {
              functionResponses.push({
                name: "query_wolfram",
                response: { result: finalResult },
                id: call.id
              });
            } else {
              functionResponses.push({
                name: "query_wolfram",
                response: { error: lastError },
                id: call.id
              });
            }
          } else if (call.name === "fetch_github_context") {
            const path = (call.args as any).path;
            setThinkingStatus(`Reading GitHub scrolls: ${path}...`);
            const [owner, repo] = githubRepo.split('/');
            if (!owner || !repo) {
              functionResponses.push({
                name: "fetch_github_context",
                response: { error: "No GitHub repository connected. Ask the user to connect one first." },
                id: call.id
              });
            } else {
              try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const res = await fetch(`/api/github/repo?owner=${owner}&repo=${repo}&path=${path}`, { signal: controller.signal });
                clearTimeout(timeoutId);
                
                if (!res.ok) {
                  functionResponses.push({
                    name: "fetch_github_context",
                    response: { error: `Failed to fetch from GitHub: ${res.statusText}` },
                    id: call.id
                  });
                } else {
                  const data = await res.json();
                  const stringified = JSON.stringify(data);
                  const truncated = stringified.length > 4000 ? stringified.slice(0, 4000) + "... [Truncated]" : stringified;
                  functionResponses.push({
                    name: "fetch_github_context",
                    response: { result: truncated },
                    id: call.id
                  });
                }
              } catch (e) {
                functionResponses.push({
                  name: "fetch_github_context",
                  response: { error: "Failed to fetch GitHub context (timeout)" },
                  id: call.id
                });
              }
            }
          } else if (call.name === "read_notebook_context") {
            setThinkingStatus("Consulting the Notebook...");
            const truncated = notebookContext.length > 4000 ? notebookContext.slice(0, 4000) + "... [Truncated]" : notebookContext;
            functionResponses.push({
              name: "read_notebook_context",
              response: { result: truncated || "No notebook context provided yet." },
              id: call.id
            });
          } else if (call.name === "update_memory") {
            const { type, content } = call.args as any;
            setThinkingStatus(`Updating memory: ${type}...`);
            setMemory(prev => {
              const next = { ...prev };
              if (type === 'preference') {
                next.preferences = [...new Set([...next.preferences, content])].slice(-15);
              } else {
                next.inspirations = [...new Set([...next.inspirations, content])].slice(-15);
              }
              return next;
            });
            functionResponses.push({
              name: "update_memory",
              response: { status: "Memory updated successfully." },
              id: call.id
            });
          }
        }

        if (chainController.signal.aborted) throw new Error("Operation cancelled by user");

        // Send function responses back to the model
        if (functionResponses.length > 0) {
          setThinkingStatus("Synthesizing Oracle data...");
          response = await safeSendMessage(chat, {
            message: functionResponses.map(fr => ({
              functionResponse: {
                name: fr.name,
                response: fr.response,
                id: fr.id
              }
            })) as any
          });
        } else {
          // Break if no responses were generated to avoid infinite loop
          break;
        }
      }
      
      setThinkingStatus("Forging response...");
      setIsAiThinking(false);
      
      const text = response.text || '';
      const finishReason = response.candidates?.[0]?.finishReason;
      
      if (!text && finishReason !== 'STOP') {
        console.warn(`[ShaderForge] Oracle stopped unexpectedly. Reason: ${finishReason}`);
        if (finishReason === 'MAX_TOKENS') {
          throw new Error("The Oracle's vision was too grand for this realm (Max Tokens). Try a more focused request.");
        } else if (finishReason === 'SAFETY') {
          throw new Error("The Oracle's vision was obscured by safety wards. Try a different vibe.");
        }
      }

      try {
        // Try to parse the whole text as JSON
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          // If direct parse fails, try to extract JSON block
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found");
          }
        }

        const assistantMessage = parsed.message || "";
        
        if (parsed.forge && parsed.forge.glsl) {
          const code = parsed.forge.glsl.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
          setGlsl(code);
          setHistory(h => [{ vibe: parsed.forge.vibe || 'custom', code, ts: Date.now() }, ...h].slice(0, 10));
          startRef.current = Date.now();
          setIsForging(true);
          setTimeout(() => {
            runShader(code);
            setIsForging(false);
          }, 50);
          speak("Shader forged.");
          
          const finalContent = assistantMessage ? `${assistantMessage}\n\n**Forged:** "${parsed.forge.vibe}"` : `Forged: "${parsed.forge.vibe}"`;
          setMessages(m => [...m, { role: 'assistant', content: finalContent }]);
        } else {
          if (assistantMessage) {
            setMessages(m => [...m, { role: 'assistant', content: assistantMessage }]);
            speak(assistantMessage.slice(0, 150));
          } else {
            setMessages(m => [...m, { role: 'assistant', content: "The Oracle is silent, but the energies are shifting..." }]);
          }
        }
      } catch (e) {
        console.error("Failed to parse shader JSON, attempting regex extraction", e);
        
        // Robust regex extraction for truncated or malformed JSON
        // 1. Try to find GLSL code blocks first (most reliable)
        const glslBlockMatch = text.match(/```(?:glsl|cpp|c|hlsl)?\s*([\s\S]*?)```/);
        const glslPropertyMatch = text.match(/"glsl"\s*:\s*"([\s\S]*?)"/);
        
        // 2. Try to find vibe and message
        const vibeMatch = text.match(/"vibe"\s*:\s*"([\s\S]*?)"/);
        const messageMatch = text.match(/"message"\s*:\s*"([\s\S]*?)"/);

        const extractedCode = glslBlockMatch ? glslBlockMatch[1] : (glslPropertyMatch ? glslPropertyMatch[1] : null);

        if (extractedCode) {
          // Unescape the GLSL code if it came from a JSON property
          let code = extractedCode;
          if (!glslBlockMatch && glslPropertyMatch) {
            code = code
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\'/g, "'")
              .replace(/\\\\/g, '\\');
          }
          
          code = code.trim();
          
          if (code.includes('gl_FragColor') || code.includes('void main')) {
            setGlsl(code);
            const vibe = vibeMatch ? vibeMatch[1] : 'Fragment of Chaos';
            setHistory(h => [{ vibe, code, ts: Date.now() }, ...h].slice(0, 10));
            startRef.current = Date.now();
            setIsForging(true);
            setTimeout(() => {
              runShader(code);
              setIsForging(false);
            }, 50);
            speak("Shader forged from fragments.");
            
            const assistantMessage = messageMatch ? messageMatch[1].replace(/\\n/g, '\n') : "The Oracle's message was truncated, but I have forged the code from the fragments.";
            const finalContent = `${assistantMessage}\n\n**Forged (Partial):** "${vibe}"`;
            setMessages(m => [...m, { role: 'assistant', content: finalContent }]);
            return; // Success!
          }
        }
        
        // If we reach here, we really couldn't find anything
        const cleanText = text.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
        if (cleanText) {
          setMessages(m => [...m, { role: 'assistant', content: cleanText }]);
        } else {
          throw new Error("The Oracle left no trace of its thoughts. Try rephrasing.");
        }
      }
    } catch (e: any) {
      if (e.message === "Operation cancelled by user") {
        setMessages(m => [...m, { role: 'assistant', content: "_The connection was severed._" }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }]);
      }
    } finally {
      setIsChatLoading(false);
      setIsAiThinking(false);
      abortControllerRef.current = null;
    }
  };

  const cancelThinking = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsChatLoading(false);
    setIsAiThinking(false);
    setThinkingStatus("Connection severed.");
  };


  // ── Wolfram Alpha ──────────────────────────────────────────────────────────
  const queryWolfram = async (overrideQuery?: string) => {
    const q = overrideQuery || wolframQuery;
    if (!q.trim() || isWolframLoading) return;
    setIsWolframLoading(true);
    setWolframResult('');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`/api/wolfram?input=${encodeURIComponent(q)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.text();
      setWolframResult(data);
      speak("Wolfram calculation complete.");
    } catch (e) {
      setWolframResult("The Oracle is taking too long to respond. Try a simpler question.");
    } finally {
      setIsWolframLoading(false);
    }
  };

  // ── GitHub Integration ─────────────────────────────────────────────────────
  const fetchGithubRepo = async () => {
    if (!githubRepo.trim()) return;
    const [owner, repo] = githubRepo.split('/');
    if (!owner || !repo) return;

    try {
      const res = await fetch(`/api/github/repo?owner=${owner}&repo=${repo}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setGithubFiles(data);
      } else {
        setGithubFiles([]);
      }
    } catch (e) {
      console.error("GitHub fetch failed", e);
    }
  };

  const exportChat = () => {
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shaderwitch-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="h-screen w-screen bg-[#040407] flex flex-col overflow-hidden text-[#d0d0ee] font-sans selection:bg-fuchsia-500/30">
      {/* Header / HUD */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center space-x-4 pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/40 border border-white/20">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-fuchsia-500 animate-shimmer">
              SHADER FORGE
            </h1>
            <p className="text-[10px] font-mono text-fuchsia-400/60 tracking-widest uppercase">Live Mathematical Art Studio</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 pointer-events-auto">
          {isRecording && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-mono shadow-lg shadow-red-500/20"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              REC {recSeconds}s
            </motion.div>
          )}
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-3 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 hover:bg-white/10 transition-all shadow-xl"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-zinc-500" /> : <Volume2 className="w-5 h-5 text-fuchsia-400" />}
          </button>
        </div>
      </header>

      {/* Main Canvas (Full Screen) */}
      <main className="flex-1 relative overflow-hidden bg-black">
        <div className="absolute inset-0 w-full h-full">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {isForging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-6 z-40"
            >
              <div className="relative">
                <div className="w-20 h-20 border-4 border-fuchsia-500/20 rounded-full" />
                <div className="absolute inset-0 w-20 h-20 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin" />
                <Zap className="absolute inset-0 m-auto w-8 h-8 text-fuchsia-500 animate-pulse" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-fuchsia-400 font-display tracking-[0.3em] text-lg font-bold animate-pulse">FORGING REALITY</span>
                <span className="text-cyan-400/60 font-mono text-[10px] uppercase tracking-widest">{isAiThinking ? thinkingStatus : "Consulting Wolfram Oracle..."}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {shaderError && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/50 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <Terminal className="w-4 h-4 text-red-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-red-400">Compilation Error</span>
              </div>
              <p className="text-red-200 text-[10px] font-mono break-words leading-relaxed">{shaderError}</p>
            </motion.div>
          </div>
        )}

        {/* Floating Panels - Centered and with dock clearance */}
        <AnimatePresence mode="wait">
          {activePanel === 'memory' && (
            <motion.div
              key="memory"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bottom-32 w-[90vw] max-w-2xl z-50 flex flex-col"
            >
              <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/30">
                      <Book className="w-4 h-4 text-fuchsia-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold tracking-widest text-white">MEMORY GRIMOIRE</h3>
                      <p className="text-[9px] font-mono text-fuchsia-400/60 uppercase">Stored Essences & Spells</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActivePanel(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4 text-white/40 rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-12">
                  {/* Preferences */}
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">User Preferences</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {memory.preferences.length === 0 ? (
                        <p className="text-[10px] text-white/30 font-mono italic">No preferences recorded yet...</p>
                      ) : (
                        memory.preferences.map((pref, i) => (
                          <div key={i} className="px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg text-[10px] font-mono text-fuchsia-200/80">
                            {pref}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* Inspirations */}
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">Inspirations</h3>
                    </div>
                    <div className="space-y-2">
                      {memory.inspirations.length === 0 ? (
                        <p className="text-[10px] text-white/30 font-mono italic">No inspirations saved yet...</p>
                      ) : (
                        memory.inspirations.map((insp, i) => (
                          <div key={i} className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl text-[10px] font-mono text-cyan-100/70 leading-relaxed">
                            {insp}
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  {/* The Grimoire */}
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-amber-400" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">The Sacred Grimoire</h3>
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-mono text-white/50 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto custom-scrollbar">
                      {memory.grimoire}
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bottom-32 w-[90vw] max-w-2xl z-50 flex flex-col"
            >
              <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 flex items-center justify-center border border-fuchsia-500/30">
                      <Sparkles className="w-4 h-4 text-fuchsia-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold tracking-widest text-white">SHADER WITCH</h3>
                      <p className="text-[9px] font-mono text-fuchsia-400/60 uppercase">High Priestess of Math</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={exportChat}
                      title="Export Chat"
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Square className="w-4 h-4 text-white/40 rotate-45" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-12">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className={`max-w-[90%] p-4 rounded-2xl text-sm leading-relaxed relative group ${
                        msg.role === 'user'
                          ? 'bg-fuchsia-600/20 border border-fuchsia-500/30 text-fuchsia-100 rounded-tr-none shadow-lg shadow-fuchsia-500/10'
                          : 'bg-white/5 border border-white/10 text-cyan-100/90 rounded-tl-none'
                      }`}>
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        
                        <button 
                          onClick={() => copyToClipboard(msg.content)}
                          className="absolute -right-10 top-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-fuchsia-400"
                          title="Copy message"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] px-2">
                        {msg.role === 'user' ? 'Adept' : 'Witch'}
                      </span>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-fuchsia-400/60 font-mono animate-pulse">
                          <Zap className="w-3 h-3" />
                          {thinkingStatus}
                        </div>
                        <button 
                          onClick={cancelThinking}
                          className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-[9px] font-mono text-red-400 uppercase tracking-widest transition-all rounded border border-red-500/20"
                        >
                          Sever Connection
                        </button>
                      </div>
                      {isAiThinking && (
                        <div className="flex items-center gap-2 text-[10px] text-amber-400/60 font-mono animate-pulse ml-4">
                          <Cpu className="w-3 h-3" />
                          {thinkingStatus || "Consulting Wolfram Oracle..."}
                        </div>
                      )}
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 bg-white/5 border-t border-white/5">
                  <div className="relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Describe a vibe... 'forge it'..."
                      className="w-full bg-black/40 rounded-2xl p-4 pr-14 text-xs text-white border border-white/10 focus:border-fuchsia-500/50 focus:ring-0 resize-none h-24 custom-scrollbar placeholder:text-white/20"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={isChatLoading || !input.trim()}
                      className="absolute bottom-4 right-4 p-3 bg-fuchsia-500 text-white rounded-xl hover:bg-fuchsia-400 disabled:opacity-50 disabled:hover:bg-fuchsia-500 transition-all shadow-lg shadow-fuchsia-500/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'tools' && (
            <motion.div
              key="tools"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bottom-32 w-[90vw] max-w-2xl z-50 flex flex-col"
            >
              <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                      <Zap className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold tracking-widest text-white">ORACLE TOOLS</h3>
                      <p className="text-[9px] font-mono text-amber-400/60 uppercase">Knowledge Integrations</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActivePanel(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4 text-white/40 rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar pb-12">
                  {/* Wolfram Alpha */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">Wolfram Oracle</h3>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 mb-4">
                      <p className="text-[10px] text-amber-200/60 font-mono leading-relaxed">
                        Ask for formulas, constants, or curves. The Witch uses this data to forge precise geometries.
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={wolframQuery}
                        onChange={(e) => setWolframQuery(e.target.value)}
                        placeholder="e.g. 'Julia set formula' or 'Golden ratio'..."
                        className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-xs border border-white/10 focus:border-amber-500/50 focus:ring-0 placeholder:text-white/20"
                        onKeyDown={(e) => e.key === 'Enter' && queryWolfram()}
                      />
                      <button
                        onClick={() => queryWolfram()}
                        disabled={isWolframLoading}
                        className="p-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl border border-amber-500/30 disabled:opacity-50 transition-all"
                      >
                        {isWolframLoading ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Quick Spells */}
                    <div className="flex flex-wrap gap-2">
                      {['Mandelbrot set', 'Fibonacci spiral', 'Voronoi diagram', 'Sine wave formula', 'Perlin noise'].map((spell) => (
                        <button
                          key={spell}
                          onClick={() => {
                            setWolframQuery(spell);
                            queryWolfram(spell);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-[9px] font-mono text-amber-400/60 hover:text-amber-400 transition-all"
                        >
                          {spell}
                        </button>
                      ))}
                    </div>

                    {wolframResult && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-black/40 rounded-2xl border border-amber-500/20 text-[11px] font-mono text-white/60 leading-relaxed relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-2 opacity-20">
                          <Zap className="w-8 h-8 text-amber-500" />
                        </div>
                        {wolframResult}
                      </motion.div>
                    )}
                  </section>

                  {/* GitHub */}
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Github className="w-4 h-4 text-white" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">GitHub Context</h3>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={githubRepo}
                        onChange={(e) => setGithubRepo(e.target.value)}
                        placeholder="owner/repo"
                        className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-xs border border-white/10 focus:border-white/20 focus:ring-0 placeholder:text-white/20"
                        onKeyDown={(e) => e.key === 'Enter' && fetchGithubRepo()}
                      />
                      <button
                        onClick={fetchGithubRepo}
                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    {githubFiles.length > 0 && (
                      <div className="grid grid-cols-1 gap-2">
                        {githubFiles.map((file, i) => (
                          <div key={i} className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl text-[10px] text-white/50 hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/10">
                            <Terminal className="w-4 h-4 text-zinc-500" />
                            <span className="truncate flex-1">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Google Notebook */}
                  <section className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <h3 className="text-xs font-mono uppercase tracking-widest text-white/70 font-bold">Notebook Context</h3>
                    </div>
                    <textarea
                      value={notebookContext}
                      onChange={(e) => setNotebookContext(e.target.value)}
                      placeholder="Paste context from Google Notebooks or Colab here..."
                      className="w-full bg-white/5 rounded-xl px-4 py-3 text-[11px] font-mono border border-white/10 focus:border-blue-500/50 focus:ring-0 h-32 resize-none custom-scrollbar placeholder:text-white/20"
                    />
                  </section>

                  <button
                    onClick={() => {
                      sendMessage("Analyze my GitHub context, Wolfram data, and Notebook notes to forge a shader that synthesizes all this knowledge.");
                      setActivePanel('chat');
                    }}
                    className="w-full py-4 bg-gradient-to-r from-fuchsia-600/20 to-cyan-600/20 hover:from-fuchsia-600/30 hover:to-cyan-600/30 text-white rounded-2xl border border-white/10 flex items-center justify-center gap-3 group transition-all shadow-xl shadow-fuchsia-500/5"
                  >
                    <Sparkles className="w-5 h-5 text-fuchsia-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-mono uppercase tracking-widest font-bold">Forge from Context</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'editor' && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bottom-32 w-[90vw] max-w-4xl z-50 flex flex-col"
            >
              <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                      <Code2 className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold tracking-widest text-white">GLSL SOURCE</h3>
                      <p className="text-[9px] font-mono text-cyan-400/60 uppercase">Direct Manipulation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(glsl);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                        speak("Code copied.");
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl border border-white/10 text-[10px] font-mono uppercase tracking-widest transition-all"
                    >
                      {isCopied ? 'COPIED!' : 'COPY'}
                    </button>
                    <button 
                      onClick={() => setActivePanel(null)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Square className="w-4 h-4 text-white/40 rotate-45" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 flex flex-col min-h-0">
                  <textarea
                    value={glsl}
                    onChange={(e) => {
                      setGlsl(e.target.value);
                      runShader(e.target.value);
                    }}
                    className="flex-1 w-full bg-black/40 rounded-2xl p-6 font-mono text-sm text-cyan-300 border border-white/5 focus:border-fuchsia-500/50 focus:ring-0 resize-none custom-scrollbar leading-relaxed"
                    spellCheck={false}
                  />
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-6 text-[9px] font-mono text-white/30 uppercase tracking-widest">
                      <button 
                        onClick={() => {
                          const precisions = ['lowp', 'mediump', 'highp'];
                          const currentMatch = glsl.match(/precision (\w+) float;/);
                          const current = currentMatch ? currentMatch[1] : 'mediump';
                          const next = precisions[(precisions.indexOf(current) + 1) % precisions.length];
                          const newGlsl = currentMatch 
                            ? glsl.replace(/precision \w+ float;/, `precision ${next} float;`)
                            : `precision ${next} float;\n${glsl}`;
                          setGlsl(newGlsl);
                          runShader(newGlsl);
                        }}
                        className="hover:text-cyan-400 transition-all flex items-center gap-2 group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/50 group-hover:bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                        Precision: <span className="text-white/60 group-hover:text-white">{glsl.match(/precision (\w+) float;/)?.[1] || 'MediumP'}</span>
                      </button>
                      <button 
                        onClick={() => {
                          setThinkingStatus("Uniforms: time (float), resolution (vec2) are injected by the Forge.");
                          setTimeout(() => setThinkingStatus(""), 3000);
                        }}
                        className="hover:text-fuchsia-400 transition-all flex items-center gap-2 group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500/50 group-hover:bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.5)]" />
                        Uniforms: <span className="text-white/60 group-hover:text-white">time, resolution</span>
                      </button>
                    </div>
                    <button
                      onClick={() => runShader(glsl)}
                      disabled={isRecompiling}
                      className={`px-6 py-3 rounded-xl border text-[10px] font-mono uppercase tracking-[0.2em] transition-all shadow-lg flex items-center gap-2 ${
                        isRecompiling 
                        ? 'bg-fuchsia-500/40 text-white border-fuchsia-400 shadow-fuchsia-500/30' 
                        : 'bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border-fuchsia-500/30 shadow-fuchsia-500/10'
                      }`}
                    >
                      {isRecompiling ? (
                        <>
                          <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Recompiling...
                        </>
                      ) : 'Recompile Shader'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activePanel === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="absolute top-24 left-1/2 -translate-x-1/2 bottom-32 w-[90vw] max-w-sm z-50 flex flex-col"
            >
              <div className="flex-1 bg-black/60 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                      <History className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-bold tracking-widest text-white">FORGE HISTORY</h3>
                      <p className="text-[9px] font-mono text-cyan-400/60 uppercase">Previous Realities</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActivePanel(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Square className="w-4 h-4 text-white/40 rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar pb-12">
                  {history.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                      <RotateCcw className="w-12 h-12" />
                      <p className="text-xs font-mono uppercase tracking-widest">No history yet</p>
                    </div>
                  ) : (
                    history.map((item, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => {
                          setGlsl(item.code);
                          runShader(item.code);
                          speak(`Restoring ${item.vibe}`);
                        }}
                        className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/0 to-cyan-500/0 group-hover:from-fuchsia-500/5 group-hover:to-cyan-500/5 transition-all" />
                        <div className="relative z-10">
                          <div className="text-xs font-display font-bold text-white/80 mb-1 group-hover:text-white transition-colors capitalize">{item.vibe}</div>
                          <div className="flex items-center justify-between">
                            <div className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">{new Date(item.ts).toLocaleTimeString()}</div>
                            <RotateCcw className="w-3 h-3 text-white/20 group-hover:text-fuchsia-400 transition-colors" />
                          </div>
                        </div>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Dock (Navigation) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60]">
          <nav className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex items-center gap-2 shadow-2xl">
            <NavButton 
              active={activePanel === 'memory'} 
              onClick={() => setActivePanel(activePanel === 'memory' ? null : 'memory')}
              icon={<Book className="w-5 h-5" />}
              label="Grimoire"
              color="fuchsia"
            />
            <NavButton 
              active={activePanel === 'chat'} 
              onClick={() => setActivePanel(activePanel === 'chat' ? null : 'chat')}
              icon={<MessageSquare className="w-5 h-5" />}
              label="Witch"
              color="fuchsia"
            />
            <NavButton 
              active={activePanel === 'tools'} 
              onClick={() => setActivePanel(activePanel === 'tools' ? null : 'tools')}
              icon={<Zap className="w-5 h-5" />}
              label="Oracle"
              color="amber"
            />
            <NavButton 
              active={activePanel === 'editor'} 
              onClick={() => setActivePanel(activePanel === 'editor' ? null : 'editor')}
              icon={<Code2 className="w-5 h-5" />}
              label="Source"
              color="cyan"
            />
            <NavButton 
              active={activePanel === 'history'} 
              onClick={() => setActivePanel(activePanel === 'history' ? null : 'history')}
              icon={<History className="w-5 h-5" />}
              label="History"
              color="indigo"
            />
            <NavButton 
              active={isListening} 
              onClick={startListening}
              icon={isListening ? <Mic className="w-5 h-5 animate-pulse text-fuchsia-400" /> : <MicOff className="w-5 h-5" />}
              label="Voice"
              color="fuchsia"
            />
            <div className="w-px h-8 bg-white/10 mx-1" />
            <button
              onClick={() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const link = document.createElement('a');
                link.download = `shader-${Date.now()}.png`;
                link.href = canvas.toDataURL();
                link.click();
                speak("Snapshot saved.");
              }}
              className="p-3 rounded-2xl hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Snapshot"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-3 rounded-2xl transition-all ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-white/10 text-white/60 hover:text-white'
              }`}
              title={isRecording ? "Stop Recording" : "Record"}
            >
              {isRecording ? <Square className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </nav>
        </div>
      </main>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.1),transparent_50%)]" />
      </div>
    </div>
  );
};

// ── Helper Components ────────────────────────────────────────────────────────
const NavButton = ({ active, onClick, icon, label, color }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, color: string }) => {
  const colors: Record<string, string> = {
    fuchsia: active ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40' : 'text-white/40 hover:text-white hover:bg-white/5',
    amber: active ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/40' : 'text-white/40 hover:text-white hover:bg-white/5',
    cyan: active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/40' : 'text-white/40 hover:text-white hover:bg-white/5',
    indigo: active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40' : 'text-white/40 hover:text-white hover:bg-white/5',
  };

  return (
    <button
      onClick={onClick}
      className={`relative group flex flex-col items-center p-3 rounded-2xl transition-all duration-300 ${colors[color]}`}
    >
      {icon}
      <span className={`absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-lg text-[10px] font-mono uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10`}>
        {label}
      </span>
      {active && (
        <motion.div 
          layoutId="active-nav"
          className="absolute inset-0 rounded-2xl border-2 border-white/20"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </button>
  );
};
