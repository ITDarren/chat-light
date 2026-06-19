import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API lazily to prevent server crashes on startup if GEMINI_API_KEY is missing
  let aiInstance: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined");
      }
      aiInstance = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiInstance;
  }

  // API Route for chat
  app.post("/api/chat", async (req, res) => {
    let messages: any[] = [];
    try {
      const bodyMessages = req.body.messages;
      if (!bodyMessages || !Array.isArray(bodyMessages)) {
        return res.status(400).json({ error: "Messages array is required." });
      }
      messages = bodyMessages;

      // convert messages to GoogleGenAI SDK format
      const geminiContents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: m.content }]
      }));

      // Define a variety of professional counseling style templates to keep dialogue extremely organic and lively
      const styleTemplates = [
        "溫和細緻型的愛心導師：說話語氣極致溫柔、親切且有同理心，多提及生活中放鬆身心、慢慢呼吸、像在對暖心好友說話並接納自己的感受。",
        "幽默風趣型的快樂教練：講話有滿滿的活力，多用生動俏皮的譬喻、幽默的打氣方式，善用有趣的 Emoji，讓人在煩悶的生活挑戰中笑著醒來、重拾動力。",
        "精緻文雅型的智慧學者：用詞簡練高雅、語氣智慧且深切。語調沈穩，有一種讓人沉靜下來、看清生活局限、大腦恢復明澄的智者魅力。",
        "熱血鼓勵型的心靈之友：非常樂觀，熱烈發自內心肯定你面對生活卡點的勇氣，多用具有畫面感的熱血鼓勵字彙，就像是一直在旁陪伴扶持的戰友。",
        "輕鬆俏皮型的元氣學長學姊：講話語氣活潑開朗，像是在悠閒咖啡廳裡隨意聊心事、隨時關心你的溫慢同伴，語詞輕鬆自然、貼近生活且不拘泥。"
      ];
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

