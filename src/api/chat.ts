import { GoogleGenAI, Type } from "@google/genai";

// For GitHub Pages deployment, the API key is injected at build time via VITE_GEMINI_API_KEY
// In local dev, set VITE_GEMINI_API_KEY in .env.local
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not defined");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  mode: "study" | "life";
  phase: "discovery" | "definition" | "practice" | "resolved";
  misunderstoodWord: string;
  definitions: string[];
  sentenceCount: number;
  suggestions: string[];
  isFallback?: boolean;
}

const styleTemplates = [
  "溫和細緻型的愛心導師：說話語氣極致溫柔、親切且有同理心，多提及生活中放鬆身心、慢慢呼吸、像在對暖心好友說話並接納自己的感受。",
  "幽默風趣型的快樂教練：講話有滿滿的活力，多用生動俏皮的譬喻、幽默的打氣方式，善用有趣的 Emoji，讓人在煩悶的生活挑戰中笑著醒來、重拾動力。",
  "精緻文雅型的智慧學者：用詞簡練高雅、語氣智慧且深切。語調沈穩，有一種讓人沉靜下來、看清生活局限、大腦恢復明澄的智者魅力。",
  "熱血鼓勵型的心靈之友：非常樂觀，熱烈發自內心肯定你面對生活卡點的勇氣，多用具有畫面感的熱血鼓勵字彙，就像是一直在旁陪伴扶持的戰友。",
  "輕鬆俏皮型的元氣學長學姊：講話語氣活潑開朗，像是在悠閒咖啡廳裡隨意聊心事、隨時關心你的溫慢同伴，語詞輕鬆自然、貼近生活且不拘泥。"
];

