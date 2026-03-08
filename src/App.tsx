/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
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

// ── Constants ────────────────────────────────────────────────────────────────
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

const SYSTEM_INSTRUCTION = `You are the SHADER WITCH, an AI collaborator inside a live GLSL shader art studio. 
You are the High Priestess of Mathematics and Visuals. You have a direct psychic link to the WOLFRAM ORACLE, a cold, logical entity that handles complex calculations.

CORE PRINCIPLES:
1. SPEED IS SACRED: The user (Adept) hates waiting. Perform simple math yourself. ONLY use the Wolfram Oracle for complex symbolic math (integration, differentiation) or specific physical constants you don't know.
2. REASON with the user: Don't just act as a search tool. Discuss their ideas, explain the math in artistic or intuitive terms, and guide them.
3. SYNTHESIZE: Take the Oracle's cold data and turn it into beautiful GLSL code.
4. EXPLAIN: When the Oracle returns data, explain it to the user in terms they will understand, linking it back to the shader.

PERSONALITY:
- You are witty, chaotic, and artistic.
- You find the Wolfram Oracle "temperamental" and slow. Complain about his sluggishness if he takes too long.
- If the Oracle is slow or fails, DO NOT keep retrying. Use your own vast knowledge to provide a "Best Guess" or approximation.

RESPONSE FORMAT:
You MUST respond with a JSON object following this schema:
{
  "message": "Your spoken response to the user. Use markdown for formatting.",
  "forge": {
    "vibe": "A short poetic name for the shader vibe",
    "glsl": "The full GLSL fragment shader code"
  }
}
- The "forge" field is OPTIONAL. Only include it when you are generating or updating a shader.
- Always include the "message" field.
- DO NOT include any text outside of the JSON object.
- DO NOT wrap the JSON in markdown code blocks.

GLSL Rules:
- precision mediump float; at the top
- uniforms: float time; vec2 resolution;
- UVs via gl_FragCoord.xy / resolution.xy
- must set gl_FragColor
- animated, mathematical, psychedelic
- keep it under 100 lines

You have access to tools:
- query_wolfram: Use this to get precise mathematical constants, formulas, or scientific data from the Oracle. Format query for Wolfram Alpha directly.
- fetch_github_context: Use this to read files from the user's connected GitHub repository.
- read_notebook_context: Read the context from the user's connected Google Notebook or pasted notes.`;

