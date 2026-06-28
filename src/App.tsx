import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import counselorAvatar from "./assets/images/counselor_avatar_1781520672657.jpg";
import { Message, ClearingPhase, ChatSessionState, JournalEntry } from "./types";
import { callChatAPI } from "./api/chat";
import {
  BookOpen,
  Sparkles,
  Smile,
  Send,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Brain,
  Lightbulb,
  Check,
  BookMarked,
  Info,
  HelpCircle,
  ThumbsUp,
  User,
  Coffee,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  X,
  Wind,
  RefreshCw,
  Download,
  Sliders,
  Smartphone,
  Music,
  Repeat
} from "lucide-react";
import ReframingCards, { getReframingCards, getCategoryVow } from "./components/ReframingCards";

function OfflineImage({ src, alt, className, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`overflow-hidden ${className ?? ""}`} role="img" aria-label={alt}>
        <div className="w-full h-full bg-slate-100 text-slate-400 flex items-center justify-center">
          <User className="w-5 h-5" />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}

export default function App() {
  const [isPlayingWelcome, setIsPlayingWelcome] = useState<boolean>(false);
  const [started, setStarted] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PWA installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== "undefined" ? !navigator.onLine : false);


  // Auto play speech toggle
  const [autoPlaySpeech, setAutoPlaySpeech] = useState<boolean>(true);

  // Toggle for collapsible passing standard checklist panel
  const [showCriteria, setShowCriteria] = useState<boolean>(false);

  // Suggestions toggle state
  const [isSuggestionsCollapsed, setIsSuggestionsCollapsed] = useState<boolean>(false);

  // Voice input states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [isAudioActive, setIsAudioActive] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const isRestartingVoiceRef = useRef<boolean>(false);

  // Playing message TTS speaking state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  // Deep breathing 4-7-8 states
  const [showBreathingModal, setShowBreathingModal] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale" | "ready">("ready");
  const [breathingTimer, setBreathingTimer] = useState<number>(0);
  const [breathingCycle, setBreathingCycle] = useState<number>(1);

  // 呼吸輔助引導聲音單選模式 state (ambient=自然環境音, voice=人聲語音, metronome=節拍提示音, none=關閉)
  const [breathingGuideType, setBreathingGuideType] = useState<"ambient" | "voice" | "metronome" | "none">(() => {
    const saved = localStorage.getItem("chatlight_breath_guide_type") as any;
    // 舊版 "vibrate" 值升級為 "none"
    return (saved === "vibrate" ? "none" : saved) || "ambient";
  });

  // 震動回饋開關 state (可與聲音引導同時使用)
  const [breathingVibrateEnabled, setBreathingVibrateEnabled] = useState<boolean>(() => {
    return localStorage.getItem("chatlight_breath_vibrate") === "true";
  });

  // 循環設定 state (minutes=n分鐘, cycles=n次, infinite=無限循環)
  const [breathingLoopType, setBreathingLoopType] = useState<"minutes" | "cycles" | "infinite">(() => {
    return (localStorage.getItem("chatlight_breath_loop_type") as any) || "cycles";
  });

  // 循環設定數值 state (對應分鐘數或次數)
  const [breathingLoopValue, setBreathingLoopValue] = useState<number>(() => {
    const val = localStorage.getItem("chatlight_breath_loop_value");
    return val ? parseInt(val, 10) : 4;
  });

  // 側邊設定面板顯示狀態
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem("chatlight_breath_guide_type", breathingGuideType);
  }, [breathingGuideType]);

  useEffect(() => {
    localStorage.setItem("chatlight_breath_loop_type", breathingLoopType);
  }, [breathingLoopType]);

  useEffect(() => {
    localStorage.setItem("chatlight_breath_loop_value", String(breathingLoopValue));
  }, [breathingLoopValue]);

  useEffect(() => {
    localStorage.setItem("chatlight_breath_vibrate", String(breathingVibrateEnabled));
  }, [breathingVibrateEnabled]);

  // Audio refs for ambient WAV playback and metronome tones
  // Place ambient.wav (19 seconds) in the /public/ folder
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const metronomeCtxRef = useRef<AudioContext | null>(null);

  // Pause & reset ambient audio (keep element preloaded for reuse)
  const stopAllAudio = () => {
    if (ambientAudioRef.current) {
      try {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.currentTime = 0;
      } catch (e) { }
    }
  };

  // Full teardown — only used on unmount
  const unloadAudio = () => {
    if (ambientAudioRef.current) {
      try {
        ambientAudioRef.current.pause();
        ambientAudioRef.current.src = '';
      } catch (e) { }
      ambientAudioRef.current = null;
    }
  };

  // Preload ambient WAV without playing (eliminates first-play latency)
  const preloadAmbientAudio = async () => {
    if (ambientAudioRef.current) return; // already preloaded
    const tried: string[] = [];
    try {
      // Build candidate URLs to try (respecting Vite base when present)
      try {
        tried.push(new URL('ambient.wav', import.meta.env.BASE_URL || window.location.origin).href);
      } catch {}
      const base = import.meta.env.BASE_URL || '/';
      try {
        const normalizedBase = base.startsWith('/') ? base : `/${base}`;
        tried.push(`${window.location.origin}${normalizedBase.replace(/\/+$/, '')}/ambient.wav`);
      } catch {}
      tried.push(`${window.location.origin}/ambient.wav`);
      tried.push('/ambient.wav');
      tried.push('ambient.wav');

      // De-dupe while preserving order
      const candidates = Array.from(new Set(tried.filter(Boolean)));

      for (const candidate of candidates) {
        try {
          const resp = await fetch(candidate, { method: 'HEAD' });
          if (resp && resp.ok) {
            const audio = new Audio(candidate);
            audio.loop = true;
            audio.volume = 0.75;
            audio.preload = 'auto';
            try { audio.crossOrigin = 'anonymous'; } catch (e) { }
            audio.addEventListener('error', (ev) => {
              console.warn('Ambient WAV failed to load', { src: candidate, ev });
            });
            audio.load();
            ambientAudioRef.current = audio;
            console.debug('Ambient WAV preloaded from', candidate);
            return;
          }
        } catch (e) {
          // continue to next candidate
        }
      }

      console.warn('Ambient WAV not found at any candidate URL', candidates);
    } catch (e) {
      console.warn('Ambient WAV preload failed', e);
    }
  };

  // Start ambient audio — reuses preloaded element if available
  const startAudioEngine = async () => {
    try {
      if (!ambientAudioRef.current) {
        await preloadAmbientAudio();
      }
      const audio = ambientAudioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn('Ambient WAV playback failed — user gesture or autoplay policy may block playback', { src: audio.src, e }));
      }
    } catch (e) {
      console.error('Failed to start ambient audio', e);
    }
  };

  // Preload ambient audio and warm up TTS whenever guide type changes
  useEffect(() => {
    if (breathingGuideType === 'ambient') {
      void preloadAmbientAudio();
    }
    if (breathingGuideType === 'voice' && 'speechSynthesis' in window) {
      // Preload voice list (async in some browsers)
      window.speechSynthesis.getVoices();
      // Warmup: speak a zero-volume utterance to initialise TTS engine
      try {
        window.speechSynthesis.cancel();
        const warmup = new SpeechSynthesisUtterance('\u200B');
        warmup.volume = 0;
        warmup.lang = 'zh-TW';
        warmup.rate = 1;
        window.speechSynthesis.speak(warmup);
      } catch (e) { }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breathingGuideType]);

  // Cleanup audio & speech on unmount
  useEffect(() => {
    // Preload voice list immediately so it is ready before first use
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      unloadAudio();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // Journal (Mind Note) states
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [showJournalsModal, setShowJournalsModal] = useState<boolean>(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalEntry | null>(null);

  // Sync state from server response schema
  const [session, setSession] = useState<ChatSessionState>({
    phase: "discovery",
    misunderstoodWord: "",
    definitions: [],
    sentenceCount: 0,
    suggestions: [
      "我讀到一些單字突然覺得好累昏睡 🥱",
      "這句話看反覆三遍大腦依然空白，有看沒有懂 😵‍💫",
      "生活焦慮卡關，我想排除完美主義 🗝️",
      "面臨他人期待時好窒息，想進行行動排除 😡"
    ]
  });
  const [pendingSessionQueue, setPendingSessionQueue] = useState<ChatSessionState[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load journals from localStorage on init
  useEffect(() => {
    try {
      const stored = localStorage.getItem("chatlight_journals");
      if (stored) {
        setJournals(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load journals", e);
    }

    // PWA beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen to appinstalled event to reset states
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
      console.log("ChatLight was installed successfully!");
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const updateNetworkState = () => {
      const offline = typeof navigator !== "undefined" ? !navigator.onLine : false;
      setIsOffline(offline);
      if (offline) {
        setErrorMsg("目前已離線，可使用 4-7-8 心靈呼吸器。");
      } else {
        setErrorMsg(null);
      }
    };

    window.addEventListener("online", updateNetworkState);
    window.addEventListener("offline", updateNetworkState);
    return () => {
      window.removeEventListener("online", updateNetworkState);
      window.removeEventListener("offline", updateNetworkState);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };


  // Helper: play a soft tone via Web Audio for metronome ticks and phase cues
  const playTone = (freq: number, duration: number, gain: number, type: OscillatorType = "sine") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = metronomeCtxRef.current || new AudioCtx();
      metronomeCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("playTone failed", e);
    }
  };

  // Deep breathing 4-7-8 pulse timer logic
  // Timer counts from 1 up to max seconds for each phase, then transitions
  useEffect(() => {
    if (!showBreathingModal || breathingPhase === "ready") {
      return;
    }

    const interval = setInterval(() => {
      const isMetronome = breathingGuideType === "metronome";

      if (breathingPhase === "inhale") {
        if (breathingTimer >= 4) {
          // Completed 4 seconds of inhale — transition to hold
          setBreathingPhase("hold");
          setBreathingTimer(1);
        } else {
          // Metronome tick during phase
          if (isMetronome) playTone(440, 0.12, 0.45);
          setBreathingTimer((t) => t + 1);
        }
      } else if (breathingPhase === "hold") {
        if (breathingTimer >= 7) {
          // Completed 7 seconds of hold — transition to exhale
          setBreathingPhase("exhale");
          setBreathingTimer(1);
        } else {
          if (isMetronome) playTone(330, 0.12, 0.35);
          setBreathingTimer((t) => t + 1);
        }
      } else if (breathingPhase === "exhale") {
        if (breathingTimer >= 8) {
          // Completed 8 seconds of exhale — check cycle completion (no rest phase)
          const targetCycles =
            breathingLoopType === "cycles"
              ? breathingLoopValue
              : breathingLoopType === "minutes"
                ? Math.ceil((breathingLoopValue * 60) / 19)
                : Infinity;

          if (breathingCycle >= targetCycles) {
            setBreathingPhase("ready");
            setBreathingCycle(1);
            setBreathingTimer(0);
            try {
              confetti({
                particleCount: 50,
                spread: 60,
                origin: { y: 0.7 }
              });
            } catch (e) { }
            if (breathingVibrateEnabled && navigator.vibrate) {
              try { navigator.vibrate([100, 80, 100, 80, 300]); } catch (e) { }
            }
            if (breathingGuideType === "voice" && window.speechSynthesis) {
              try {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance("引導結束，做得好！");
                utterance.lang = "zh-TW";
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
              } catch (e) { }
            }
          } else {
            setBreathingCycle((c) => c + 1);
            setBreathingPhase("inhale");
            setBreathingTimer(1);
          }
        } else {
          if (isMetronome) playTone(260, 0.12, 0.30);
          setBreathingTimer((t) => t + 1);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [showBreathingModal, breathingPhase, breathingTimer, breathingCycle, breathingGuideType, breathingLoopType, breathingLoopValue]);

  // Manage phase transitions: voice, vibration, phase-change cue tones
  useEffect(() => {
    if (!showBreathingModal) {
      stopAllAudio();
      window.speechSynthesis?.cancel();
      return;
    }

    if (breathingPhase === "ready") {
      stopAllAudio();
      return;
    }

    // 1. Vibration Feedback on phase change
    if (breathingVibrateEnabled && navigator.vibrate) {
      try {
        if (breathingPhase === "inhale") {
          navigator.vibrate(120);
        } else if (breathingPhase === "hold") {
          navigator.vibrate([60, 60, 60]);
        } else if (breathingPhase === "exhale") {
          navigator.vibrate(200);
        }
      } catch (e) {
        console.error("Vibration failed", e);
      }
    }

    // 2. Phase-change cue tone (played once per phase transition)
    if (breathingGuideType === "metronome") {
      if (breathingPhase === "inhale") {
        playTone(528, 0.5, 0.60);  // 528 Hz — warm, uplifting (inhale)
      } else if (breathingPhase === "hold") {
        playTone(396, 0.5, 0.50);  // 396 Hz — grounded, stable (hold)
      } else if (breathingPhase === "exhale") {
        playTone(285, 0.5, 0.45);  // 285 Hz — gentle release (exhale)
      }
    }

    // 3. Voice Guidance — simple, no counting
    if (breathingGuideType === "voice" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        let text = "";
        if (breathingPhase === "inhale") text = "吸氣";
        else if (breathingPhase === "hold") text = "閉氣";
        else if (breathingPhase === "exhale") text = "吐氣";

        if (text) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "zh-TW";
          utterance.rate = 0.85;
          utterance.pitch = 0.9;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {
        console.error("SpeechSynthesis failed", e);
      }
    }

  }, [breathingPhase, showBreathingModal, breathingCycle, breathingGuideType, breathingVibrateEnabled]);

  // Save journal entries helper mapping specific cards
  const saveJournal = (personalVow: string, confidenceVal: number, customVow?: string) => {
    const word = session.misunderstoodWord || "生活卡點";
    if (session.mode !== "life") return;

    // 心情轉折紀錄：篩選 user 所有輸入的心情訊息
    const userFeelings = messages
      .filter((m) => m.role === "user" && !m.content.includes("信心指數"))
      .map((m) => m.content)
      .join(" ➔ ");

    // 建立卡片內化信念資料 (透過 getReframingCards 集中式動態獲取，完美對齊大腦重塑限制性信念的三個卡片對照)
    const cardSet = getReframingCards(word).map(c => ({ front: c.front, back: c.back }));

    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}`,
      timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
      misunderstoodWord: word,
      userFeelings: userFeelings || "「我希望能克服生活中的阻礙，重獲新生。」",
      vow: customVow || getCategoryVow(word),
      signature: personalVow || "心靈旅人",
      confidence: confidenceVal,
      cardSet: cardSet
    };

    setJournals((prev) => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem("chatlight_journals", JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const deleteJournal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJournals((prev) => {
      const filtered = prev.filter((j) => j.id !== id);
      try {
        localStorage.setItem("chatlight_journals", JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
    if (selectedJournal?.id === id) {
      setSelectedJournal(null);
    }
  };

  // Level transition / celebration states & progress logic
  const [activeLevelUp, setActiveLevelUp] = useState<{ show: boolean; title: string; subtitle: string } | null>(null);
  const lastPhaseRef = useRef<ClearingPhase>("discovery");
  const lastSentenceCountRef = useRef<number>(0);

  const getProgressPercentage = () => {
    switch (session.phase) {
      case "discovery":
        return 15;
      case "definition":
        return 45;
      case "practice":
        return 70 + (session.sentenceCount / 3) * 20;
      case "resolved":
        return 100;
      default:
        return 15;
    }
  };

  const getPhaseIndex = (p: ClearingPhase): number => {
    switch (p) {
      case "discovery": return 0;
      case "definition": return 1;
      case "practice": return 2;
      case "resolved": return 3;
      default: return 0;
    }
  };

  const stepsList = session.mode === "life" ? [
    { phase: "discovery", label: "覺察", icon: "🌱" },
    { phase: "definition", label: "剖析", icon: "🧠" },
    { phase: "practice", label: "轉念", icon: "💪" },
    { phase: "resolved", label: "充能", icon: "🌟" }
  ] : [
    { phase: "discovery", label: "探索", icon: "🔍" },
    { phase: "definition", label: "釋義", icon: "📖" },
    { phase: "practice", label: "造句", icon: "✍️" },
    { phase: "resolved", label: "解鎖", icon: "🎉" }
  ];

  const triggerLevelUpEffect = (title: string, subtitle: string) => {
    setActiveLevelUp({ show: true, title, subtitle });
    setTimeout(() => {
      setActiveLevelUp(null);
    }, 2800);
  };

  useEffect(() => {
    if (!started) {
      lastPhaseRef.current = session.phase;
      lastSentenceCountRef.current = session.sentenceCount;
      return;
    }

    const prevPhase = lastPhaseRef.current;
    const currentPhase = session.phase;
    const prevCount = lastSentenceCountRef.current;
    const currentCount = session.sentenceCount;

    if (prevPhase !== currentPhase) {
      if (prevPhase === "discovery" && currentPhase === "definition") {
        if (session.mode === "life") {
          triggerLevelUpEffect("第一關過關！進入：剖析階段 🧠", `已鎖定心理窒礙：『 ${session.misunderstoodWord} 』`);
        } else {
          triggerLevelUpEffect("第一關過關！進入：釋義階段 📖", `已成功鎖定模糊字詞：『 ${session.misunderstoodWord} 』`);
        }
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0.1, y: 0.8 },
          colors: ["#6366f1", "#4f46e5", "#818cf8"]
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 0.9, y: 0.8 },
          colors: ["#6366f1", "#4f46e5", "#818cf8"]
        });
      } else if (prevPhase === "definition" && currentPhase === "practice") {
        if (session.mode === "life") {
          triggerLevelUpEffect("第二關過關！進入：轉念行動 🌱", "感受深度覺察完畢，建立 3 句轉念與承諾行動！");
        } else {
          triggerLevelUpEffect("第二關過關！進入：造句鍛鍊 💪", "觀念完全理解，準備連續造出 3 個句子來鞏固！");
        }
        const duration = 1200;
        const animationEnd = Date.now() + duration;
        const interval: any = setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          confetti({
            particleCount: 15,
            spread: 120,
            origin: { x: Math.random() * 0.4 + 0.3, y: Math.random() * 0.4 + 0.3 },
            colors: ["#f59e0b", "#fbbf24", "#34d399", "#10b981"]
          });
        }, 150);
      } else if (currentPhase === "resolved") {
        if (session.mode === "life") {
          triggerLevelUpEffect("排除成功！心靈敞亮點燃 🌟", "已完成三個全新的行動承諾，窒礙成功掃除！");
        } else {
          triggerLevelUpEffect("釐清成功！順利解鎖大腦！🎉", "模糊字詞理解障礙已完全排解！思緒清晰明澈！");
        }
        const duration = 2500;
        const animationEnd = Date.now() + duration;
        const interval: any = setInterval(() => {
          const timeLeft = animationEnd - Date.now();
          if (timeLeft <= 0) return clearInterval(interval);
          confetti({
            particleCount: 35,
            startVelocity: 30,
            spread: 360,
            origin: { x: Math.random() * 0.6 + 0.2, y: Math.random() * 0.4 + 0.2 },
            colors: ["#10b981", "#34d399", "#fbbf24", "#6366f1", "#ec4899"]
          });
        }, 180);
      } else if (currentPhase === "discovery" && prevPhase === "resolved") {
        if (session.mode === "life") {
          triggerLevelUpEffect("重新檢視生活卡頓 🧭", "準備好引導排除下一個限制你的感受");
        } else {
          triggerLevelUpEffect("重啟全新的字詞釐清 📚", "準備好搞懂下一個不理解的字詞");
        }
      }
    } else if (currentPhase === "practice" && currentCount > prevCount) {
      if (session.mode === "life") {
        triggerLevelUpEffect(`轉念承諾完成！進度 ${currentCount}/3 ✨`, `第 ${currentCount} 個行動承諾建立成功，超級棒！`);
      } else {
        triggerLevelUpEffect(`造句成功！進度 ${currentCount}/3 ✍️`, `第 ${currentCount} 個句子完全正確，真厲害！`);
      }
      confetti({
        particleCount: 30,
        spread: 45,
        origin: { x: 0.5, y: 0.75 },
        colors: ["#10b981", "#3aa8c1", "#fbbf24"]
      });
    }

    lastPhaseRef.current = currentPhase;
    lastSentenceCountRef.current = currentCount;
  }, [session.phase, session.sentenceCount, started]);

  useEffect(() => {
    if (session.phase === "resolved" && pendingSessionQueue.length > 0) {
      const [nextPending, ...rest] = pendingSessionQueue;
      setPendingSessionQueue(rest);
      setSession(nextPending);
      setErrorMsg(
        `已回到先前 ${nextPending.mode === "life" ? "心理卡點" : "模糊字詞"}流程，讓我們繼續完成。`
      );
    }
  }, [session.phase, pendingSessionQueue]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "zh-TW";

      rec.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        setIsAudioActive(true);
      };

      rec.onsoundstart = () => {
        setIsAudioActive(true);
      };

      rec.onspeechstart = () => {
        setIsAudioActive(true);
      };

      rec.onsoundend = () => {
        setIsAudioActive(false);
      };

      rec.onspeechend = () => {
        setIsAudioActive(false);
      };

      rec.onresult = (event: any) => {
        if (isRestartingVoiceRef.current) return;
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue((prev) => prev + transcript);
          // Briefly pulse/maintain audio active on successful result reception
          setIsAudioActive(true);
          setTimeout(() => setIsAudioActive(false), 800);
        }
      };

      rec.onerror = (event: any) => {
        const code: string = event.error || "";
        // no-speech / aborted are non-fatal — just stop quietly
        if (code === "no-speech" || code === "aborted") {
          setIsRecording(false);
          setIsAudioActive(false);
          return;
        }
        // Microphone permission denied
        if (code === "not-allowed" || code === "service-not-allowed") {
          alert("麥克風權限被封鎖，請在瀏覽器網址列允許麥克風存取後重試。");
        } else if (code === "network") {
          alert("語音辨識需要網路連線，請確認網路後重試。");
        } else {
          console.error("Speech recognition error:", code, event.message || "");
        }
        setIsRecording(false);
        setIsAudioActive(false);
      };

      rec.onend = () => {
        setIsAudioActive(false);
        if (isRestartingVoiceRef.current) {
          isRestartingVoiceRef.current = false;
          setRecordingSeconds(0);
          try {
            rec.start();
          } catch (err) {
            console.error("Restart error:", err);
            setIsRecording(false);
          }
        } else {
          setIsRecording(false);
        }
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Recording timer effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      setRecordingSeconds(0);
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("您的瀏覽器暫不支援 Web Speech API 語音輸入，建議使用 Chrome 瀏覽器。");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      isRestartingVoiceRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  const handleVoiceRestart = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      try {
        isRestartingVoiceRef.current = true;
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Failed to stop for restart:", e);
      }
    } else {
      isRestartingVoiceRef.current = false;
      setRecordingSeconds(0);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start for restart:", e);
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Monitor messages list to auto-play new assistant messages
  useEffect(() => {
    if (messages.length > 0 && autoPlaySpeech) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === "assistant") {
        speakText(lastMsg.content, lastMsg.id);
      }
    }
  }, [messages, autoPlaySpeech]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Handle TTS for reply
  const speakText = (text: string, messageId?: string) => {
    try {
      if (!("speechSynthesis" in window)) {
        console.warn("speechSynthesis not supported in this browser");
        return;
      }

      if (messageId && playingMessageId === messageId) {
        window.speechSynthesis.cancel();
        setPlayingMessageId(null);
        return;
      }

      window.speechSynthesis.cancel();
      if (messageId) {
        setPlayingMessageId(messageId);
      } else {
        setPlayingMessageId(null);
      }

      // Remove Markdown tags and emoji/pictograms before reading
      let plainText = text.replace(/[*#_`]/g, "");

      // Remove general unicode emojis and pictographs safely
      try {
        plainText = plainText.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "");
      } catch (e) {
        // Fallback for other regex environments
        plainText = plainText.replace(/[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/gu, "");
      }

      // Specifically strip any leftover common emojis or specific decorative symbols from the project
      plainText = plainText.replace(/[🧠✨📖😰🔄👏💪💖🎉✓🔒🌸🕯️🐾🌟🎨🎓⚡🗝️💡🔔💬🔥🎭]/g, "");

      const utterance = new SpeechSynthesisUtterance(plainText.trim());
      utterance.lang = "zh-TW";
      utterance.rate = 1.0;

      utterance.onend = () => {
        setPlayingMessageId(null);
      };

      utterance.onerror = () => {
        setPlayingMessageId(null);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Failed to execute speech synthesis speakText:", err);
      setPlayingMessageId(null);
    }
  };

  // Start counseling session with custom prompt message
  const triggerStart = (initialText?: string) => {
    if (isOffline) {
      setErrorMsg("目前已離線，4-7-8 心靈呼吸器可使用。");
      return;
    }

    setStarted(true);
    setMessages([
      {
        id: "welcome-msg",
        role: "assistant",
        content: `嗨！我是你的聊亮神隊友。🧭\n\n我們共同的第一關是【探索】。不論是讀書昏沈、排斥、大腦一片空白，還是生活感到焦慮、沉重、提不起勁，都是因為跳過了某個核心卡點：\n\n📖 若是學術名詞、學科不解字，我會引導你實施「懂字大作戰：字意疏通理解流程」；\n🌱 若是生活障礙、完美主義或關係卡點，我會溫和協助你完成「生活窒礙排除與轉念行動流程」！\n\n現在，請直接傳送你想要徹底排除的單字，或是簡短與我聊聊你面臨到的情況吧！`,
        timestamp: new Date()
      }
    ]);

    if (initialText) {
      // Fast start with active prompt
      setTimeout(() => {
        handleSendMessage(initialText);
      }, 500);
    }
  };

  // API Call to Express backend
  const handleSendMessage = async (textToSend?: string) => {
    if (isOffline) {
      setErrorMsg("目前已離線，無法發送訊息。");
      setIsLoading(false);
      return;
    }

    // Guard manual text submissions during reframing phase to avoid conversation loops
    if (!textToSend && session.phase === "practice" && session.mode === "life") {
      return;
    }

    const rawTxt = textToSend || inputValue;
    if (!rawTxt.trim()) return;

    // Reset input box
    if (!textToSend) {
      setInputValue("");
    }

    const newUserMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: rawTxt,
      timestamp: new Date()
    };

    // Update state synchronously
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await callChatAPI(
        updatedMessages.map((m) => ({ role: m.role, content: m.content }))
      );

      // Set conversation state in sync
      const newAssistantMsg: Message = {
        id: `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, newAssistantMsg]);

      const shouldQueuePreviousFlow =
        session.mode &&
        session.phase !== "resolved" &&
        session.phase !== "discovery" &&
        data.mode !== session.mode;

      if (shouldQueuePreviousFlow) {
        setPendingSessionQueue((prev) => [...prev, session]);
        setErrorMsg(
          `已暫存先前 ${session.mode === "life" ? "心理卡點" : "模糊字詞"}流程，完成目前流程後將自動回歸。`
        );
      }

      setSession({
        phase: (rawTxt.includes("轉念實踐契約") || rawTxt.includes("承諾誓言")) && data.mode === "life"
          ? "resolved"
          : (data.phase || "discovery"),
        mode: data.mode,
        misunderstoodWord: data.misunderstoodWord || "",
        definitions: data.definitions || [],
        sentenceCount: typeof data.sentenceCount === "number" ? data.sentenceCount : 0,
        suggestions: data.suggestions && data.suggestions.length > 0
          ? data.suggestions
          : ["我懂了！", "想再了解一下", "我們重新開始吧"],
        isFallback: !!data.isFallback
      });

    } catch (error: any) {
      console.error(error);
      const rawMsg: string = error?.message || "";
      let friendlyMsg = "連線異常，請稍後重試。";
      if (rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("429") || rawMsg.includes("quota")) {
        friendlyMsg = "😴 神隊友 今天有點累了，免費配額已用完。請稍後再試，或聯繫管理員升級方案。";
      } else if (rawMsg.includes("NOT_FOUND") || rawMsg.includes("404")) {
        friendlyMsg = "🔧 模型暫時無法使用，請稍後再試。";
      } else if (rawMsg.includes("UNAVAILABLE") || rawMsg.includes("503")) {
        friendlyMsg = "🌐 神隊友 服務暫時中斷，請稍候片刻再重試。";
      } else if (rawMsg.includes("API key") || rawMsg.includes("PERMISSION_DENIED")) {
        friendlyMsg = "🔑 API Key 設定有誤，請確認環境設定。";
      } else if (rawMsg) {
        friendlyMsg = "連線異常，請稍後重試。";
      }
      setErrorMsg(friendlyMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStarted(false);
    setMessages([]);
    setInputValue("");
    setErrorMsg(null);
    setSession({
      phase: "discovery",
      misunderstoodWord: "",
      definitions: [],
      sentenceCount: 0,
      suggestions: [
        "我讀到一些單字突然覺得好累昏睡 🥱",
        "這句話看反覆三遍大腦依然空白，有看沒有懂 😵‍💫",
        "生活焦慮卡關，我想排除完美主義 🗝️",
        "面臨他人期待時好窒息，想進行行動排除 😡"
      ]
    });
  };

  // Helper to parse double asterisks to bold text for simple markdown-like style
  const renderMarkdownText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return React.createElement(
          "strong",
          { key: index, className: "text-indigo-700 font-bold" },
          part.slice(2, -2)
        );
      }
      return part;
    });
  };

  const isReframingActive = session.phase === "practice" && session.mode === "life";

  return (
    <div className="h-[100dvh] w-full md:min-h-screen bg-slate-150 text-slate-800 font-sans flex items-center justify-center p-0 md:p-6 lg:p-8 relative overflow-hidden">

      {/* Unified Adaptive Application Shell */}
      <div
        id="app_shell"
        className="w-full max-w-5xl bg-white h-[100dvh] md:h-[85vh] lg:h-[88vh] md:min-h-[720px] md:rounded-3xl md:shadow-2xl md:border md:border-slate-205 overflow-hidden flex flex-col flex-1 relative shadow-indigo-100/30"
      >

        {/* Right Side / Mobile & tablet workspace (Takes full screen conditionally) */}
        <div
          id="workspace_container"
          className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden relative"
        >

          <AnimatePresence mode="wait">
            {!started ? (
              /* ================= WELCOME SCREEN ================= */
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col p-4 bg-gradient-to-b from-indigo-50/50 via-white to-white overflow-y-auto select-none"
              >
                {/* Header Visual */}
                <div className="flex flex-col items-center pt-6 text-center">
                  {isOffline && (
                    <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900 text-sm leading-relaxed shadow-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 text-amber-700" />
                        <div>
                          <p className="font-semibold">目前處於離線模式</p>
                          <p className="text-[12px] text-amber-800">4-7-8 心靈呼吸器功能可正常使用，其他對話功能已暫停。</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="relative mb-6">
                    {/* Outer floating decorations */}
                    <div className="absolute -top-3 -left-3 text-indigo-500 animate-bounce">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="absolute -bottom-3 -right-3 text-emerald-500 animate-float">
                      <Brain className="w-7 h-7" />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-24 h-24 rounded-3xl overflow-hidden shadow-xl shadow-indigo-200 animate-pulse-soft"
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <OfflineImage
                        src={counselorAvatar}
                        alt="Counselor"
                        className="w-full h-full object-cover select-none pointer-events-none"
                        fetchPriority="high"
                        draggable={false}
                      />
                    </motion.div>
                  </div>

                  <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight font-display">
                    聊亮 ChatLight
                  </h1>

                  <p className="text-slate-500 text-xs px-2 mt-4 leading-relaxed max-w-[280px]">
                    是不是生活總是卡卡的，明明睡飽了卻還是覺得累，大腦常常一片空白 ，或是很容易放棄呢。
                  </p>

                  {!isOffline && (
                    <button
                      onClick={() => setShowJournalsModal(true)}
                      className="mt-3 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[11px] font-extrabold transition-all flex items-center justify-center gap-1.5 border border-indigo-100/50 cursor-pointer shadow-indigo-100/30 shadow-sm"
                    >
                      {/*  <BookOpen className="w-3.5 h-3.5 text-indigo-500 animate-pulse-soft" /> */}
                      🌸 查閱過往轉念心情筆記 ({journals.length})
                    </button>
                  )}
                </div>

                  <>
                    {/* Lively Card Scenarios - Unified Grid without Category Headers */}
                <div className="my-5 space-y-3">
                  <p className="text-slate-800 font-bold text-xs text-center border-b border-dashed border-slate-200 pb-2.5">
                    🔔 請選擇你需要的引導方向或面臨的困境：
                  </p>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => triggerStart("我讀到一些單字突然覺得好累昏睡 🥱")}
                      className={`p-2.5 rounded-xl bg-white border border-slate-100 text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-[80px] ${isOffline ? 'opacity-40 cursor-not-allowed border-slate-200' : 'hover:border-emerald-400 hover:bg-emerald-50/10'} ${isOffline ? 'pointer-events-none' : 'cursor-pointer'} group`}
                      disabled={isOffline}
                    >
                      <span className="text-base group-hover:scale-105 transition-transform duration-200">🥱 讀書想睡覺</span>
                      <div>
                        <h4 className="font-bold text-[11px] text-slate-800 leading-tight">打瞌睡、沉重感</h4>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-none">剛讀某些章節突然眼皮沈重</p>
                      </div>
                    </button>

                    <button
                      onClick={() => triggerStart("這句話看反覆三遍大腦依然空白，有看沒有懂 😵‍💫")}
                      className={`p-2.5 rounded-xl bg-white border border-slate-100 text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-[80px] ${isOffline ? 'opacity-40 cursor-not-allowed border-slate-200' : 'hover:border-emerald-400 hover:bg-emerald-50/10'} ${isOffline ? 'pointer-events-none' : 'cursor-pointer'} group`}
                      disabled={isOffline}
                    >
                      <span className="text-base group-hover:scale-105 transition-transform duration-200">😵‍💫 學術名詞不解</span>
                      <div>
                        <h4 className="font-bold text-[11px] text-slate-800 leading-tight">定義模糊空白</h4>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-none">反覆看定義依舊記不得</p>
                      </div>
                    </button>

                    <button
                      onClick={() => triggerStart("生活焦慮卡關，我想排除『完美主義』關鍵卡點 🗝️")}
                      className={`p-2.5 rounded-xl bg-white border border-slate-100 text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-[80px] ${isOffline ? 'opacity-40 cursor-not-allowed border-slate-200' : 'hover:border-indigo-400 hover:bg-indigo-50/10'} ${isOffline ? 'pointer-events-none' : 'cursor-pointer'} group`}
                      disabled={isOffline}
                    >
                      <span className="text-base group-hover:scale-105 transition-transform duration-200">🗝️ 完美主義卡關</span>
                      <div>
                        <h4 className="font-bold text-[11px] text-slate-800 leading-tight">拖延焦慮、心累</h4>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-none">常常過度苛求導致空轉</p>
                      </div>
                    </button>

                    <button
                      onClick={() => triggerStart("我覺得面臨『他人期待』時好窒息，想進行行動排除 😡")}
                      className={`p-2.5 rounded-xl bg-white border border-slate-100 text-left transition-all duration-200 shadow-xs flex flex-col justify-between h-[80px] ${isOffline ? 'opacity-40 cursor-not-allowed border-slate-200' : 'hover:border-indigo-400 hover:bg-indigo-50/10'} ${isOffline ? 'pointer-events-none' : 'cursor-pointer'} group`}
                      disabled={isOffline}
                    >
                      <span className="text-base group-hover:scale-105 transition-transform duration-200">😡 他人期待重壓</span>
                      <div>
                        <h4 className="font-bold text-[11px] text-slate-800 leading-tight">過度迎合失控感</h4>
                        <p className="text-slate-400 text-[9px] mt-0.5 leading-none">想活出自我、拋開迎合</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Dialogue Mode Switcher */}
                <div id="dialogue_mode_selector" className="bg-slate-50/80 border border-slate-100/80 rounded-2xl p-3 mb-4 select-none">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">選擇對話模式</span>
                    <span className="text-[10px] text-indigo-500 font-semibold">{autoPlaySpeech ? "🟢 語音問答開啟" : "💬 僅限文字對話"}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100/60 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setAutoPlaySpeech(false);
                        if ("speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${!autoPlaySpeech
                        ? "bg-white text-indigo-700 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      純文字對話
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoPlaySpeech(true)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${autoPlaySpeech
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-slate-500 hover:text-indigo-600"
                        }`}
                    >
                      <Volume2 className="w-3.5 h-3.5 animate-pulse-soft" />
                      語音問答模式
                    </button>
                  </div>
                </div>

                {/* Start CTA Area */}
                <div className="shrink-0 space-y-2">
                  <motion.button
                    id="btn_start_counseling"
                    onClick={() => triggerStart()}
                    disabled={isOffline}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-4 px-6 rounded-2xl font-bold text-base tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-100 transition-all duration-200 ${isOffline ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                  >
                    <Sparkles className="w-5 h-5 text-indigo-200 animate-spin-slow" />
                    一鍵開始對話
                    <ArrowRight className="w-5 h-5 text-indigo-200 ml-1" />
                  </motion.button>

                  <motion.button
                    onClick={() => {
                      setShowBreathingModal(true);
                      setBreathingPhase("ready");
                      setBreathingCycle(1);
                      setBreathingTimer(0);
                      setShowSettingsPanel(false);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-6 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-200"
                  >
                    <Wind className="w-4 h-4 text-teal-100" />
                    4-7-8 MIND BREATHER
                  </motion.button>

                  {showInstallBtn && (
                    <motion.button
                      onClick={handleInstallPWA}
                      disabled={isOffline}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full py-3 px-6 rounded-2xl font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${isOffline ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600 text-white"}`}
                      title={isOffline ? "離線時無法安裝應用程式" : "安裝「聊亮」App 至桌面"}
                    >
                      <Download className="w-4 h-4 text-emerald-100" />
                      安裝「聊亮」App 至桌面
                    </motion.button>
                  )}
                </div>
                </>
              </motion.div>
            ) : (
              /* ================= COUNSELING SESSION SCREEN ================= */
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden"
              >
                {/* Header bar */}
                <div className="bg-white border-b border-slate-100 p-2 flex items-center justify-between shadow-xs shrink-0 relative select-none">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 overflow-hidden flex items-center justify-center shadow-md shadow-indigo-100 border border-slate-150">
                        <OfflineImage
                          src={counselorAvatar}
                          alt="聊亮神隊友"
                          className="w-full h-full object-cover select-none pointer-events-none"
                          fetchPriority="high"
                          draggable={false}
                        />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                        聊亮神隊友
                        <span className="text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-1 py-0.5 rounded-md font-bold uppercase tracking-wider">
                          ChatLight
                        </span>
                      </h2>
                      <p className={`text-[10px] font-semibold tracking-wider flex items-center gap-1 uppercase ${isOffline ? 'text-amber-700' : 'text-slate-400'}`}>
                        {isOffline ? '正在等待連線中' : '線上即時解卡中'}
                      </p>
                    </div>
                  </div>

                  {isOffline && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-900 text-[12px] leading-relaxed select-none">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-700" />
                        <p className="font-medium">目前已離線，4-7-8 心靈呼吸器可使用，其他功能為停用狀態。</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 relative">
                    {/* PWA Install Button in Header */}
                    {showInstallBtn && (
                      <button
                        onClick={handleInstallPWA}
                        disabled={isOffline}
                        className={`p-1.5 rounded-xl transition-all relative flex items-center justify-center border border-emerald-150 animate-pulse-soft ${isOffline
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700"
                          }`}
                        title={isOffline ? "離線時無法安裝應用程式" : "下載安裝此應用程式"}
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    {/* Journal History Button */}
                    <button
                      onClick={() => setShowJournalsModal(true)}
                      className="p-1.5 hover:bg-slate-100 text-indigo-650 hover:text-indigo-800 rounded-xl transition-all relative flex items-center justify-center cursor-pointer border border-transparent"
                      title="過往轉念認證紀錄心情筆記"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-500 animate-pulse-soft" />
                      {journals.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-sans text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center p-0.5 border border-white animate-pulse-soft">
                          {journals.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setShowCriteria(!showCriteria)}
                      className={`p-1.5 rounded-xl transition-all relative ${showCriteria
                        ? "text-indigo-600 bg-indigo-50 border border-indigo-100/50"
                        : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-transparent"
                        }`}
                      title="檢驗過關任務與即時狀態"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {session.misunderstoodWord && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      )}
                    </button>

                    <button
                      onClick={() => {
                        const nextVal = !autoPlaySpeech;
                        setAutoPlaySpeech(nextVal);
                        if (!nextVal && "speechSynthesis" in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      className={`p-1.5 rounded-xl transition-all ${autoPlaySpeech
                        ? "text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50 animate-pulse-soft"
                        : "text-slate-400 hover:bg-slate-100"
                        }`}
                      title={autoPlaySpeech ? "關閉自動語音播放 (馬上有感靜音)" : "開啟自動語音播放"}
                    >
                      {autoPlaySpeech ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={handleReset}
                      className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                      title="重置對話"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Dropdown overlay panel */}
                    <AnimatePresence>
                    {showCriteria && (
                      <div className="fixed inset-0 z-40" onClick={() => setShowCriteria(false)} />
                    )}
                    {showCriteria && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-12 w-80 sm:w-[420px] max-h-[80vh] overflow-y-auto bg-white rounded-2xl border border-slate-200/80 shadow-2xl z-50 p-4 text-[11px] select-none text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-150">
                            <span className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                              關卡介紹
                            </span>
                            <button
                              onClick={(e: any) => {
                                e.stopPropagation();
                                setShowCriteria(false);
                              }}
                              className="text-slate-450 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all font-bold text-xs"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            {/* 1. Discovery Checklist */}
                            <div className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-bold mt-0.5 shrink-0 ${session.phase !== 'discovery' || session.misunderstoodWord
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : "bg-indigo-50 border-indigo-200 text-indigo-600 animate-pulse"
                                  }`}>
                                  {session.phase !== 'discovery' || session.misunderstoodWord ? "✓" : "1"}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    {session.mode === "life"
                                      ? "【第一關：覺察】鎖定生活不佳狀態的「心理障礙詞」"
                                      : "【第一關：探索】鎖定課本中模糊的學術名詞"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                    {session.misunderstoodWord
                                      ? `已鎖定釐清目標：『 ${session.misunderstoodWord} 』`
                                      : session.mode === "life"
                                        ? "自我查核：找出最近哪些字詞、身心卡點最讓你感到發慌或挫折？"
                                        : "學理探索：找出最近看不太懂、大腦有點空白昏沉的名詞字彙？"}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${session.phase !== 'discovery' || session.misunderstoodWord
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700 animate-pulse"
                                }`}>
                                {session.phase !== 'discovery' || session.misunderstoodWord ? "已過關" : "檢定中"}
                              </span>
                            </div>

                            {/* 2. Definition Checklist */}
                            <div className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-bold mt-0.5 shrink-0 ${getPhaseIndex(session.phase) > 1
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : session.phase === 'definition'
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 animate-pulse"
                                    : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}>
                                  {getPhaseIndex(session.phase) > 1 ? "✓" : "2"}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    {session.mode === "life"
                                      ? "【第二關：剖析】進行自省、生活與感受的描述覺察"
                                      : "【第二關：釋義】理解定義、用自己的大白話重新描述"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                    {getPhaseIndex(session.phase) > 1
                                      ? session.mode === "life"
                                        ? "自省描述認證通過！已深刻覺察限制性想法的影響"
                                        : "理解與釋義認證通過！已流暢用自己的話解釋並分享"
                                      : session.phase === 'definition'
                                        ? session.mode === "life"
                                          ? "自我查核：請結合生活感受與具體經驗，聊聊它是如何悄悄限制影響你的"
                                          : "自我查核：請用自己的白話與生活經驗表達其定義、拒絕直接照抄"
                                        : session.mode === "life"
                                          ? "等待完成第一關覺察"
                                          : "等待完成第一關解鎖"}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${getPhaseIndex(session.phase) > 1
                                ? "bg-emerald-50 text-emerald-700"
                                : session.phase === 'definition'
                                  ? "bg-amber-50 text-amber-700 animate-pulse"
                                  : "bg-slate-50 text-slate-400"
                                }`}>
                                {getPhaseIndex(session.phase) > 1 ? "已過關" : session.phase === 'definition' ? "檢定中" : "未解鎖"}
                              </span>
                            </div>

                            {/* 3. Practice Checklist */}
                            <div className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-bold mt-0.5 shrink-0 ${session.phase === 'resolved'
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                                  : session.phase === 'practice'
                                    ? "bg-indigo-50 border-indigo-200 text-indigo-600 animate-pulse"
                                    : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}>
                                  {session.phase === 'resolved' ? "✓" : "3"}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    {session.mode === "life"
                                      ? "【第三關：轉念】認領承諾、翻閱轉念卡並建立 3 次積極誓言"
                                      : "【第三關：造句】使用該主題學術詞，完成至少 3 次完整造句"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                    {session.phase === 'practice'
                                      ? `自我查核：誓言/造句必須包含釐清字彙。目前進度 (${session.sentenceCount} / 3)`
                                      : session.phase === 'resolved'
                                        ? session.mode === "life"
                                          ? "完全解脫！成功建立 3 個極具能動性的積極轉念行動與誓言"
                                          : "完全通過！成功建立 3 個符合認證標竿的句子鍛鍊"
                                        : session.mode === "life"
                                          ? "等待深度剖析感受後解鎖轉念練習"
                                          : "等待理解定義後解鎖造句練習"}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${session.phase === 'resolved'
                                ? "bg-emerald-50 text-emerald-700"
                                : session.phase === 'practice'
                                  ? "bg-amber-50 text-amber-700 font-mono animate-pulse"
                                  : "bg-slate-50 text-slate-400"
                                }`}>
                                {session.phase === 'resolved' ? "已過關" : session.phase === 'practice' ? `檢定中 (${session.sentenceCount}/3)` : "未解鎖"}
                              </span>
                            </div>

                            {/* 4. Resolved Checklist */}
                            <div className="flex items-start justify-between gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex items-start gap-2">
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[9px] font-bold mt-0.5 shrink-0 ${session.phase === 'resolved'
                                  ? "bg-emerald-100 border-emerald-300 text-emerald-700 animate-bounce"
                                  : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}>
                                  {session.phase === 'resolved' ? "✓" : "4"}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-700">
                                    {session.mode === "life"
                                      ? "【第四關：充能】心靈窒礙徹底排除，掌控力回滿、滿血重啟！"
                                      : "【第四關：解鎖】讀書字意完全通透，神清氣爽順暢讀下去！"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                                    {session.phase === 'resolved'
                                      ? session.mode === "life"
                                        ? "重啟心靈能動性！思緒全然輕鬆敞亮！🚀"
                                        : "重獲優質精神狀態！思緒全然明澈！🚀"
                                      : session.mode === "life"
                                        ? "待完成 3 句轉念與承諾行動、排除窒礙後完全充能"
                                        : "待完成 3 句造句、掃除阻礙後完全充能"}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${session.phase === 'resolved'
                                ? "bg-emerald-50 text-emerald-700 animate-pulse"
                                : "bg-slate-50 text-slate-400"
                                }`}>
                                {session.phase === 'resolved' ? "已恢復" : "未啟用"}
                              </span>
                            </div>
                          </div>                          
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Offline Fallback Warning Banner */}
                {session.isFallback && (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-[11px] leading-relaxed select-none">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="font-extrabold">已導向至本地智能對答服務：</span>
                        <span>
                          預設免費伺服器 API 呼叫次數已滿，已自動啟動內置的本地規則引導。
                          <strong>如果你希望恢復強大的一對一 AI 深度輔導，可在右上角「Settings ➔ Secrets」中新增你的 <code>GEMINI_API_KEY</code> 金鑰。</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Stepper Tracker */}
                <div className="bg-white border-b border-slate-100 p-2.5 py-3 px-4 flex items-center justify-between select-none shrink-0 shadow-xs relative overflow-hidden">
                  <div className="flex items-center w-full justify-between font-semibold relative">
                    {stepsList.map((step, idx) => {
                      const isActive = getPhaseIndex(session.phase) === idx;
                      const isCompleted = getPhaseIndex(session.phase) > idx;

                      return (
                        <React.Fragment key={step.phase}>
                          {/* Connector line between steps */}
                          {idx > 0 && (
                            <div className="flex-1 h-[2px] bg-slate-100 relative mx-1.5 self-center min-w-[12px] max-w-[28px] overflow-hidden rounded-full">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: getPhaseIndex(session.phase) >= idx ? "100%" : "0%" }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                              />
                            </div>
                          )}

                          {/* Step Node */}
                          <div className="flex items-center gap-1.5 relative shrink-0">
                            {/* Active Aura circle effect that moves across with layoutId */}
                            {isActive && (
                              <motion.div
                                layoutId="glowingActiveRing"
                                className="absolute -inset-1 rounded-xl bg-indigo-500/10 border border-indigo-400/40 pointer-events-none z-0"
                                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                              />
                            )}

                            <motion.span
                              animate={isActive ? {
                                scale: [1, 1.25, 1.15, 1.2, 1],
                                y: [0, -4, 2, -1, 0],
                                rotate: [0, -5, 5, -2, 0]
                              } : { scale: 1, y: 0, rotate: 0 }}
                              transition={{
                                duration: 0.8,
                                ease: "easeOut"
                              }}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-sans z-10 transition-all duration-300 relative ${isActive
                                ? "bg-indigo-600 text-white font-extrabold shadow-md shadow-indigo-100 border border-indigo-400"
                                : isCompleted
                                  ? "bg-emerald-500 text-white font-bold shadow-xs border border-emerald-400"
                                  : "bg-slate-50 text-slate-400 border border-slate-200"
                                }`}
                            >
                              {isCompleted ? (
                                <Check className="w-3.5 h-3.5 stroke-[3.5] animate-pulse" />
                              ) : (
                                <span className="text-[12px]">{step.icon}</span>
                              )}

                              {/* Active tiny pulsing indicator dot */}
                              {isActive && (
                                <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                </span>
                              )}
                            </motion.span>

                            <span className={`text-[10px] tracking-tight transition-all duration-300 ${isActive
                              ? "text-indigo-600 font-extrabold scale-105"
                              : isCompleted
                                ? "text-emerald-600 font-semibold"
                                : "text-slate-400"
                              }`}>
                              {step.label}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* MISUNDERSTOOD WORD FLOATING CARD STICKER */}
                <AnimatePresence mode="wait">
                  {session.phase !== "discovery" && session.misunderstoodWord && !(session.mode === "life" && (session.phase === "practice" || session.phase === "resolved")) && (
                    <motion.div
                      key={session.phase + "-" + session.misunderstoodWord}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="bg-indigo-50 border-b border-indigo-100/50 p-2.5 px-4 flex items-start gap-2.5 shadow-sm shrink-0 select-none"
                    >
                      <BookMarked className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            {session.mode === "life"
                              ? session.phase === "resolved"
                                ? "🌱 已成功排除的心理卡點"
                                : "🌱 當前正在面對的心理卡點"
                              : "🔍 當前正在釐清的模糊字詞"}
                          </span>
                          {session.phase === "practice" && (
                            <span className="text-[10px] text-indigo-800 font-bold bg-indigo-100 p-0.5 px-1.5 rounded-md">
                              {session.mode === "life" ? `轉念承諾：${session.sentenceCount} / 3 句` : `造句成功：${session.sentenceCount} / 3 句`}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-indigo-900 flex items-center gap-1.5 mt-0.5">
                          『 {session.misunderstoodWord} 』
                        </h3>

                        {/* Definitions */}
                        {session.definitions && session.definitions.length > 0 && (
                          <div className="mt-1 bg-white border border-indigo-100/50 p-1.5 rounded-xl text-[11px] text-slate-600 leading-relaxed font-mono shadow-xs">
                            {session.definitions.map((def: any, idx: any) => (
                              <div key={idx} className="flex gap-1.5">
                                <span className="text-indigo-500 font-bold">•</span>
                                <span>{def}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Sentence builder meter */}
                        {session.phase === "practice" && (
                          <div className="mt-2 flex gap-2 items-center">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((session.sentenceCount / 3) * 100, 100)}%` }}
                              />
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map((num) => (
                                <span
                                  key={num}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold border ${session.sentenceCount >= num
                                    ? "bg-emerald-500 border-emerald-600 text-white"
                                    : "bg-white border-slate-300 text-slate-400"
                                    }`}
                                >
                                  {num}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Re-sentence / backtrack option for verifying clarity in resolved phase */}
                        {session.phase === "resolved" && (
                          <div className="mt-2.5 p-2 bg-emerald-50/80 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">✨</span>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-800 font-extrabold leading-tight">
                                  {session.mode === "life" ? "轉念成功！心靈敞亮嗎？" : "釐清成功！神清氣爽嗎？"}
                                </span>
                                <span className="text-[8.5px] text-slate-500 leading-tight">
                                  {session.mode === "life" ? "若欲重新開展自我覺察與轉念實踐：" : "若欲再次造句以確認精神與專注力："}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendMessage(
                                session.mode === "life"
                                  ? "我想退回轉念關卡重新簽署承諾，確認自己的心靈狀態"
                                  : "我想退回造句關卡重新造句，確認自己的狀態"
                              )}
                              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-[9.5px] px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              {session.mode === "life" ? "退回重新轉念簽署" : "退回重新造句"}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat view area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                  {messages.map((m: any) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}
                    >

                      {/* Profile Icon */}
                      {m.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-indigo-400 p-[1.5px] shadow-sm shrink-0 select-none overflow-hidden flex items-center justify-center">
                          <OfflineImage
                            src={counselorAvatar}
                            alt="聊亮神隊友"
                            className="w-full h-full rounded-full object-cover bg-white select-none pointer-events-none"
                            loading="lazy"
                            draggable={false}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold font-mono text-xs shrink-0 select-none">
                          <User className="w-4 h-4" />
                        </div>
                      )}

                      {/* Speech bubble */}
                      <div className="flex flex-col max-w-[80%]">
                        <div
                          className={`p-3 px-4 rounded-2xl text-[13px] leading-relaxed relative ${m.role === "assistant"
                            ? "bg-white shadow-xs text-slate-700 border border-slate-100 rounded-tl-none font-sans"
                            : "bg-indigo-600 text-white shadow-sm rounded-tr-none font-medium"
                            }`}
                        >
                          {m.role === "assistant" ? (
                            <div className="whitespace-pre-line text-slate-700">
                              {renderMarkdownText(m.content)}
                            </div>
                          ) : (
                            <div className="whitespace-pre-line">{m.content}</div>
                          )}

                          {/* Speech read capability button */}
                          {m.role === "assistant" && (
                            <button
                              onClick={() => speakText(m.content, m.id)}
                              className={`absolute -bottom-2.5 -right-2 w-6 h-6 rounded-full shadow-sm flex items-center justify-center transition border ${playingMessageId === m.id
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-500 animate-pulse-soft cursor-pointer"
                                : "bg-slate-100 active:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                                }`}
                              title={playingMessageId === m.id ? "停止播放語音 (已在播放中)" : "播放語音 (目前靜音)"}
                            >
                              {playingMessageId === m.id ? (
                                <Volume2 className="w-3 h-3" />
                              ) : (
                                <VolumeX className="w-3 h-3 text-slate-400/80" />
                              )}
                            </button>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-400 mt-1 px-1 self-start select-none">
                          {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                    </div>
                  ))}

                  {/* Gemini Thinking / Loading State */}
                  {isLoading && (
                    <div className="flex items-start gap-2.5 select-none">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 via-rose-300 to-indigo-400 p-[1.5px] shadow-sm shrink-0 select-none overflow-hidden flex items-center justify-center animate-pulse">
                        <OfflineImage
                          src={counselorAvatar}
                          alt="神隊友思考中"
                          className="w-full h-full rounded-full object-cover bg-white select-none pointer-events-none"
                          loading="lazy"
                          draggable={false}
                        />
                      </div>
                      <div className="bg-white border border-slate-100 text-slate-500 shadow-xs p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 max-w-[80%] text-[12px] font-medium leading-normal animate-pulse">
                        <Brain className="w-4 h-4 text-indigo-500 animate-spin-slow animate-bounce" />
                        <span>神隊友正在深入引導中...</span>
                      </div>
                    </div>
                  )}

                  {/* Error Box */}
                  {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-750 text-xs shadow-xs select-none">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold">對話傳送異常</p>
                        <p className="text-[11px] opacity-80">{errorMsg}</p>
                        <button
                          onClick={() => handleSendMessage()}
                          className="mt-1.5 underline font-black text-red-900 cursor-pointer"
                        >
                          重試傳送
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Cognitive Reframing & Commitment Cards Interactive Deck */}
                  {session.phase === "practice" && session.mode === "life" && session.misunderstoodWord && (
                    <div className="mt-2.5 mb-1 w-full" id="counselor_interactive_cards_passport">
                      <ReframingCards
                        misunderstoodWord={session.misunderstoodWord}
                        onComplete={(vow, confidence, signature) => {
                          setSession((prev) => ({ ...prev, phase: "resolved" }));
                          handleSendMessage(`信心指數高達 ${confidence}%！承諾誓言是：『${vow}』`);
                          saveJournal(signature, confidence, getCategoryVow(session.misunderstoodWord));
                        }}
                      />
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Suggestions Quick Chips section */}
                {session.suggestions && session.suggestions.length > 0 && !isLoading && !(session.phase === "practice" && session.mode === "life") && (
                  <div className="bg-slate-50 border-t border-slate-100 flex flex-col shrink-0">
                    <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-medium select-none">引導小卡</span>
                      <button
                        onClick={() => setIsSuggestionsCollapsed(!isSuggestionsCollapsed)}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer group rounded-md hover:bg-slate-200/50 flex items-center justify-center"
                        title={isSuggestionsCollapsed ? "展開小卡" : "收合小卡"}
                      >
                        {isSuggestionsCollapsed ? <ChevronUp className="w-3.5 h-3.5 group-hover:text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 group-hover:text-slate-600" />}
                      </button>
                    </div>
                    <AnimatePresence>
                      {!isSuggestionsCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 py-2.5 flex flex-wrap gap-1.5 overflow-x-auto max-h-[110px] items-start select-none"
                        >
                          {session.suggestions.map((suggestion: any, idx: any) => (
                            <motion.button
                              key={idx}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => !isOffline && handleSendMessage(suggestion)}
                              disabled={isOffline}
                              className={`text-[11px] p-2 px-3 rounded-full bg-white border border-slate-200 text-slate-700 transition-all font-medium text-left truncate max-w-full flex items-center gap-1 shrink-0 shadow-xs ${isOffline ? "cursor-not-allowed opacity-60" : "hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer"}`}
                            >
                              <span className="text-indigo-500 text-[10px]">✦</span>
                              {suggestion}
                            </motion.button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Sticky bottom send bar */}
                <div className="pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] px-4 bg-white border-t border-slate-100 flex items-center min-h-[64px] shrink-0 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    {isRecording ? (
                      /* ---------------- VOICE RECORDING MODE ---------------- */
                      <motion.div
                        key="recording-bar"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className="w-full flex items-center justify-between gap-3 bg-emerald-50/60 border border-emerald-100/80 rounded-2xl p-1.5 px-3 min-h-[48px]"
                      >
                        {/* 1. 重新開始鍵 - 簡化為乾淨圖示鍵 */}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleVoiceRestart}
                          type="button"
                          className="w-10 h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer"
                          title="清空並重新讀取語音"
                        >
                          <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin-slow" />
                        </motion.button>

                        {/* 2. 音軌 Waveform + 錄音成功接收狀態 */}
                        <div className="flex-1 flex items-center justify-center min-w-0 py-0.5">
                          {/* 音軌 Waveform (根據 isAudioActive 調整高度與跳動振幅) */}
                          <div className="flex items-end gap-1 h-7 overflow-hidden px-1 select-none">
                            {[
                              14, 22, 18, 10, 30, 16, 26, 12, 20, 28, 10, 18
                            ].map((baseHeight, i) => {
                              const animatedHeight = isAudioActive ? baseHeight : Math.max(4, baseHeight * 0.3);
                              return (
                                <motion.div
                                  key={i}
                                  className={`w-1 rounded-full transition-colors duration-300 ${isAudioActive
                                    ? (i % 2 === 0 ? "bg-emerald-500" : "bg-indigo-500")
                                    : "bg-emerald-200"
                                    }`}
                                  animate={{
                                    height: [4, animatedHeight, 4]
                                  }}
                                  transition={{
                                    duration: isAudioActive
                                      ? [0.6, 0.8, 0.5, 0.7, 1.0, 0.4, 0.9, 0.6, 0.8, 0.5, 0.7, 1.0][i]
                                      : [1.6, 1.9, 1.5, 1.8, 2.0, 1.4, 1.9, 1.7, 1.8, 1.5, 1.8, 2.0][i],
                                    repeat: Infinity,
                                    ease: "easeInOut",
                                    delay: i * 0.03,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {/* 3. 錄音時長 + 結束錄音鍵 */}
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-xs font-black text-emerald-600 tracking-wider">
                            {formatRecordingTime(recordingSeconds)}
                          </span>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={toggleRecording}
                            type="button"
                            className="w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all shadow-md shrink-0 cursor-pointer"
                            title="結束錄音，將語音轉換為文字"
                          >
                            <MicOff className="w-4 h-4 text-white animate-pulse" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ) : (
                      /* ---------------- STANDARDIZED TEXT INPUT BAR ---------------- */
                      <motion.div
                        key="text-input-bar"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="w-full flex items-center gap-2 relative"
                      >
                        {/* Input container with flex-1 to auto-expand to fill available width */}
                        <div className="flex-1 relative flex items-center min-w-0">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && !isReframingActive && !isOffline && handleSendMessage()}
                            disabled={isLoading || isReframingActive || isOffline}
                            placeholder={
                              isOffline
                                ? "沒有網路，無法發送訊息..."
                                : isReframingActive
                                  ? "✨ 請直接點選與翻閱上方的轉念承諾護照進行簽署..."
                                  : session.phase === "practice"
                                    ? "請輸入造句例句以利確認..."
                                    : "請在此輸入你的文字..."
                            }
                            className={`w-full border text-slate-800 text-xs rounded-xl p-3 focus:outline-none bg-slate-50 font-sans disabled:opacity-50 transition-all ${isReframingActive
                              ? "bg-slate-100 border-slate-200 text-slate-400 placeholder-slate-400/80 cursor-not-allowed select-none"
                              : inputValue.trim().length > 0
                                ? "border-slate-350 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 focus:bg-white pr-11 pl-3.5"
                                : "border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 px-3.5"
                              }`}
                          />

                          {/* Inline send button inside the input box, fading (and slightly scaling) in */}
                          <AnimatePresence>
                            {inputValue.trim().length > 0 && (
                              <motion.button
                                key="send-btn"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.15 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={isReframingActive || isOffline ? {} : { scale: 0.95 }}
                                onClick={() => !isOffline && handleSendMessage()}
                                disabled={isLoading || !inputValue.trim() || isReframingActive || isOffline}
                                className={`absolute right-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-sm shrink-0 ${isReframingActive || isOffline
                                  ? "bg-slate-150 text-slate-405 opacity-40 cursor-not-allowed select-none"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                                  }`}
                                title={isReframingActive ? "轉念階段請使用上方卡片進行簽署" : isOffline ? "目前離線，無法發送訊息" : "發送訊息"}
                              >
                                <Send className="w-3.5 h-3.5 text-white" />
                              </motion.button>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Smooth sliding & fading quick tools (Breathing and Mic icons) */}
                        <AnimatePresence initial={false}>
                          {inputValue.trim().length === 0 && (
                            <motion.div
                              key="tools-btns"
                              initial={{ opacity: 0, width: 0, scale: 0.8, marginLeft: -8 }}
                              animate={{ opacity: 1, width: "auto", scale: 1, marginLeft: 0 }}
                              exit={{ opacity: 0, width: 0, scale: 0.8, marginLeft: -8 }}
                              transition={{ duration: 0.18, ease: "easeInOut" }}
                              className="flex items-center gap-2 shrink-0 overflow-hidden"
                            >
                              {/* 1. Deep breathing simulation button */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setShowBreathingModal(true);
                                  setBreathingPhase("ready");
                                  setBreathingCycle(1);
                                  setBreathingTimer(0);
                                  setShowSettingsPanel(false);
                                }}
                                className="w-10 h-10 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-650 flex items-center justify-center transition-all border border-teal-100/50 shadow-xs shrink-0 cursor-pointer"
                                title="開啟 4-7-8 心靈呼吸器"
                              >
                                <Wind className="w-4 h-4 text-teal-500 animate-pulse-soft" />
                              </motion.button>

                              {/* 2. Micro Recording Button */}
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={isReframingActive || isOffline ? {} : { scale: 0.95 }}
                                onClick={() => !isOffline && toggleRecording()}
                                disabled={isLoading || isReframingActive || isOffline}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 ${isReframingActive || isOffline
                                  ? "bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed select-none"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-500"
                                  }`}
                                title={isReframingActive ? "轉念階段不提供語音輸入" : isOffline ? "沒有網路，無法使用語音輸入" : "語音輸入"}
                              >
                                <Mic className="w-4 h-4 text-slate-400 hover:text-slate-600 transition-colors" />
                              </motion.button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= HEART JOURNAL HISTORY OVERLAY MODAL ================= */}
          <AnimatePresence>
            {showJournalsModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 text-slate-800 animate-fade-in"
                onClick={() => setShowJournalsModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, y: 15 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.95, y: 15 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-white w-full max-w-lg h-[80vh] sm:h-[75vh] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden relative text-left"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="bg-slate-50 border-b border-slate-100 p-4.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 select-none">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">心靈轉念筆記</h3>
                        <p className="text-[10px] text-slate-400 font-bold">過往生命的蛻變與承諾歷程</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowJournalsModal(false);
                        setSelectedJournal(null);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Modal Content container */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {selectedJournal ? (
                      // === DIALOGUE: JOURNAL DETAIL VIEW ===
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                      >
                        {/* Back to list trigger */}
                        <button
                          onClick={() => setSelectedJournal(null)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer select-none"
                        >
                          ← 返回心靈誓約清單
                        </button>

                        {/* Detail Card Summary */}
                        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/10 p-4 rounded-2xl border border-indigo-100/50 space-y-3 select-none">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] bg-indigo-100/60 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                              🌱 心靈排除卡點
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                              {selectedJournal.timestamp}
                            </span>
                          </div>
                          <h4 className="text-base font-black text-slate-900 tracking-tight">
                            『 {selectedJournal.misunderstoodWord} 』
                          </h4>
                        </div>

                        {/* 1. 心情轉折紀錄 */}
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1 select-none">
                            <Smile className="w-3.5 h-3.5 text-indigo-500" />
                            卡點氣候（心情轉折紀錄）
                          </span>
                          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs italic text-slate-600 leading-relaxed font-sans relative">
                            <span className="absolute -top-1.5 -left-1 text-3xl text-indigo-200/90 select-none">“</span>
                            <p className="pl-3.5 pr-2 whitespace-pre-line leading-relaxed">
                              {selectedJournal.userFeelings || "「當初感到有些焦慮，透過引導神隊友好好的梳理了內在情緒。」"}
                            </p>
                          </div>
                        </div>

                        {/* 2. 重構信念 */}
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5 flex items-center gap-1 select-none">
                            <Brain className="w-3.5 h-3.5 text-indigo-500" />
                            大腦重塑信念（限制性信念 vs 轉念）
                          </span>
                          <div className="space-y-2">
                            {selectedJournal.cardSet.map((card: any, idx: any) => (
                              <div key={idx} className="border border-slate-100 rounded-2xl overflow-hidden hover:border-slate-200 transition-all shadow-xs">
                                <div className="bg-slate-100/50 p-2.5 px-3 text-[11px] text-slate-500 flex items-start gap-1.5 border-b border-slate-100/50">
                                  <span className="p-0.5 px-1 bg-red-50 text-red-500 rounded font-black text-[9px] select-none">限制</span>
                                  <span className="leading-normal">{card.front}</span>
                                </div>
                                <div className="p-3 bg-emerald-50/20 text-xs text-slate-705 flex items-start flex-col gap-1.5">
                                  <span className="p-0.5 px-1 bg-emerald-50 text-emerald-600 rounded font-black text-[9px] shrink-0 select-none">轉念</span>
                                  <span className="font-semibold text-slate-705 leading-relaxed">{card.back}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 3. 神聖契約誓言 */}
                        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-4 rounded-2xl border border-emerald-500/15 space-y-2 relative overflow-hidden select-none">
                          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 text-emerald-500/5 rotate-12">
                            <CheckCircle2 className="w-24 h-24" />
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>聖潔轉念實踐契約</span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            署名立約人：<span className="font-extrabold text-indigo-700 underline underline-offset-4 decoration-indigo-300">{selectedJournal.signature}</span>
                          </p>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                            實踐信心指數：<span className="font-extrabold text-emerald-600 font-mono text-xs">{selectedJournal.confidence}%</span>
                          </p>
                          <div className="pt-2 border-t border-emerald-400/20 text-[11px] text-emerald-800 font-extrabold leading-tight">
                            誓約承諾：『{selectedJournal.vow}』
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      // === LIST: HISTORIES OVERVIEW VIEW ===
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-3"
                      >
                        {journals.length === 0 ? (
                          <div className="py-12 text-center max-w-[280px] mx-auto space-y-3 select-none">
                            <div className="text-4xl text-slate-350 animate-bounce">🕊️</div>
                            <h4 className="font-extrabold text-xs text-slate-700">尚未留下轉念誓約紀錄</h4>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              當你在生活模式順利引導突破生活障礙，在底部完成「第三關轉念承諾」後，這裡將會生氣蓬勃封存累積你的自我躍進成果！
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {journals.map((j: any) => (
                              <div
                                key={j.id}
                                onClick={() => setSelectedJournal(j)}
                                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/20 border border-slate-150/80 hover:border-indigo-200 transition-all shadow-xs flex items-center justify-between gap-3 group cursor-pointer select-none"
                              >
                                <div className="flex-1 min-w-0 space-y-1 text-left">
                                  <div className="flex items-center justify-between sm:justify-start gap-2">
                                    <span className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400" />
                                      {j.timestamp}
                                    </span>
                                    <span className="text-[8px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded leading-none">
                                      信心 {j.confidence}%
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800 truncate leading-snug">
                                    『 {j.misunderstoodWord} 』排除儀式
                                  </h4>
                                  <p className="text-[9.5px] text-slate-450 truncate flex items-center gap-1">
                                    <span className="text-indigo-400 font-mono">✦</span> 立約人：{j.signature} ➔ 「{j.vow}」
                                  </p>
                                </div>

                                {/* Actions on list item */}
                                <div className="flex items-center shrink-0">
                                  <button
                                    onClick={(e: any) => deleteJournal(j.id, e)}
                                    className="p-1 rounded-lg text-slate-300 hover:text-red-550 hover:bg-red-50/50 transition cursor-pointer"
                                    title="刪除此筆記錄"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Modal Footer warning */}
                  <div className="border-t border-slate-100 p-3 bg-slate-50 text-center text-[9px] text-slate-400 font-bold shrink-0 select-none">
                    {selectedJournal ? "每一次觀照都是成長的基石，願你常伴光芒 🍂" : "心靈與秘密保存在此裝置裡，無須擔心外洩 🔒"}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= 4-7-8 DEEP BREATHING OVERLAY ================= */}
          <AnimatePresence>
            {showBreathingModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-lg flex flex-col items-center justify-between p-6 text-white text-center"
              >
                {/* Top status bar & close button */}
                <div className="w-full max-w-md flex items-center justify-between pt-4 select-none shrink-0">
                  <div className="flex items-center gap-2">
                    <Wind className="w-5 h-5 text-teal-400 animate-pulse-soft" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">
                      4-7-8 Mind Breather
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {breathingPhase === "ready" && (
                      <button
                        onClick={() => setShowSettingsPanel((v) => !v)}
                        className={`p-2 rounded-xl transition cursor-pointer text-xs font-bold flex items-center gap-1 border ${showSettingsPanel ? "bg-teal-500/15 border-teal-500/25 text-teal-350" : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5"}`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>設定</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowBreathingModal(false);
                        setBreathingPhase("ready");
                        setShowSettingsPanel(false);
                      }}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer text-xs font-bold flex items-center gap-1 border border-white/5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>結束返回</span>
                    </button>
                  </div>
                </div>

                {/* Main content center: Breathing Circle & Guidance */}
                <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-md w-full">

                  {/* Status info */}
                  <div className="space-y-2 select-none h-16 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={breathingPhase}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center space-y-1"
                      >
                        <h3 className="text-xl font-black text-white tracking-tight">
                          {breathingPhase === "ready" && "4-7-8 減壓深呼吸儀式"}
                          {breathingPhase === "inhale" && "🌱 第一步：鼻子吸氣"}
                          {breathingPhase === "hold" && "🪵 第二步：屏住呼吸"}
                          {breathingPhase === "exhale" && "🌊 第三步：嘴巴吐氣"}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold px-4">
                          {breathingPhase === "ready" && "找到舒服姿勢，放鬆肩膀，即可啟動引導調頻儀式。"}
                          {breathingPhase === "inhale" && "緩緩地，用 4 秒鐘將清新的氧氣吸入腹部，感受新鮮溫暖的能量。"}
                          {breathingPhase === "hold" && "溫和閉氣 7 秒鐘。讓吸入的能量與大腦思維交融，淨化急躁的心情。"}
                          {breathingPhase === "exhale" && "微張嘴巴，花 8 秒鐘緩慢吐氣，將所有焦慮與生活卡點通通吐出。"}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Breathing Ball Container */}
                  <div className="relative w-72 h-72 flex items-center justify-center">
                    {/* Outer pulsating wave aura */}
                    <AnimatePresence>
                      {breathingPhase !== "ready" && (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0.3 }}
                          animate={{
                            scale: breathingPhase === "inhale" ? [1, 1.8, 1.6] : breathingPhase === "hold" ? [1.6, 1.7, 1.6] : breathingPhase === "exhale" ? [1.6, 0.9, 1] : [1, 1, 1],
                            opacity: [0.15, 0.45, 0.15]
                          }}
                          transition={{
                            duration: breathingPhase === "inhale" ? 4 : breathingPhase === "hold" ? 7 : breathingPhase === "exhale" ? 8 : 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className={`absolute inset-0 rounded-full blur-2xl filter opacity-20 ${breathingPhase === "inhale" ? "bg-teal-500" :
                            breathingPhase === "hold" ? "bg-amber-500" :
                              breathingPhase === "exhale" ? "bg-indigo-500" :
                                "bg-slate-500"
                            }`}
                        />
                      )}
                    </AnimatePresence>

                    {/* Main physical animated breathing circle */}
                    <motion.div
                      animate={{
                        scale:
                          breathingPhase === "ready" ? 1.0 :
                            breathingPhase === "inhale" ? 1.6 :
                              breathingPhase === "hold" ? 1.62 : // 微幅脈動
                                breathingPhase === "exhale" ? 0.95 :
                                  1.0 // rest
                      }}
                      transition={{
                        duration:
                          breathingPhase === "ready" ? 2 :
                            breathingPhase === "inhale" ? 4 :
                              breathingPhase === "hold" ? 7 :
                                breathingPhase === "exhale" ? 8 :
                                  1,
                        ease: "easeInOut"
                      }}
                      className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl relative transition-colors duration-1000 border border-white/10 ${breathingPhase === "ready" ? "bg-gradient-to-br from-slate-800 to-slate-900 text-slate-350" :
                        breathingPhase === "inhale" ? "bg-gradient-to-br from-teal-500 to-emerald-600 text-teal-50" :
                          breathingPhase === "hold" ? "bg-gradient-to-br from-amber-500 to-orange-600 text-amber-50" :
                            breathingPhase === "exhale" ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-indigo-50" :
                              "bg-gradient-to-br from-slate-700 to-slate-800 text-slate-105"
                        }`}
                    >
                      {/* Pulsing inner core */}
                      <div className="absolute inset-2 rounded-full border border-white/20 animate-pulse-soft" />

                      {/* Timer and instructions in circle */}
                      <div className="z-10 select-none text-center space-y-1">
                        {breathingPhase === "ready" ? (
                          <div className="flex flex-col items-center justify-center">
                            <Wind className="w-8 h-8 text-teal-400 mb-1 animate-pulse" />
                            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-450">
                              Ready
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[11px] font-black tracking-wider uppercase opacity-85">
                              {breathingPhase === "inhale" && "吸氣"}
                              {breathingPhase === "hold" && "閉氣"}
                              {breathingPhase === "exhale" && "吐氣"}
                            </span>
                            <span className="text-4xl font-black font-mono tracking-tight my-0.5">
                              {breathingTimer} <span className="text-xs font-normal text-white/70">秒</span>
                            </span>
                            <span className="text-[10px] font-medium opacity-60">
                              {breathingPhase === "inhale" && "/ 4 秒"}
                              {breathingPhase === "hold" && "/ 7 秒"}
                              {breathingPhase === "exhale" && "/ 8 秒"}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </div>

                  {/* Progress Indicators & Cycles count */}
                  <div className="w-full px-8 space-y-4 select-none">
                    {breathingPhase !== "ready" ? (
                      <div className="space-y-3">
                        {/* Cycle count tag */}
                        <div className="flex items-center justify-between text-xs font-bold text-slate-450">
                          <span>引導調頻進度</span>
                          <span className="text-teal-400 text-right font-black">
                            {breathingLoopType === "infinite" ? (
                              <>第 <span className="font-mono text-white text-sm font-extrabold">{breathingCycle}</span> 次循環 (無限)</>
                            ) : breathingLoopType === "minutes" ? (
                              <>第 <span className="font-mono text-white text-sm font-extrabold">{breathingCycle}</span> / <span className="font-mono text-white/80 text-sm font-extrabold">{Math.ceil((breathingLoopValue * 60) / 20)}</span> 次循環 ({breathingLoopValue}分鐘)</>
                            ) : (
                              <>第 <span className="font-mono text-white text-sm font-extrabold">{breathingCycle}</span> / <span className="font-mono text-white/80 text-sm font-extrabold">{breathingLoopValue}</span> 次循環</>
                            )}
                          </span>
                        </div>

                        {/* Cycles dot representation or progress bar */}
                        {breathingLoopType === "cycles" && breathingLoopValue <= 8 ? (
                          <div className="flex items-center justify-center gap-2">
                            {Array.from({ length: breathingLoopValue }).map((_, idx) => {
                              const c = idx + 1;
                              return (
                                <div
                                  key={c}
                                  className={`h-2 rounded-full transition-all duration-500 ${c < breathingCycle ? "w-6 bg-teal-500" :
                                    c === breathingCycle ? "w-10 bg-teal-400 animate-pulse" :
                                      "w-2 bg-slate-800"
                                    }`}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          /* Render a smooth progress bar if it's many cycles or based on time */
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500 transition-all duration-500 rounded-full"
                              style={{
                                width: breathingLoopType === "infinite"
                                  ? "100%"
                                  : `${Math.min(100, ((breathingCycle - 1) / (breathingLoopType === "minutes" ? Math.ceil((breathingLoopValue * 60) / 20) : breathingLoopValue)) * 100)}%`
                              }}
                            />
                          </div>
                        )}

                        {/* Action status note */}
                        <p className="text-[10px] text-slate-500 italic block text-center pt-1 font-bold">
                          小提示：請遵循秒數節律呼吸，累了可以隨時提前退出。
                        </p>
                      </div>
                    ) : (
                      <div className="w-full px-8 space-y-4 select-none">
                        {/* Compact current settings summary */}
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span className="bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400">
                            {breathingGuideType === "ambient" ? "🎵 環境音" :
                              breathingGuideType === "voice" ? "🗣️ 人聲" :
                              breathingGuideType === "metronome" ? "⏱️ 節拍音" : "🔇 靜音"}
                          </span>
                          {breathingVibrateEnabled && (
                            <span className="bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400">
                              📳 震動
                            </span>
                          )}
                          <span className="text-slate-700 text-xs">·</span>
                          <span className="bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400">
                            {breathingLoopType === "infinite" ? "🔂 無限" :
                              breathingLoopType === "minutes" ? `⏳ ${breathingLoopValue} 分鐘` :
                              `🌀 ${breathingLoopValue} 次`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowSettingsPanel(true)}
                            className="bg-teal-500/8 hover:bg-teal-500/15 px-2.5 py-1 rounded-full text-[10px] font-black text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer transition-all border border-teal-500/15"
                          >
                            <Sliders className="w-2.5 h-2.5" />
                            調整設定
                          </button>
                        </div>

                        {/* 啟動按鈕 */}
                        <button
                          onClick={() => {
                            setShowSettingsPanel(false);
                            if (breathingVibrateEnabled && navigator.vibrate) {
                              try { navigator.vibrate(100); } catch (e) { }
                            }
                            if (breathingGuideType === "ambient") {
                              startAudioEngine();
                            }
                            setBreathingPhase("inhale");
                            setBreathingCycle(1);
                            setBreathingTimer(1);
                          }}
                          className="w-full py-4 rounded-2xl bg-gradient-to-r from-teal-500 via-indigo-650 to-indigo-700 hover:from-teal-400 hover:to-indigo-600 text-white font-extrabold text-sm transition-all shadow-xl shadow-indigo-950/40 border border-white/5 select-none hover:scale-101 active:scale-99 cursor-pointer"
                        >
                          🧘 啟動 4-7-8 呼吸排除儀式
                        </button>
                      </div>
                    )}
                  </div>

                </div>

                {/* Bottom footer quote */}
                <div className="pb-6 pt-2 select-none shrink-0">
                  <p className="text-[10px] font-bold text-slate-500 tracking-wide uppercase">
                    「吐氣時 吐出重擔；吸氣時 注入新生」 🌬️
                  </p>
                </div>

                {/* ===== 側邊設定面板 (slide-in from right) ===== */}
                <AnimatePresence>
                  {showSettingsPanel && (
                    <>
                      <div className="absolute inset-0 z-10" onClick={() => setShowSettingsPanel(false)} />
                      <motion.div
                        key="settings-panel"
                        initial={{ x: "100%" }}
                        animate={{ x: "0%" }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                        className="absolute right-0 top-0 bottom-0 w-[300px] max-w-[88vw] bg-slate-950/98 border-l border-white/8 flex flex-col overflow-hidden z-20 shadow-2xl shadow-black/50 select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                      {/* 側邊欄 Header */}
                      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8 shrink-0">
                        <span className="flex items-center gap-2 text-xs font-extrabold text-slate-200">
                          <Sliders className="w-4 h-4 text-teal-400" />
                          輔助引導設定
                        </span>
                        <button
                          onClick={() => setShowSettingsPanel(false)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 側邊欄 Content (scrollable) */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-5">

                        {/* 1. 引導模式 */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-teal-400" />
                              引導模式
                            </span>
                            <span className="text-teal-400 text-[10px]">
                              {breathingGuideType === "ambient" && "🎵 環境音"}
                              {breathingGuideType === "voice" && "🗣️ 人聲語音"}
                              {breathingGuideType === "metronome" && "⏱️ 節拍音"}
                              {breathingGuideType === "none" && "🔇 已關閉"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "ambient", label: "自然環境音", sub: "頌缽和海浪聲", icon: Music },
                              { id: "voice", label: "人聲語音", sub: "吸氣/閉氣/吐氣", icon: Mic },
                              { id: "metronome", label: "節拍提示音", sub: "柔和換段音效", icon: Volume2 },
                            ].map((item) => {
                              const Icon = item.icon;
                              const active = breathingGuideType === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => setBreathingGuideType(item.id as any)}
                                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none ${active
                                    ? "bg-teal-500/10 border-teal-500/30 text-teal-350 shadow-md shadow-teal-950/20"
                                    : "bg-white/3 border-white/5 text-slate-400 hover:bg-white/8 hover:text-white"
                                    }`}
                                >
                                  <div className={`p-1.5 rounded-lg shrink-0 ${active ? "bg-teal-500/20 text-teal-400" : "bg-black/20 text-slate-500"}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="leading-tight">
                                    <p className="text-[9px] font-black">{item.label}</p>
                                    <p className="text-[8px] opacity-60 font-bold">{item.sub}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => setBreathingGuideType("none")}
                            className={`w-full py-2 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${breathingGuideType === "none"
                              ? "bg-teal-500/10 border-teal-500/30 text-teal-350"
                              : "bg-white/3 border-white/5 text-slate-400 hover:bg-white/8 hover:text-white"
                              }`}
                          >
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>關閉聲音</span>
                          </button>

                          {/* 震動開關 */}
                          <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${breathingVibrateEnabled ? "bg-teal-500/10 border-teal-500/30" : "bg-white/3 border-white/5"}`}>
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg shrink-0 ${breathingVibrateEnabled ? "bg-teal-500/20 text-teal-400" : "bg-black/20 text-slate-500"}`}>
                                <Smartphone className="w-3.5 h-3.5" />
                              </div>
                              <div className="leading-tight">
                                <p className="text-[10px] font-black text-slate-300">手機震動</p>
                                <p className="text-[8px] opacity-60 font-bold text-slate-400">觸覺回饋</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBreathingVibrateEnabled(!breathingVibrateEnabled)}
                              className={`relative w-10 h-5 rounded-full transition-all cursor-pointer flex items-center px-0.5 shrink-0 border ${breathingVibrateEnabled ? "bg-teal-500 border-teal-400" : "bg-white/10 border-white/10"}`}
                            >
                              <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${breathingVibrateEnabled ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                          </div>
                        </div>

                        {/* 分割線 */}
                        <div className="h-px bg-white/6" />

                        {/* 2. 循環設定 */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                              循環設定
                            </span>
                            <span className="text-teal-400 text-[10px]">
                              {breathingLoopType === "minutes" && `⏳ ${breathingLoopValue} 分鐘`}
                              {breathingLoopType === "cycles" && `🌀 ${breathingLoopValue} 次`}
                              {breathingLoopType === "infinite" && "🔂 無限"}
                            </span>
                          </div>

                          {/* 循環類型 Tab */}
                          <div className="grid grid-cols-3 gap-1.5 bg-black/20 p-1 rounded-xl border border-white/5">
                            {[
                              { id: "cycles", label: "按次數" },
                              { id: "minutes", label: "按時間" },
                              { id: "infinite", label: "無限" }
                            ].map((tab) => {
                              const active = breathingLoopType === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => {
                                    setBreathingLoopType(tab.id as any);
                                    if (tab.id === "cycles") setBreathingLoopValue(4);
                                    else if (tab.id === "minutes") setBreathingLoopValue(3);
                                  }}
                                  className={`py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${active
                                    ? "bg-teal-500/15 text-teal-350 border border-teal-500/20"
                                    : "text-slate-400 hover:text-white border border-transparent"
                                    }`}
                                >
                                  {tab.id === "infinite" && <Repeat className="w-3 h-3" />}
                                  <span>{tab.label}</span>
                                </button>
                              );
                            })}
                          </div>

                          {breathingLoopType === "cycles" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-4 gap-1.5">
                                {[4, 8, 16, 32].map((cycles) => (
                                  <button key={cycles} type="button" onClick={() => setBreathingLoopValue(cycles)}
                                    className={`py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer text-center ${breathingLoopValue === cycles
                                      ? "bg-teal-500/15 border-teal-500/40 text-teal-350"
                                      : "bg-white/3 border-white/5 text-slate-400 hover:bg-white/8 hover:text-white"}`}>
                                    {cycles}次
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center justify-between bg-black/20 rounded-xl border border-white/5 px-3 py-2">
                                <span className="text-[10px] text-slate-400 font-bold">自訂</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => setBreathingLoopValue(Math.max(1, breathingLoopValue - 1))}
                                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer border border-white/10 leading-none font-bold">−</button>
                                  <span className="text-teal-350 font-black text-xs w-10 text-center tabular-nums">{breathingLoopValue}次</span>
                                  <button type="button" onClick={() => setBreathingLoopValue(breathingLoopValue + 1)}
                                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer border border-white/10 leading-none font-bold">+</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {breathingLoopType === "minutes" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-4 gap-1.5">
                                {[1, 3, 5, 10].map((min) => (
                                  <button key={min} type="button" onClick={() => setBreathingLoopValue(min)}
                                    className={`py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer text-center ${breathingLoopValue === min
                                      ? "bg-teal-500/15 border-teal-500/40 text-teal-350"
                                      : "bg-white/3 border-white/5 text-slate-400 hover:bg-white/8 hover:text-white"}`}>
                                    {min}分鐘
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center justify-between bg-black/20 rounded-xl border border-white/5 px-3 py-2">
                                <span className="text-[10px] text-slate-400 font-bold">自訂</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => setBreathingLoopValue(Math.max(1, breathingLoopValue - 1))}
                                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer border border-white/10 leading-none font-bold">−</button>
                                  <span className="text-teal-350 font-black text-xs w-12 text-center tabular-nums">{breathingLoopValue}分鐘</span>
                                  <button type="button" onClick={() => setBreathingLoopValue(breathingLoopValue + 1)}
                                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer border border-white/10 leading-none font-bold">+</button>
                                </div>
                              </div>
                            </div>
                          )}

                          {breathingLoopType === "infinite" && (
                            <div className="p-3 rounded-xl bg-white/2 border border-white/5 text-center">
                              <p className="text-[10px] text-slate-400 font-bold flex items-center justify-center gap-1.5">
                                <Repeat className="w-3.5 h-3.5 text-teal-400 animate-pulse-soft" />
                                持續引導直到點擊「結束返回」
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 側邊欄 footer */}
                      <div className="shrink-0 p-4 border-t border-white/6">
                        <button
                          type="button"
                          onClick={() => setShowSettingsPanel(false)}
                          className="w-full py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-350 text-xs font-black cursor-pointer hover:bg-teal-500/20 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          儲存並關閉設定
                        </button>
                      </div>
                    </motion.div>
                    </>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}