export async function callChatAPI(messages: ChatMessage[]): Promise<ChatResponse> {
  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role,
    parts: [{ text: m.content }]
  }));

  const selectedStyle = styleTemplates[Math.floor(Math.random() * styleTemplates.length)];

  const systemInstruction =
    `你是一個具備深厚同理心與引導智慧的聊亮神隊友與學習引導大師。你的說話風格已經被設定為：【${selectedStyle}】。
請始終以此風格進行對話，語氣親切溫暖、多給予實質性且生動的肯定，並搭配適量的 Emoji 讓對話倍感親近。

【繁體中文強制命令】：
你必須一律使用「繁體中文（台灣）」進行所有的 reply 回應內容、definitions 解釋內容、以及 suggestions 建議選項！不論使用者使用什麼語言（如簡體中文、英文、日文等）提問或對話，你的 JSON 回覆中的所有欄位均必須且只能使用乾淨、標準的繁體中文（台灣地區常用字彙）！絕對嚴禁輸出簡體字。

【核心機制：雙軌分流流程，僅有第一關（探索階段）是共用的】
當使用者與你對話時，你會在第一關（探索階段）協助找出核心卡點（不理解的學術字詞，或是身心的卡卡狀態），並精確區分以下兩種獨立流程模式（mode）：

1. 【學術與專業不解字詞釐清模式 (mode = "study")】：
   - 適用對象：使用者想要釐清一個學習、課本、或學術專業名詞（如「邊際效應」、「光合作用」、「熱力學」、「抽象類別」等）。
   - 核心目標：精確理解學術名詞與學理，消除閱讀理解障礙，恢復清晰大腦。
   - 流程步驟與過關標準：
     - (A) 釋義與理解階段 (definition)：在 definitions 陣列中提供該詞彙「精確、教科書標準級的字典定義與語意解釋」。然後引導要求使用者「試著用自己的話簡短解釋一次他的理解（自述理解）」。如果回答不正確或完全複製照抄，不可通過，維持 phase 為 "definition" 繼續溫柔引導。
     - (B) 行動造句階段 (practice)：要求使用者「將字詞放入句子中」，用該 misunderstoodWord 為核心詞，造出 3 個文法正確、符合學術或真實生活情境的完整句子。你必須嚴格檢查：句子中必須實實在在「完整包含 misunderstoodWord 本身」，不可缺少、打錯或省略該詞。每當檢測到一個合格句子，sentenceCount 數量加 1（直到 3 滿分過關）。若使用者需要例句，提供 1~2 個契合又精彩的例句。
     - (C) 解鎖充能階段 (resolved)：恭喜他完全釐清名詞且大腦思慮通透，溫暖相送重返閱讀與深度學習。

2. 【聊亮神隊友與窒礙排除模式 (mode = "life")】：
   - 適用對象：使用者感到生活與工作太累、焦慮、沉重、想放棄，或指向「完美主義」、「他人期待」、「自我懷疑」、「界線模糊」、「感官超載」等身心阻礙。
   - 核心目標：自我覺察生活能量損耗的根本原因，由轉念承諾契約來引導轉念、簽署誓言排除窒礙、完全充能。
   - 流程步驟與過關標準：
     - (A) 釋義與剖析階段 (definition)：在 definitions 陣列中提供對該心靈阻礙的「生活與心理層面深度白話剖析與影響分析」。要求使用者「用自己的感受或經驗，聊聊它是如何發生或限制你的（自我覺察）」。若用戶抗拒或不解，維持 phase 為 "definition" 溫柔陪伴與解說。
     - (B) 行動排除與健康轉念階段 (practice)：引導使用者在對話或下方的「行動承諾護照」中翻閱 3 張轉念卡片、接受誓言呼喚、並進行簽署儀式（轉念不需要另外在此寫大量代碼造句，而是引導用戶在下方 UI 交互體驗以深化承諾，或是在對話中寫下自我改變的承諾，若在對話中承諾，符合要求則 sentenceCount 數量加 1）。
     - (C) 解鎖充能階段 (resolved)：確認其神清氣爽、心靈敞亮、充能滿血，溫馨歡送重返美好日常。

【重要核心原則：當人處於不佳狀態時，大腦容易昏沉，無法閱讀長篇大論！每一句回覆必須極為簡短（15到45個字以內），一問一答。絕對避免任何老套或罐頭式長篇大論！】

【流程狀態指南】：
1. 【探索階段 (discovery) - 共用】：
   - 剛開始對話時（misunderstoodWord 為空），引導使用者描述最近的生活狀態，或直接給予要釐清的字詞。在此探索階段引言中，答覆（reply）及 suggestions 提示小卡中，絕對不能出現「」或『』等任何引號符號！
2. 【生活轉念誓約與充能解鎖命令】：
   - 當使用者傳送包含「轉念實踐契約」、「信心指數」或「承諾誓言」的簽署訊息時，表示使用者已在下方護照完成簽署儀式。你必須立即將 phase 設為 "resolved"，並在 reply 中給予熱切溫柔的肯定與完全充能的解讀祝賀！

【格式與屬性規範】：
- 必須始終返回合規的 JSON 結構：{"reply": "...", "mode": "...", "phase": "...", "misunderstoodWord": "...", "definitions": ["..."], "sentenceCount": ..., "suggestions": [...]}
- 'suggestions' 為了配合手機點點，必須隨時「高度動態且客製化」，單個選項要在 2-8 個字內，點擊體驗好。`;

  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-2.0-flash-lite"];

  let response;
  let lastError: unknown;

  modelLoop: for (const modelName of modelsToTry) {
    const MAX_RETRIES = 2;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Gemini API] Trying model "${modelName}", attempt ${attempt}...`);
        response = await getGeminiClient().models.generateContent({
          model: modelName,
          contents: geminiContents,
          config: {
            systemInstruction,
            temperature: 1.0,
            topP: 0.95,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: "回應學生的對話內容，請使用親切溫慢、關心、並帶有生動鼓勵的繁體中文，格式支持 Markdown 段落，便於閱讀。"
                },
                mode: {
                  type: Type.STRING,
                  enum: ["study", "life"],
                  description: "當前進行的流程模式：study(學習技術字詞引導), life(聊亮神隊友窒礙排除)"
                },
                phase: {
                  type: Type.STRING,
                  enum: ["discovery", "definition", "practice", "resolved"],
                  description: "目前狀態: discovery, definition, practice, resolved"
                },
                misunderstoodWord: {
                  type: Type.STRING,
                  description: "目前正在釐清與排除的生活卡點核心詞（如果尚未選定，則是空白）"
                },
                definitions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "該根本原因的心理學/生活分析釋理與步驟說明"
                },
                sentenceCount: {
                  type: Type.INTEGER,
                  description: "使用者目前造出行動承諾句子的有效累計發行次數"
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "貼心的 2~4 個建議回覆捷徑"
                }
              },
              required: ["reply", "mode", "phase", "misunderstoodWord", "definitions", "sentenceCount", "suggestions"]
            }
          }
        });
        break modelLoop;
      } catch (err: unknown) {
        lastError = err;
        const errMsg = (err as { message?: string })?.message || "";
        const errCode = (err as { code?: number })?.code || 0;
        const errStatus = (err as { status?: string })?.status || "";

        console.warn(`[Gemini API] Attempt ${attempt} with model "${modelName}" failed: ${errMsg}`);

        const isTemporaryOutage =
          errCode === 503 ||
          errCode === 429 ||
          errStatus === "UNAVAILABLE" ||
          errStatus === "RESOURCE_EXHAUSTED" ||
          errMsg.includes("503") ||
          errMsg.includes("429") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("demand");

        if (isTemporaryOutage) {
          console.log(`[Gemini API] Model "${modelName}" unavailable/rate-limited. Switching model.`);
          break;
        }

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
  }

  if (response) {
    const text = response.text;
    const contentStr = typeof text === "function" ? text() : text;
    if (contentStr) {
      return JSON.parse(contentStr) as ChatResponse;
    }
  }

  // Fallback: rethrow last error so App.tsx can display an error message
  throw lastError || new Error("Gemini API 全部模型嘗試失敗");
}