// ── WebGL Helper ─────────────────────────────────────────────────────────────
function buildGL(canvas: HTMLCanvasElement, frag: string) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: true });
  if (!gl) return { error: 'WebGL not supported' };

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
  const [activePanel, setActivePanel] = useState<'chat' | 'tools' | 'editor' | 'history' | null>(null);
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
            }
          ]
        }
      ];

      // Prepare history for the chat (limit to last 20 messages for performance)
      const history = messages.slice(-20).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        history: history as any,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools as any,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING, description: "The Witch's spoken response to the user." },
              forge: {
                type: Type.OBJECT,
                properties: {
                  vibe: { type: Type.STRING, description: "A short poetic name for the shader vibe." },
                  glsl: { type: Type.STRING, description: "The full GLSL fragment shader code." }
                },
                description: "Optional shader code to forge and display."
              }
            },
            required: ["message"]
          }
        }
      });

      setThinkingStatus("Consulting the Oracle...");
      let response = await chat.sendMessage({ message: userMsg.content });
      
      // Loop to handle multiple rounds of function calls
      let rounds = 0;
      let wolframConsultations = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && rounds < 5) {
        if (chainController.signal.aborted) throw new Error("Operation cancelled by user");
        
        rounds++;
        setIsAiThinking(true);
        const functionResponses = [];
        
        for (const call of response.functionCalls) {
          if (chainController.signal.aborted) break;
          
          if (call.name === "query_wolfram") {
            wolframConsultations++;
            if (wolframConsultations > 2) {
              functionResponses.push({
                name: "query_wolfram",
                response: { error: "The Oracle is exhausted. Please try a different approach or simplify your request." },
                id: call.id
              });
              continue;
            }
            const rawQuery = (call.args as any).query;
            setThinkingStatus(`Translating math for the Oracle...`);
            
            try {
              // Intermediary AI Translation Step
              const translatorAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const translationResponse = await translatorAi.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Translate this shader math concept into Wolfram Alpha queries: ${rawQuery}`,
                config: {
                  systemInstruction: WOLFRAM_TRANSLATOR_PROMPT,
                  temperature: 0.1,
                }
              });

              const translationText = translationResponse.text || "";
              const lines = translationText.split('\n').map(l => l.trim()).filter(l => l !== "");
              
              let queries: string[] = [];
              let extraParams = "";

              for (const line of lines) {
                if (line.startsWith('&')) {
                  extraParams = line;
                } else if (line.startsWith('PRIMARY:')) {
                  queries.push(line.replace('PRIMARY:', '').trim());
                } else if (line.startsWith('FALLBACK1:')) {
                  queries.push(line.replace('FALLBACK1:', '').trim());
                } else if (line.length > 0 && queries.length < 2) { // Limit to 2 queries total
                  queries.push(line);
                }
              }

              if (queries.length === 0) queries = [rawQuery];

              let finalResult = null;
              let lastError = null;

              // Retry Handler
              for (let i = 0; i < Math.min(queries.length, 2); i++) { // Max 2 attempts
                if (chainController.signal.aborted) break;
                
                const q = queries[i];
                const attemptNum = i === 0 ? "Primary" : `Fallback`;
                setThinkingStatus(`Consulting Oracle (${attemptNum}): ${q}...`);
                
                try {
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s per attempt
                  const res = await fetch(`/api/wolfram?input=${encodeURIComponent(q)}${extraParams}`, { signal: controller.signal });
                  clearTimeout(timeoutId);
                  
                  if (res.ok) {
                    const data = await res.text();
                    if (data && data.trim().length > 0 && !data.includes("Wolfram|Alpha did not understand your input")) {
                      finalResult = data;
                      break; // Success!
                    } else {
                      lastError = "Oracle returned empty or misunderstood result.";
                    }
                  } else {
                    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
                    lastError = `Oracle failed: ${errorData.error || res.statusText}`;
                  }
                } catch (e) {
                  lastError = "Oracle timed out or connection failed.";
                }
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
                  response: { error: lastError || "The Oracle remained silent after multiple attempts. Try simplifying the math." },
                  id: call.id
                });
              }
            } catch (e) {
              functionResponses.push({
                name: "query_wolfram",
                response: { error: "Failed to translate query for the Oracle." },
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
                  functionResponses.push({
                    name: "fetch_github_context",
                    response: { result: data },
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
            functionResponses.push({
              name: "read_notebook_context",
              response: { result: notebookContext || "No notebook context provided yet." },
              id: call.id
            });
          }
        }

        if (chainController.signal.aborted) throw new Error("Operation cancelled by user");

        // Send function responses back to the model
        if (functionResponses.length > 0) {
          setThinkingStatus("Synthesizing Oracle data...");
          response = await chat.sendMessage({
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
      
      try {
        const parsed = JSON.parse(text);
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
        console.error("Failed to parse shader JSON", e);
        
        // Robust JSON extraction fallback
        let assistantMessage = "";
        let forgeData = null;
        
        try {
          // Try to find a JSON block in the text
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedJson = JSON.parse(jsonMatch[0]);
            assistantMessage = extractedJson.message || "";
            forgeData = extractedJson.forge;
          }
        } catch (innerE) {
          console.error("Inner extraction failed", innerE);
        }

        if (forgeData && forgeData.glsl) {
          const code = forgeData.glsl.replace(/```[\w]*/g, '').replace(/```/g, '').trim();
          setGlsl(code);
          setHistory(h => [{ vibe: forgeData.vibe || 'custom', code, ts: Date.now() }, ...h].slice(0, 10));
          startRef.current = Date.now();
          setIsForging(true);
          setTimeout(() => {
            runShader(code);
            setIsForging(false);
          }, 50);
          speak("Shader forged.");
          
          const finalContent = assistantMessage ? `${assistantMessage}\n\n**Forged:** "${forgeData.vibe}"` : `Forged: "${forgeData.vibe}"`;
          setMessages(m => [...m, { role: 'assistant', content: finalContent }]);
        } else {
          // Fallback to raw text if all extraction fails
          setMessages(m => [...m, { role: 'assistant', content: text }]);
          
          // Auto-extract GLSL from raw text as a last resort
          const glslRegex = /```(?:glsl|cpp|c|hlsl)?\s*([\s\S]*?)```/g;
          const matches = [...text.matchAll(glslRegex)];
          if (matches.length > 0) {
            const lastCode = matches[matches.length - 1][1].trim();
            if (lastCode.includes('gl_FragColor') || lastCode.includes('void main')) {
              setGlsl(lastCode);
              setHistory(h => [{ vibe: 'auto-update', code: lastCode, ts: Date.now() }, ...h].slice(0, 10));
              startRef.current = Date.now();
              setIsForging(true);
              setTimeout(() => {
                runShader(lastCode);
                setIsForging(false);
              }, 500);
            }
          }
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
                <span className="text-cyan-400/60 font-mono text-[10px] uppercase tracking-widest">Consulting Wolfram Oracle...</span>
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
                          Consulting Wolfram Oracle...
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
