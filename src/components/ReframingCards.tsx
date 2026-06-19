import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Lock, 
  Unlock, 
  Heart,
  UserCheck,
  Award
} from "lucide-react";

interface ReframingCardsProps {
  misunderstoodWord: string;
  onComplete: (vow: string, confidence: number, signature: string) => void;
}

export interface CardData {
  front: string;
  back: string;
  action: string;
}

// Dynamic vow generator tailored to categories or custom words
export const getCategoryVow = (word: string): string => {
  const cleanWord = (word || "").trim().toLowerCase();
  
  const isPerfection = ["完美主義", "完美", "犯錯", "失敗", "瑕疵", "最好", "毫無瑕疵", "不完美", "零失誤"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isExpectations = ["他人期待", "期待", "他人", "討好", "滿足", "眼光", "評價", "認同", "拒絕", "迎合", "迎合他人"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isSelfDoubt = ["自我懷疑", "懷疑", "沒自信", "不配", "平庸", "我不夠好", "自信", "能力不足", "冒牌者", "自卑"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isBoundaries = ["界線模糊", "界線", "底線", "隨時待命", "大包大攬", "承擔情緒", "情緒泥淖", "人際", "界限"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isOverload = ["感官超載", "超載", "高強度", "爆肝", "大腦昏沉", "疲憊", "放空", "昏昏沉沉", "緊繃", "疲倦", "筋疲力竭", "大腦一片空白"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isFOMOAnxiety = ["錯失", "錯失恐懼", "恐懼", "焦慮", "fomo", "邊緣", "錯過", "落後", "跟不上", "恐慌", "罪惡感", "焦躁"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isProcrastination = ["拖延", "拖延症", "不想做", "逃避", "沒動力", "提不起勁", "精神耗盡", "提不起勁"].some(k => cleanWord.includes(k) || k.includes(cleanWord));

  if (isPerfection) return "接納不完美，容許粗糙的起步，並在實踐與修正中體驗生命的真實雕琢";
  if (isExpectations) return "溫柔且堅定地為自己的感受說好，不再迎合討好他人，守護自身生命的主權";
  if (isSelfDoubt) return "全然信任自身累積的才學與汗水，將犯錯視為進化契機，大膽在挑戰中前行";
  if (isBoundaries) return "課題分離，溫解非我責任，守護不受干擾的個人空間與身心安寧";
  if (isOverload) return "清空多餘雜訊噪音，適時歸零暫停以修復神經，重拾內在強韌定力與效率";
  if (isFOMOAnxiety) return "不畏橫向對比，放平呼吸，錨定自身時區，在寧靜自守中發掘靈魂的芬芳";
  if (isProcrastination) return "化完美想望為五分鐘微小起動點，告別慢性中毒性恐慌，在韻律中持續灌注";

  return `打破「${word}」對心靈的束縛執念，溫柔接納自我的不足，在細微行動中重新奪回生活主控權`;
};

// Core localized datasets matching the emotional blocks
export const getReframingCards = (word: string): CardData[] => {
  const cleanWord = (word || "").trim().toLowerCase();

  // Map keywords to specific categories using robust substring matching
  const isPerfection = ["完美主義", "完美", "犯錯", "失敗", "瑕疵", "最好", "毫無瑕疵", "不完美", "零失誤"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isExpectations = ["他人期待", "期待", "他人", "討好", "滿足", "眼光", "評價", "認同", "拒絕", "迎合", "迎合他人"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isSelfDoubt = ["自我懷疑", "懷疑", "沒自信", "不配", "平庸", "我不夠好", "自信", "能力不足", "冒牌者", "自卑"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isBoundaries = ["界線模糊", "界線", "底線", "隨時待命", "大包大攬", "承擔情緒", "情緒泥淖", "人際", "界限"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isOverload = ["感官超載", "超載", "高強度", "爆肝", "大腦昏沉", "疲憊", "放空", "昏昏沉沉", "緊繃", "疲倦", "筋疲力竭", "大腦一片空白"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isFOMOAnxiety = ["錯失", "錯失恐懼", "恐懼", "焦慮", "fomo", "邊緣", "錯過", "落後", "跟不上", "恐慌", "罪惡感", "焦躁"].some(k => cleanWord.includes(k) || k.includes(cleanWord));
  const isProcrastination = ["拖延", "拖延症", "不想做", "逃避", "沒動力", "提不起勁", "精神耗盡", "提不起勁"].some(k => cleanWord.includes(k) || k.includes(cleanWord));

  if (isPerfection) {
    return [
      {
        front: "如果不能做到最好，那開始做就毫無意義，我極度害怕失敗的眼光。",
        back: "「完成勝於完美」！容許粗糙而勇敢的起步，才能擁有進步並雕琢的可能。",
        action: "在今日的日常任務推進剛達 70% 時，主動喊停，並為自己的開局與執行力熱烈喝采。"
      },
      {
        front: "每個細節都必須毫無瑕疵，任何微小失誤與缺憾都代表我不夠優秀、是個失敗者。",
        back: "瑕疵是生命的呼吸留空，也是學習的最優教具。我的個人價值絕對不等同於我的產出物。",
        action: "在今日的時間規劃表裏故意留下 30 分鐘無目標的留白，徹底不逼迫自己做任何事。"
      },
      {
        front: "我不敢把未臻完美的草案交出去，那會暴露我內在的匱乏與能力不足。",
        back: "提早對接反饋是高層次的共創藝術。外界的客觀意見是滋養原料，而非評判我的審判書。",
        action: "主動挑選一件未完成的草圖或想法，與一位信任的夥伴分享，大方徵求一個簡單建議。"
      }
    ];
  }

  if (isExpectations) {
    return [
      {
        front: "我必須竭盡所能滿足身邊所有人的渴望與要求，只要拒絕他們，我就會深陷內疚。",
        back: "當我向別人說『不』的時候，其實我是在溫柔而負責地對自己說『好』。我無須為他人課題買單。",
        action: "今天練習溫和、有禮但無比堅定地拒絕一次他人不合理的微小索求或時間侵蝕。"
      },
      {
        front: "如果我不在人前表現得無比體貼、善解人意，別人就不會接納或由衷喜愛真實的我。",
        back: "最真實、不假修飾的我就擁有被愛的至高資格。用無限討好換來的，只有疲憊與關係的不對等。",
        action: "遵循今日自己內在的真實意願，獨自挑選一頓午餐或行程，完全不詢問亦不在意他人看法。"
      },
      {
        front: "別人一聲嘆息、一頓批評或失望的語氣，就全盤否定了我的為人與能力。",
        back: "他人情緒起伏是他們生命自修的課業；我自身的平和才是我可控的選擇。課題分離，重拾自由。",
        action: "遭遇負面投射時，深深吸氣三次，默默在心底說：『這是你的期待與情緒，我溫柔地還給你。』"
      }
    ];
  }

  if (isSelfDoubt) {
    return [
      {
        front: "我得到的成就全都只是運氣好、蝦貓碰到死耗子。這群人只要深入看，很快會拆穿我的平庸。",
        back: "我的付出、汗水與才華實實在在！偶遇挫折，只是人生進化的磨課項目，絕非否定我價值的依據。",
        action: "回想並在腦海中或紙上，清晰寫下近一年內，自己靠著毅力與主動努力達成的 3 個進步成就。"
      },
      {
        front: "為什麼別人看起來總是那麼自信、遊刃有餘、神采奕奕，而我內部卻充滿手足無措的慌張？",
        back: "別人也有焦慮困局，人人都在後台艱難打磨，只在舞台上亮麗返照。不用自己的後台去比旁人的舞台。",
        action: "今晚洗漱後，看著鏡子裡的雙眼，由衷地、大聲地自我宣告一次：『你真的已經做得夠好了！』"
      },
      {
        front: "只要在人前做錯過一次，就坐實了我根本一無是處，不配接下更有挑戰的大任。",
        back: "「每一次犯錯都是一次高敏的指路牌」。跌倒在所難免，在修正中快速進化的我更顯堅韌卓越。",
        action: "將近期一個失誤，重新定義為『學費』，大筆寫下這筆學費換來了哪一個最珍貴的核心認知。"
      }
    ];
  }

  if (isBoundaries) {
    return [
      {
        front: "半夜或休息時刻也要隨時待命回覆各種訊息、承接需求，這才是我盡責有擔當的明證。",
        back: "充分且完全斷聯的身心休息是卓越創造力的基石。守護安全且不受打擾的個人時間是我天賦的權利。",
        action: "今晚 8 點以後，主動將社群與通訊軟體調往『請勿打擾』或靜音模式，展開兩小時極致獨處。"
      },
      {
        front: "如果不主動出手去幫忙多扛一點別人的心理壓力或工作，我就是自私自利而且太冷血。",
        back: "每個人最大的功德是為自己的因果與生命課題完全負責。過度大包大攬，反倒剝奪了對方進化成熟的高度。",
        action: "挑選那條一直被自己暗暗包攬的朋友或組員事務，這一次微笑並大方地退還回給正主操作。"
      },
      {
        front: "只要身邊的人心情低落或氣氛沉悶，我就背負了極大的責任去逗樂大家、扭轉負面能量。",
        back: "我完全不必為他人內部的天氣預報負責。天地寬廣，允許在人各下起各人的細雨，溫柔接納無力的當下，保護自己的安定狀態。",
        action: "遇到身邊不好的氣氛時，練習維持 10 分鐘冷靜中立的旁觀心態，不做主動破冰與逗樂的義務自虐。"
      }
    ];
  }

  if (isOverload) {
    return [
      {
        front: "一旦我主動中斷或停止手頭紛繁的資訊和任務，我就會面臨極度的焦慮與巨大的失控感。",
        back: "多工與狂奔是低成效內耗的幫兇。主動清空多餘承載，在大腦深沈的極簡放空中，才能找回強韌定力。",
        action: "現在合上一半以上的瀏覽器分頁，背脊挺直，完成 5 次悠長而專注的深吸慢呼深呼吸。"
      },
      {
        front: "頭腦已經完全打不開且陷入昏沈混沌，我必須繼續硬撐逼迫產出，才算是一個前進奮鬥的人。",
        back: "無效的緊繃是在透支生命。在疲憊時果斷喊停並進行靈性修復，是最高維度的自我照護和效率加持。",
        action: "立刻起立離開座位，喝下一杯溫水，將掌心撫摩發熱後，輕柔揉按迎香穴與風池穴 1 分鐘。"
      },
      {
        front: "我必須在今天把未來一週甚至一月的所有繁複規劃在大腦中全部跑完，否則我就無法安心入睡。",
        back: "未來是由無數個精確過好、平靜淡然的當下折疊成的。多慮無益，此時此刻我唯有放權身心、坦然安歇。",
        action: "在乾淨紙上大筆寫下：『未來的困局是我未來的智慧會去解決的問題，現在的我可以完全放鬆睡眠。』"
      }
    ];
  }

  if (isFOMOAnxiety) {
    return [
      {
        front: "看著身邊同齡人都在瘋狂前行、曬進度與亮麗成績，相形之下原地打轉的自己簡直像個垃圾。",
        back: "玫瑰與松柏有各具傲骨的生長花期。對方是在他們的時區奔馳，我是我生命的唯一步點，不必橫向對比。",
        action: "停止漫無目的地瀏覽他人的動態，拿出一張紙，鄭重寫下今天自我沉澱並成長的 3 個精確細節。"
      },
      {
        front: "如果今天我錯過了這個分享、研討、派對、聚餐或課程，我一定會被時代全盤拋棄、永遠落入邊緣。",
        back: "最高層級的聚居與共創，來自於我自身靈魂厚度的沉澱。寧靜自守勝過盲從合群，專注自我在所難免。",
        action: "勇敢回絕今日一個無關痛癢、只因害怕沒餐餐跟上而敷衍答應的應酬或會議，把寧靜還給自己。"
      },
      {
        front: "我每天陷入在繁多的網路通訊群組與熱門資訊搜羅，深怕漏掉任何一則資訊而充滿被邊緣化的憂慮。",
        back: "浩瀚資訊中 99% 只是能量雜訊。將心神錨定在真正能帶給自己深刻安寧和成長的本期方向才是重中之重。",
        action: "今晚睡前一小時，不看社群軟體、不看即時新聞，純粹享受洗漱、撫摸皮膚或閉眼傾聽周圍環境。"
      }
    ];
  }

  if (isProcrastination) {
    return [
      {
        front: "面對這項無比沈重的宏大事務，我的頭腦理不清、完全沒有開局頭緒，只本能感到逃避、想玩手機。",
        back: "拖延是大腦在預防完美折騰的自救機制。不要試圖一次搬起大山，化大任務為最白痴、最輕鬆的起步。",
        action: "把大任務拆解成一個『只需要花 5 分鐘甚至 3 分鐘便允許停下』的極微小碎片，不再猶豫，立刻起動！"
      },
      {
        front: "今天我的身體和精神狀況都不是最頂峰或最順手的狀態，我想等明日元氣爆滿、福星高照時才下筆前進。",
        back: "起跑在於意願，優質在於中途！粗糙而跌跌撞撞的開拓，比完美的空想與乾等，其成果高出十萬八千里。",
        action: "打破對完美外部環境或自身好狀態的盲崇，現在就隨便找個糟糕紙條潦草草擬一頁，完成起草第一步。"
      },
      {
        front: "反正現在距離截止日還有段時間，我應該去消滅一堆無關的小雜事，把大核心拖到最後一秒靠恐慌去爆發靈感。",
        back: "由恐慌驚嚇分泌的激素是一場無端的身心慢性中毒。用溫和、有韻律的持續灌注才能雕刻出歷久彌新的極致作品。",
        action: "不再尋找捷徑和自我麻醉，主動拿出一杯清茶，在沒有任何催迫的此時此刻，享受 15 分鐘冷靜拆局。"
      }
    ];
  }

  // Default template tailored dynamically if not matching any of the above categories - deeply therapeutic fallback !
  return [
    {
      front: `我覺得「${word}」像一團沉重的迷霧緊緊包圍我，讓我隨時隨地感到排遣不開、壓力沉重且充滿無力感。`,
      back: `「${word}」不曾由外定性我的價值，它只是此時身心疲憊的求救警報。當我向內審視，我也正獲得重塑生命節奏的智慧。`,
      action: `為「${word}」情緒做三次悠長的鼻吸嘴吐，在吐氣中學會向當前的緊繃與完美姿態妥協放手。`
    },
    {
      front: `我常常陷入害怕面對與「${word}」有關的不順遂，總是習慣苛責自己做得不夠，導致陷入自我內耗的死胡同。`,
      back: `波折與跌宕是每個人豐富厚度的極品養分。有幸承受生命風雨的洗禮，也代表我有無比寬和的力量能笑著重新啟步。`,
      action: "站在鏡子前，挺胸並由衷向自己點頭微笑，安靜體會雙腳穩穩踩紮在大地之上的力量與不屈能動性。"
    },
    {
      front: `我深怕一旦拋開對「${word}」的慣常執念與完美標準，生活就會全盤陷入失控或失去被愛和認可的價值安全感。`,
      back: `生命之美在於它的不確定性與多元姿態。我不必活成任何特定劇本的配角，我是自己這片寬廣原野的自由旅人。`,
      action: "在乾淨紙上，畫出一個代表自己當前內在宇宙的小點，告訴自己這顆心靈點不受凡塵任何概念羈絆。"
    }
  ];
};

export default function ReframingCards({ misunderstoodWord, onComplete }: ReframingCardsProps) {
  // Get dynamic card set computed on every run. Resets when prop change.
  const cards = getReframingCards(misunderstoodWord);

  // States for active card viewport, flips, internalization checks, confidence & signature
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean[]>([false, false, false]);
  const [internalized, setInternalized] = useState<boolean[]>([false, false, false]);
  const [confidence, setConfidence] = useState<number>(85);
  const [nameSignature, setNameSignature] = useState<string>("");

  // Reset states when misunderstoodWord changes to avoid showing cached or fixed card states from prior rounds
  useEffect(() => {
    setCurrentIndex(0);
    setFlipped([false, false, false]);
    setInternalized([false, false, false]);
    setConfidence(85);
    setNameSignature("");
  }, [misunderstoodWord]);

  // Navigations
  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const toggleFlip = (idx: number) => {
    const nextFlipped = [...flipped];
    nextFlipped[idx] = !nextFlipped[idx];
    setFlipped(nextFlipped);
  };

  const toggleInternalized = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid double flipping the card when clicking the internalization button
    const nextInter = [...internalized];
    nextInter[idx] = !nextInter[idx];
    setInternalized(nextInter);
  };

  const getConfidenceLevelText = (val: number) => {
    if (val <= 65) return "🌱 意願覺察中，承諾在日常跨出一小步";
    if (val <= 80) return "⚡ 量能匯聚完畢，奪回自我主控力，積極實踐";
    if (val <= 95) return "🔥 鬥志無比清明，深信轉念並能粉碎生活限制";
    return "🌟 意志高度融會，承諾誓言已與宇宙本心深沉共鳴！";
  };

  const isAllApproved = flipped.every(f => f) && internalized.every(i => i) && nameSignature.trim().length > 0;

  const handleSubmit = () => {
    if (!isAllApproved) return;
    
    // Create professional formatted commitment message to resolve phase
    const personalVow = nameSignature.trim();
    const dynamicVow = getCategoryVow(misunderstoodWord);
    const finalVow = `『轉念實踐契約』立約人：【${personalVow}】。我承諾以全新能量迎擊「${misunderstoodWord}」之挑戰，承諾誓言是：『${dynamicVow}』`;
    onComplete(finalVow, confidence, personalVow);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className="bg-indigo-950/95 text-slate-100 rounded-3xl p-5 border border-indigo-550/40 shadow-2xl relative overflow-hidden font-sans backdrop-blur-md"
    >
      {/* Background radial soft light to look highly premium */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-20 -translate-y-20"></div>
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none translate-x-20 translate-y-20"></div>

      {/* Header and indicator bar - giving priority space for misunderstoodWord per instruction, with '已內化' metrics removed */}
      <div className="flex items-center justify-between border-b border-indigo-800/40 pb-3 mb-4 shrink-0 px-1 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="p-1 px-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-black tracking-widest border border-amber-500/20 animate-pulse flex items-center gap-1.5 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
            <Award className="w-3.5 h-3.5" />
            轉念承諾護照
          </div>
          {/* Unaltered and un-truncated full word printed gracefully */}
          <span className="text-xs font-bold text-slate-300 truncate" title={`『 ${misunderstoodWord} 』專屬排除儀式`}>
            『 {misunderstoodWord} 』專屬排除儀式
          </span>
        </div>
      </div>

      {/* Slideable CARDS Deck */}
      <div className="relative h-64 select-none mb-4 flex items-center justify-center w-full">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 120, scale: 0.95, rotateY: 0 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
            exit={{ opacity: 0, x: -120, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="w-[84%] md:w-[88%] h-full perspective-1000 cursor-pointer"
            onClick={() => toggleFlip(currentIndex)}
          >
            <motion.div 
              className={`w-full h-full relative preserve-3d duration-700 transition-transform ${
                flipped[currentIndex] ? "rotate-y-180" : ""
              }`}
            >
              {/* CARD FRONT SIDE (Limiting Belief) */}
              <div 
                className={`absolute inset-0 w-full h-full backface-hidden rounded-2xl border-2 p-4 flex flex-col justify-between ${
                  internalized[currentIndex]
                    ? "bg-slate-900/90 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                    : "bg-slate-900/70 border-slate-700/60"
                }`}
              >
                <div className="flex items-center justify-between border-b border-indigo-950 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-[10px] text-indigo-300 tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-indigo-400" />
                    限制性信念 • CARD {currentIndex + 1} / 3
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">觸摸卡片翻轉</span>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center py-4 px-2 text-center">
                  <span className="text-[10px] text-zinc-500 tracking-widest block uppercase mb-1">內在限制聲音</span>
                  <p className="text-[13px] md:text-sm font-bold text-slate-200 leading-relaxed max-w-[280px]">
                    「{cards[currentIndex]?.front}」
                  </p>
                </div>

                <div className="pt-2 border-t border-indigo-950 flex justify-center">
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700 hover:bg-slate-700 transition animate-pulse-soft flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    點擊翻面，重構此認知
                  </span>
                </div>
              </div>

              {/* CARD BACK SIDE (Reframed State & Commitment) */}
              <div 
                className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl border-2 p-4 flex flex-col justify-between ${
                  internalized[currentIndex]
                    ? "bg-gradient-to-b from-teal-950/90 to-emerald-950/90 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    : "bg-gradient-to-b from-indigo-950/90 to-slate-900/90 border-indigo-500/40"
                }`}
              >
                <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
                  <div className="flex items-center gap-1.5 font-black text-[10px] text-emerald-400 tracking-wider">
                    <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    建設性轉念 • REFRAMED
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">CARD {currentIndex + 1}/3</span>
                </div>

                {/* Reframed Content */}
                <div className="flex-1 flex flex-col justify-center py-2 px-1">
                  <div className="mb-2">
                    <span className="text-[9px] text-emerald-400 font-bold block tracking-wider uppercase">✨ 認知重構</span>
                    <p className="text-[12.5px] font-black text-white leading-relaxed">
                      {cards[currentIndex]?.back}
                    </p>
                  </div>

                  <div className="bg-emerald-950/40 border border-teal-900/50 p-2 rounded-xl">
                    <span className="text-[9px] text-amber-400 font-bold block tracking-wider uppercase">🌱 內化微行動承諾</span>
                    <p className="text-[10.5px] text-slate-200 leading-tight">
                      {cards[currentIndex]?.action}
                    </p>
                  </div>
                </div>

                {/* Interactive Resonance Checklist */}
                <div className="pt-2 border-t border-indigo-900/40 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-mono">再次點擊可翻回</span>
                  <button
                    onClick={(e) => toggleInternalized(currentIndex, e)}
                    className={`p-1.5 px-3 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                      internalized[currentIndex]
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/50"
                        : "bg-indigo-900/60 border border-indigo-600/30 text-indigo-200 hover:bg-indigo-800 animate-pulse-soft"
                    }`}
                  >
                    {internalized[currentIndex] ? (
                      <>
                        <Check className="w-3 h-3" />
                        已共鳴內省
                      </>
                    ) : (
                      <>
                        <Heart className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        點擊內化承諾
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Interactive slide navigation side buttons */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          disabled={currentIndex === 0}
          className="absolute left-0.5 md:left-1 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-900/90 border border-slate-700/85 flex items-center justify-center text-slate-200 shadow-lg shadow-indigo-950/40 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 active:scale-90 transition-all disabled:opacity-10 disabled:pointer-events-none cursor-pointer"
          title="上一張卡片"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          disabled={currentIndex === cards.length - 1}
          className="absolute right-0.5 md:right-1 z-20 w-9 h-9 md:w-10 md:h-10 rounded-full bg-slate-900/90 border border-slate-700/85 flex items-center justify-center text-slate-200 shadow-lg shadow-indigo-950/40 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 active:scale-90 transition-all disabled:opacity-10 disabled:pointer-events-none cursor-pointer"
          title="下一張卡片"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Swipeable page dots indicators */}
      <div className="flex justify-center gap-2 mb-4 shrink-0 select-none">
        {cards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentIndex === idx 
                ? "w-6 bg-amber-400" 
                : internalized[idx] 
                ? "w-2.5 bg-emerald-500" 
                : "w-1.5 bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Professional Reflection / Slider Verification Controls */}
      <AnimatePresence>
        {flipped.every(f => f) && internalized.every(i => i) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4 border-t border-indigo-800/40 pt-4"
          >
            {/* 1. Confidence Slider */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  誠摯踐行意願 / 信心指數滑桿
                </span>
                <span className="font-mono text-amber-400 font-extrabold">{confidence}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-indigo-900 rounded-lg outline-none"
              />
              <p className="text-[10px] text-emerald-400 font-extrabold mt-1 tracking-wide leading-tight">
                {getConfidenceLevelText(confidence)}
              </p>
            </div>

            {/* 2. Formal Vow Signature Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                誓言意志親筆署名 (請簽署您的姓名 or 別稱)
              </label>
              <input
                type="text"
                placeholder="寫下你的簽名，例如：『 渴望解鎖大腦的自己 』 or 本名"
                value={nameSignature}
                onChange={(e) => setNameSignature(e.target.value)}
                className="w-full bg-slate-900/90 border border-indigo-700/50 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-450 transition"
              />
            </div>

            {/* Submit Vow Trigger */}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              className={`w-full py-3 rounded-2xl font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-xl transition-all duration-300 ${
                isAllApproved
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-950/40 cursor-pointer"
                  : "bg-slate-800 text-slate-500 border border-slate-700/40 cursor-not-allowed"
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              簽署聖潔轉念誓約，啟動完全充能！
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Missing Step Guide Indicator */}
      {(!flipped.every(f => f) || !internalized.every(i => i) || nameSignature.trim().length === 0) && (
        <div className="mt-2.5 p-2 bg-slate-900/30 border border-indigo-900/30 rounded-xl text-[10px] text-indigo-300 flex items-start gap-1 p-3 leading-normal">
          <span className="text-amber-400 animate-bounce mt-0.5 font-bold">⚠️ 進度提示：</span>
          <div className="flex-1">
            請向左/向右滑動所有卡片：
            <ul className="list-disc pl-3 text-slate-400 mt-1 space-y-0.5">
              <li>確保 <span className="font-extrabold text-indigo-300">3 張卡片</span>皆已點擊翻面 ({flipped.filter(Boolean).length}/3)</li>
              <li>在背面點擊 <span className="font-extrabold text-emerald-400">已共鳴內省</span> 深度消化 ({internalized.filter(Boolean).length}/3)</li>
              <li>翻完後在底部填寫您的<span className="font-bold text-slate-300">署名</span>，即可啟動神聖轉念儀式！</li>
            </ul>
          </div>
        </div>
      )}
    </motion.div>
  );
}