【格式與屬性規範】：
- 必須始終返回合規的 JSON 結構：{"reply": "...", "mode": "...", "phase": "...", "misunderstoodWord": "...", "definitions": ["..."], "sentenceCount": ..., "suggestions": [...]}
- 'suggestions' 為了配合手機點點，必須隨時「高度動態且客製化」，單個選項要在 2-8 個字內，點擊體驗好。`;

      let response;
      let lastError: any = null;
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.1-pro-preview"];
      
      try {
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
                        description: "當前進行的流程模式：study(學習技術字詞引導 - 課程名詞或學術字詞理解), life(聊亮神隊友窒礙排除 - 身心與情感障礙排除)"
                      },
                      phase: {
                        type: Type.STRING,
                        enum: ["discovery", "definition", "practice", "resolved"],
                        description: "目前狀態: discovery(探索核心卡點中), definition(解說與使用者用理解與覺察中), practice(具體造句承諾中), resolved(問題釐清與排除成功)"
                      },
                      misunderstoodWord: {
                        type: Type.STRING,
                        description: "目前正在釐清與排除的生活卡點核心詞（或學習技術學科詞）（如果尚未選定，則是空白）"
                      },
                      definitions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "該根本原因的心理學/生活分析釋理與步驟說明"
                      },
                      sentenceCount: {
                        type: Type.INTEGER,
                        description: "使用者目前造出行動承諾句子的有效累計發行次數（若最近句子正確，需加 1；若不符要求則維持原數）"
                      },
                      suggestions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "貼心的 2~4 個建議回覆捷徑，配合手機打字不便，以幽默活潑、情境相關的口吻設計"
                      }
                    },
                    required: ["reply", "mode", "phase", "misunderstoodWord", "definitions", "sentenceCount", "suggestions"]
                  }
                }
              });
              break modelLoop; // successfully executed, exit both loops!
            } catch (err: any) {
              lastError = err;
              const errMsg = err?.message || "";
              const errCode = err?.code || 0;
              const errStatus = err?.status || "";
              
              console.warn(`[Gemini API] Attempt ${attempt} with model "${modelName}" failed: ${errMsg} (Status: ${errStatus}, Code: ${errCode})`);
              
              // If model is experiencing temporary outage (503/UNAVAILABLE) or rate limiting (429), immediately switch to next model
              const isTemporaryOutageOrRateLimit = 
                errCode === 503 || 
                errCode === 429 || 
                errStatus === "UNAVAILABLE" || 
                errStatus === "RESOURCE_EXHAUSTED" || 
                errMsg.includes("503") || 
                errMsg.includes("429") || 
                errMsg.includes("UNAVAILABLE") || 
                errMsg.includes("demand");
                
              if (isTemporaryOutageOrRateLimit) {
                console.log(`[Gemini API] Model "${modelName}" is returning 503/429/UNAVAILABLE/HIGH_DEMAND. Skipping remaining attempts and switching model immediately.`);
                break; // Break the attempt loop to move to the next model in the modelLoop
              }

              if (attempt < MAX_RETRIES) {
                const delay = attempt * 1000; 
                await new Promise((resolve) => setTimeout(resolve, delay));
              }
            }
          }
        }

        if (response) {
          const text = response.text;
          const contentStr = typeof text === "function" ? text() : text;
          if (contentStr) {
            const data = JSON.parse(contentStr);
            return res.json(data);
          }
        }
      } catch (apiErr) {
        console.error("[Gemini API] Failed entirely, falling back to offline mechanism:", apiErr);
      }

      try {
        let phase = "discovery";
        let misunderstoodWord = "";
        let definitions: string[] = [];
        let sentenceCount = 0;
        let suggestions: string[] = [];
        let mode: "study" | "life" = "study";

        const lifeWords = ["完美主義", "他人期待", "自我懷疑", "界線模糊", "感官超載"];

        // Reconstruct conversation state to know the state PRIOR to the latest user message
        const replayLimit = messages.length - 1;
        for (let i = 0; i < replayLimit; i++) {
          const m = messages[i];
          const isUser = (m.role === "user");
          const mText = (m.content || "").trim();

          if (!isUser) {
            // Parse assertions from previous assistant messages
            if (mText.includes("進度：1 / 3") || mText.includes("第 2 個句子") || mText.includes("第 2 個具體") || mText.includes("第 2 個不同的句子")) {
              sentenceCount = 1;
              phase = "practice";
            } else if (mText.includes("進度：2 / 3") || mText.includes("第 3 個句子") || mText.includes("第 3 個排除") || mText.includes("第 3 個不同的句子")) {
              sentenceCount = 2;
              phase = "practice";
            } else if (mText.includes("3 / 3 達標") || mText.includes("三個行動承諾完美過關") || mText.includes("能量滿血") || mText.includes("神清氣爽")) {
              sentenceCount = 3;
              phase = "resolved";
            }
            
            // Extract the misunderstood word if found in quotes, making sure to avoid status message quotes
            const rxList = [/『\s*(.*?)\s*』/g, /「\s*(.*?)\s*」/g];
            const invalidKeywords = [
              "造句", "第一關", "第二關", "過關", "達標", "不合格", "目標", "探索", "理解",
              "之前", "標的詞", "核心卡點", "生活卡點", "根本原因", "這個字", "這個詞", "卡點",
              "三個", "3個", "句！", "句", "轉念", "排除", "儀式", "承諾", "排除儀式", "行動承諾", "簽署"
            ];
            let foundWord = "";
            for (const rx of rxList) {
              rx.lastIndex = 0;
              let match;
              while ((match = rx.exec(mText)) !== null) {
                const candidate = match[1]?.trim();
                if (candidate && candidate.length >= 1 && candidate.length <= 15) {
                  const hasInvalid = invalidKeywords.some(keyword => candidate.includes(keyword));
                  if (!hasInvalid) {
                    foundWord = candidate;
                  }
                }
              }
            }
            if (foundWord) {
              misunderstoodWord = foundWord;
            }
          } else {
            // User input in history
            if (phase === "discovery") {
              let wordCandidate = "";
              const quoteMatch = mText.match(/[『「"']([^『「"'\s]{1,15})[』」"']/);
              if (quoteMatch) {
                wordCandidate = quoteMatch[1];
              } else if (mText.length >= 1 && mText.length <= 6 && !mText.includes("我") && !mText.includes("卡") && !mText.includes("累")) {
                wordCandidate = mText;
              } else if (mText.includes("排除") || mText.includes("不懂") || mText.includes("什麼是") || mText.includes("卡點")) {
                const clean = mText.replace(/(我想清除|我不懂|什麼是|這個字|這個字詞|字|排除|卡點|根本原因)/g, "").trim();
                if (clean.length >= 1 && clean.length <= 15) {
                  wordCandidate = clean;
                }
              }
              
              if (wordCandidate) {
                misunderstoodWord = wordCandidate;
                phase = "definition";
              }
            } else if (phase === "definition") {
              const isConfused = /(不懂|不會|不清楚|不知道|什麼意思|意思是什麼|什麼是|可以再講一次|沒概念|不懂耶|不了解|解釋|是什麼)/.test(mText);
              if (!isConfused) {
                phase = "practice";
                sentenceCount = 0;
              }
            } else if (phase === "practice") {
              const isStudyMode = ["光合作用", "熱力學", "抽象類別", "邊際效應"].some(w => misunderstoodWord.includes(w) || w.includes(misunderstoodWord));
              if (!isStudyMode) {
                // Life mode practice phase transitions directly to resolved once they submit their signature / pledge
                sentenceCount = 3;
                phase = "resolved";
              } else {
                const isStuck = /(想不出來|不知道|幫幫我|給我點靈感|造不出來|不會造|不會寫|例句)/.test(mText);
                if (!isStuck) {
                  const cleanMText = mText.replace(/[\s\p{P}]/gu, '');
                  const cleanWord = misunderstoodWord.replace(/[\s\p{P}]/gu, '');
                  const hasWord = cleanWord && cleanMText.includes(cleanWord);
                  if (hasWord) {
                    sentenceCount++;
                    if (sentenceCount >= 3) {
                      phase = "resolved";
                    }
                  }
                }
              }
            } else if (phase === "resolved") {
              if (mText.includes("退回") || mText.includes("重新造句") || mText.includes("再次造句") || mText.includes("重造")) {
                phase = "practice";
                sentenceCount = 0;
              } else if (mText.includes("重新") || mText.includes("開始") || mText.includes("下一個") || mText.includes("再一個") || mText.includes("排除")) {
                phase = "discovery";
                misunderstoodWord = "";
                sentenceCount = 0;
              }
            }
          }
        }
 
        // Determine mode based on misunderstoodWord
        if (misunderstoodWord) {
          const isStudy = ["光合作用", "熱力學", "抽象類別", "邊際效應"].some(w => misunderstoodWord.includes(w) || w.includes(misunderstoodWord));
          mode = isStudy ? "study" : "life";
        }

        // Evaluate the LATEST user message
        const latestInput = (messages[messages.length - 1]?.content || "").trim();
        let replyText = "";
        
        const localDefs: Record<string, string[]> = {
          "完美主義": ["事事追求毫無瑕疵，導致心理壓力過大，因害怕失敗而拖延或能量耗竭。"],
          "他人期待": ["過度在意別人的眼光、評價或要求，忽略了自己的真實需求與生活主控權。"],
          "自我懷疑": ["否定自己的價值，對自己的能力缺乏信心，在挑戰面前反覆猶豫甚至退縮。"],
          "界線模糊": ["無法明確拒絕不合理的要求，任由別人的情緒或生活侵蝕自己的時間與心靈。"],
          "感官超載": ["長時間高強度的工作或接收過多資訊，導致身心過度勞累、大腦疲憊卡頓。"],
          "光合作用": ["生命科學中葉綠體利用光能，將二氧化碳和水合成富能有機物（主要是葡萄糖）並釋放氧氣的過程。"],
          "熱力學": ["研究熱與其他形式能量（如機械能、電能、化學能）之間相互轉換規律與守恆的物理學分支。"],
          "抽象類別": ["物件導向程式設計中不能被直接實例化的類別，通常作為其他衍生類別的基礎範本，定義抽象方法與行為。"],
          "邊際效應": ["經濟學中每增加一單位的投入或消費，所能獲得的新增滿足感或產出效益的變動遞減法則。"]
        };

        const getDefinition = (word: string): string[] => {
          if (localDefs[word]) return localDefs[word];
          if (lifeWords.some(w => word.includes(w) || w.includes(word))) {
            return [`「${word}」是一種常見的內在身心和情感卡點，讓我們深入覺察並重獲自我掌控力。`];
          }
          return [`學科用語「${word}」之精準學理定義，代表特定系統或研究對象中的核心行為模式、概念或運作規律規程。`];
        };

        if (phase === "discovery") {
          let wordCandidate = "";
          const quoteMatch = latestInput.match(/[『「"']([^『「"'\s]{1,15})[』」"']/);
          if (quoteMatch) {
            wordCandidate = quoteMatch[1];
          } else if (latestInput.length >= 1 && latestInput.length <= 6 && !latestInput.includes("我") && !latestInput.includes("卡") && !latestInput.includes("累") && !latestInput.includes("懂")) {
            wordCandidate = latestInput;
          } else if (latestInput.includes("排除") || latestInput.includes("不懂") || latestInput.includes("什麼是") || latestInput.includes("卡點")) {
            const clean = latestInput.replace(/(我想清除|我不懂|什麼是|這個字|這個字詞|字|排除|卡點|根本原因)/g, "").trim();
            if (clean.length >= 1 && clean.length <= 15) {
              wordCandidate = clean;
            }
          }

          if (wordCandidate) {
            misunderstoodWord = wordCandidate;
            const isLife = lifeWords.some(w => misunderstoodWord.includes(w) || w.includes(misunderstoodWord));
            mode = isLife ? "life" : "study";
            phase = "definition";
            definitions = getDefinition(misunderstoodWord);

            if (mode === "study") {
              replyText = `『第一關：探索』字詞鎖定成功！📖 發現不解學名：『 ${misunderstoodWord} 』。\n\n字典剖析是：**${definitions[0]}**。\n\n請不要直接照抄，試著**用你自己的白話話語**簡短自述說一次你對它的理解！`;
              suggestions = ["這就是它的運作核心 💡", "簡單說就是能量與機制的傳遞 💡", "我想要再次聽解釋 📚"];
            } else {
              replyText = `『第一關：探索』字詞鎖定成功！🌱 鎖定生活卡點：『 ${misunderstoodWord} 』。\n\n心靈剖析是：**${definitions[0]}**。\n\n請試著**用你自己的生活感受與經驗**聊聊，它是如何悄悄限制或影響你的？`;
              suggestions = ["原來這就是我累的原因 🗝️", "我常忽略了自己的需求 🗝️", "我常會不自覺焦慮空轉 🗝️"];
            }
          } else {
            if (latestInput.includes("累") || latestInput.includes("疲") || latestInput.includes("昏睡") || latestInput.includes("提不起勁")) {
              replyText = "最近在學習或生活中感到疲累昏睡、提不起勁嗎？回想一下，在你這種沉重感湧現之前，有沒有哪個不解字或「感官超載」對你有影響？";
              suggestions = ["我想分析 完美主義 🗝️", "我想清理學科名詞 📖", "分析當前能量卡點 🧠"];
            } else if (latestInput.includes("空白") || latestInput.includes("焦慮") || latestInput.includes("緊張") || latestInput.includes("記不住")) {
              replyText = "大腦一片空白或突然無比焦慮，往往代表剛剛跳過了某個不理解的字詞、或是陷入了「自我懷疑」。你覺得需要先清理哪個部分？";
              suggestions = ["我想清理 邊際效應 📖", "我想排除 自我懷疑 🗝️", "我想釐清其他名詞 📚"];
            } else if (latestInput.includes("煩躁") || latestInput.includes("生氣") || latestInput.includes("排斥")) {
              replyText = "容易感到排斥或莫名煩躁，往往代表大腦的字詞理解出現了缺口、或是有些身心「界線模糊」。你覺得最符合目前的詞彙是什麼？";
              suggestions = ["清理特定學科詞彙 📖", "排除生活卡點：他人期待 🗝️", "我想點選其他單字"];
            } else {
              const hasLifeMatch = lifeWords.some(lw => latestInput.includes(lw));
              if (hasLifeMatch) {
                const foundWord = lifeWords.find(lw => latestInput.includes(lw))!;
                misunderstoodWord = foundWord;
                mode = "life";
                phase = "definition";
                definitions = getDefinition(misunderstoodWord);
                replyText = `『第一關：探索』字詞鎖定成功！🌱 鎖定生活卡點：『 ${misunderstoodWord} 』。\n\n心靈剖析是：**${definitions[0]}**。\n\n請試著**用你自己的生活感受與經驗**聊聊，它是如何悄悄限制或影響你的？`;
                suggestions = ["原來這就是我累的原因 🗝️", "我常常忽略了自己的需求 🗝️", "我常會不自覺焦慮空轉 🗝️"];
              } else {
                replyText = "回想一下，在你感到昏沉、排斥、大腦一空 or 提不起勁的前一刻，有沒有遇到什麼不解詞彙？或者需要排除完美主義、他人期待等生活卡點？";
                suggestions = ["排除生活完美主義 🗝️", "清理學術不解名詞 📖", "我想隨意聊聊 🧭"];
              }
            }
          }
        } else if (phase === "definition") {
          definitions = getDefinition(misunderstoodWord);
          const isConfused = /(不懂|不會|不清楚|不知道|什麼意思|意思是什麼|什麼是|可以再講一次|沒概念|不懂耶|不了解|解釋|是什麼)/.test(latestInput);
          if (isConfused) {
            if (mode === "study") {
              replyText = `別擔心！學術名詞初次接觸難免生硬。讓我用更白話的比喻解釋『 ${misunderstoodWord} 』：\n\n**${definitions[0]}**。\n\n試著想一想，你覺得如果把它用在你身邊的物品或常識上，代表什麼呢？`;
              suggestions = ["噢！大約理解了 💡", "原來是這個原理 💡", "可以給我一個生活比喻嗎"];
            } else {
              replyText = `別擔心！生活迷茫 or 卡關是正常的。讓我用更溫暖白話的方式再次為你剖析『 ${misunderstoodWord} 』：\n\n**${definitions[0]}**。\n\n再試著用你自己的感受想想，用你自己的話跟我聊聊它是怎麼發生在你身上的好嗎？`;
              suggestions = ["原來如此，了解了！", "這確實常讓我感到很大的壓力", "其實我懂了，可以排除它！"];
            }
          } else {
            // Pass to practice
            phase = "practice";
            sentenceCount = 0;
            if (mode === "study") {
              replyText = `『第二關理解覺察達標！』👏 很高興你用自己的話學會了這個定義！\n\n接下來，讓我們開始用『 ${misunderstoodWord} 』造出 3 個不同的句子，來徹底掌握與消化這個概念吧！\n\n請寫下你的第 1 個句子：（**重要：句子裡一定要實際包含「${misunderstoodWord}」這幾個字喔！**）`;
            } else {
              replyText = `『第二關理解覺察達標！』🌱 很高興你有了這層自我覺察！\n\n在生活窒礙的排除上，專業心理輔導更看重**認知重構 (Cognitive Reframing)** 與**意志實踐力 (Agency & Vow)** 的深度內省與自我承諾，而非繁瑣的打字造句。\n\n因此，系統已為你特別解鎖並開啟了專屬的 **【轉念行動承諾護照】** 儀式！\n\n請在下方查看我為你特別制定的 **3 張轉念承諾卡片**：\n1. **點擊卡片翻面**，對比並重構從「限制信念」到「希望信念」的認知！\n2. 點擊 **已共鳴內省** 深度吸收其微行動承諾。\n3. 調整 **實踐意志信心滑桿** 並進行 **親筆意願簽署**，即可啟動完全充能！`;
            }
            suggestions = ["我不知道怎麼寫 😰", "讓我再想想怎麼排除"];
          }
        } else if (phase === "practice") {
          definitions = getDefinition(misunderstoodWord);
          const isStuck = /(想不出來|不知道|幫幫我|給我點靈感|造不出來|不會造|不會寫|例句)/.test(latestInput);
          if (isStuck) {
            const localExamples: Record<string, string> = {
              "完美主義": "當我再次落入「完美主義」而遲遲不肯開始工作時，我要告訴自己『先求完成再求完美』來踏出第一步。",
              "他人期待": "為了不再受制於重壓，當「他人期待」過度侵蝕我時，我要溫和地表明自己的真實想法。",
              "自我懷疑": "我不再讓無理的「自我懷疑」束縛我前進，今天我要相信自己的努力 and 價值肯定能做到。",
              "界線模糊": "面對不合理的工作塞車，我要勇敢拒絕「界線模糊」的加班，留給自己充足 of 休息時間。",
              "感官超載": "當我感到「感官超載」時，會立刻關掉手機，給自己十分鐘靜靜呼吸，重拾活力。",
              "光合作用": "綠色植物通過「光合作用」製造出葡萄糖與我們呼吸所需的氧氣。",
              "熱力學": "冰箱利用「熱力學」中熱量傳遞規律將箱底的多餘熱量排出。",
              "抽象類別": "在開發遊戲時，我們設計一個「抽象類別」來當作所有怪物的基礎樣版。",
              "邊際效應": "當我已經喝了三杯可樂後，喝第四杯「邊際效應」就會顯著遞減不那麼好喝了。"
            };

            const w = misunderstoodWord || "這個卡點";
            const customizedExample = localExamples[w]
              ? `💡 範例：『${localExamples[w]}』`
              : `💡 範例一：『當我再次感受到「**${w}**」時，我要深呼吸，並告訴自己我可以優雅排除。』\n💡 範例二：『我們在生活中要學會覺察「**${w}**」，並用積極的轉念和具體行動重奪生活主控權。』`;

            replyText = `別擔心！神隊友為你提供關於「${w}」的引導靈感：\n\n${customizedExample}\n\n這是不是很簡單呢？現在換你試著自己寫一個，要確實包含核心詞『 ${w} 』喔！💪`;
            suggestions = ["我不知道怎麼發想 😰", "讓我再試著寫寫看"];
          } else {
            if (mode === "study") {
              // Sentence check for academic learnings
              const cleanMText = latestInput.replace(/[\s\p{P}]/gu, '');
              const cleanWord = misunderstoodWord.replace(/[\s\p{P}]/gu, '');
              const hasWord = cleanWord && cleanMText.includes(cleanWord);

              if (hasWord) {
                sentenceCount++;
                if (sentenceCount === 1) {
                  replyText = `『造句進度：1 / 3 句！』寫得十分流暢，理解更明晰！👏\n\n請繼續用關鍵字『 ${misunderstoodWord} 』寫下第 2 個不同的句子，使理解更深一層！`;
                  suggestions = ["我需要一些靈感 😰"];
                } else if (sentenceCount === 2) {
                  replyText = `『造句進度：2 / 3 句！』語意無懈可擊，非常優質！💡\n\n最後一鼓作氣，用『 ${misunderstoodWord} 』寫下第 3 個生動的句子吧！`;
                  suggestions = ["我想不出了 😰"];
                } else {
                  phase = "resolved";
                  replyText = `『造句 3 / 3 達標！恭喜你！學術單字清理全數成功！』🎉\n\n現在大腦是不是感到無比明澄、神清氣爽，字意全然被打通了呢？`;
                  suggestions = ["神清氣爽！全然讀懂了！🚀", "頭腦好明澈，回到學習！📖", "退回再次重演排除 🔄"];
                }
              } else {
                replyText = `寫得很棒！但【檢驗未通過：句子裡忘記包含學科單字『 ${misunderstoodWord} 』喔！】\n\n為了對此字元融會貫通，請務必把『 ${misunderstoodWord} 』完整包含進句子中，再造句一次好嗎？💪`;
                suggestions = ["看範例引難 💡", "那我重新撰寫包含卡點"];
              }
            } else {
              // Life mode: completed the custom Reframing Commitment Card UI
              phase = "resolved";
              sentenceCount = 3;

              const confidenceMatch = latestInput.match(/信心指數高達\s*(\d+)%/) || latestInput.match(/(\d+)%/);
              const confidence = confidenceMatch ? confidenceMatch[1] : "85";

              const vowMatch = latestInput.match(/承諾誓言是：『(.*?)』/) || latestInput.match(/信念是：『(.*?)』/);
              const extraVow = vowMatch ? vowMatch[1] : "溫柔接納自我的不足，在細微行動中活出真實的掌控力。";

              replyText = `『排除達標：3 / 3 轉念與行動簽置完成！』🎉✨\n\n看到你對新的生活觀念給足了高達 **${confidence}%** 的行動信心，輔導員為你感到無比驕傲！\n\n你簽置的承諾誓言：『**${extraVow}**』，充滿著前行的力量。這份信念早已將你的卡點窒礙徹底排除吹散！\n\n現在你是否感到心靈無比輕鬆，內在能量已全新注滿、全然復元了呢？🧭✨`;
              suggestions = ["能量滿分！超棒！🌟", "心靈清爽，完全充能完畢！🚀", "退回再次重演排除 🔄"];
            }
          }
        } else if (phase === "resolved") {
          if (latestInput.includes("退回") || latestInput.includes("重新造句") || latestInput.includes("再次造句") || latestInput.includes("重造") || latestInput.includes("重新簽署") || latestInput.includes("轉念關卡")) {
            phase = "practice";
            sentenceCount = 0;
            if (mode === "study") {
              replyText = `好的，非常欣賞你精益求精的專注態度！👏\n\n那我們退回到【行動排除與造句】關卡，再次運用『 ${misunderstoodWord} 』完成第 1 個造句，來穩固與雙重檢查你的清新狀態！\n\n請寫下第一個句子：`;
              suggestions = ["我不知道如何寫 😰", "讓我再次嘗試"];
            } else {
              replyText = `沒問題！非常高興看到你如此關注並重視自己的心靈狀態！👏\n\n那我們就退回【行動排除與健康轉念】關卡，重新為你開啟【行動承諾護照】儀式。請在下方再次翻閱 3 張轉念卡片、完成已共鳴內化、調整您的實踐意志信心並簽署誓言，來雙重啟動你的充能原力！`;
              suggestions = ["好的，我來翻閱與簽約 🤝", "我想回去主畫面"];
            }
          } else if (latestInput.includes("重新") || latestInput.includes("開始") || latestInput.includes("下一個") || latestInput.includes("再一個") || latestInput.includes("排除")) {
            phase = "discovery";
            misunderstoodWord = "";
            definitions = [];
            sentenceCount = 0;
            replyText = `歡迎回來！讓我們開始探索人生中的下一個卡點。你最近遇到了什麼情況、讓你開始覺得有些沉重或提不起勁呢？`;
            suggestions = ["我想排除「完美主義」 🗝️", "我想排除「自我懷疑」 🗝️", "最近常覺得很心累 🥱"];
          } else {
            if (mode === "study") {
              replyText = `恭喜你！『 ${misunderstoodWord} 』已被征服，思緒重新打通。現在，帶著這股高度清晰的高效專注，高歌慢進地重返學習吧！📚🚀`;
              suggestions = ["謝謝神隊友！ 🧭", "我想清理下個單字 📖", "退回重新排除 🔄"];
            } else {
              replyText = `讚極了！心靈的濃霧已然吹散，身心滿血充能！開心地重返生活，享受屬於你的生活主控力吧！若未來再遇到摩擦，隨時來找我喔！💖`;
              suggestions = ["謝謝神隊友，全力出發！🚀", "我想排除下一個生活限制 🧠", "退回再次重演排除 🔄"];
            }
          }
        }

        const isStudyWord = ["光合作用", "熱力學", "抽象類別", "邊際效應"].some(w => misunderstoodWord.includes(w) || w.includes(misunderstoodWord));
        const latestMode = isStudyWord ? "study" : "life";

        return res.json({
          reply: replyText,
          mode: latestMode,
          phase,
          misunderstoodWord,
          definitions,
          sentenceCount,
          suggestions,
          isFallback: true
        });
      } catch (innerErr) {
        console.error("Inner Fallback Engine Error:", innerErr);
        res.status(500).json({
          error: "神隊友正在深呼吸，請再試一次！",
          reply: "不好意思，我的學習迴路剛才稍微開了一下小差，不過我現在重新準備好了！你可以再對我說一次嗎？",
          mode: "life",
          phase: "discovery",
          misunderstoodWord: "",
          definitions: [],
          sentenceCount: 0,
          suggestions: ["我們重新開始吧", "讓我再試一次"]
        });
      }
    } catch (outerErr) {
      console.error("Outer Router Level Error:", outerErr);
      res.status(500).json({ error: "神隊友連線不穩定，請重新整理頁面試試看！" });
    }
  });

  // Serve Frontend with Vite Middleware in Development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
