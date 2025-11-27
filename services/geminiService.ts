import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Enemy } from "../types";

// Initialize Gemini
// NOTE: API Key is expected to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = "gemini-2.5-flash";

export const generateStoryIntro = async (playerName: string, language: 'en' | 'ko'): Promise<string> => {
  try {
    const langPrompt = language === 'ko' ? "Write in Korean." : "Write in English.";
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Write a short, immersive 3-paragraph introduction for a text-based RPG. 
      The protagonist, named "${playerName}", is an ordinary person suddenly summoned to a fantasy world by a desperate goddess.
      The world is on the brink of destruction by the Demon King.
      The tone should be serious but adventurous. Do not use markdown formatting like **bold**.
      ${langPrompt}`,
    });
    return response.text || (language === 'ko' ? "낯선 세계에서 눈을 떴습니다..." : "You wake up in a strange new world...");
  } catch (error) {
    console.error("Gemini Error:", error);
    return language === 'ko' 
      ? `${playerName}님, 환영합니다. 위기에 처한 세계로 소환되셨습니다. 마왕을 물리치고 집으로 돌아가세요.`
      : `Welcome, ${playerName}. You have been summoned to a world in peril. Defeat the Demon King to return home.`;
  }
};

export const generateEndingStory = async (playerName: string, victory: boolean, language: 'en' | 'ko'): Promise<string> => {
  try {
    const langPrompt = language === 'ko' ? "Write in Korean." : "Write in English.";
    const prompt = victory 
      ? `Write a triumphant ending for the hero "${playerName}" who has defeated the Demon King. They are thanked by the kingdom and a portal opens to return them to their original world. 2 paragraphs. ${langPrompt}`
      : `Write a tragic ending for the hero "${playerName}" who fell in battle against the dark forces. The world is plunged into darkness. 1 paragraph. ${langPrompt}`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || (victory ? (language === 'ko' ? "승리했습니다!" : "You won!") : (language === 'ko' ? "사망했습니다." : "You died."));
  } catch (error) {
    console.error("Gemini Error:", error);
    return victory 
      ? (language === 'ko' ? "마왕을 물리치고 원래 세계로 돌아갔습니다!" : "You defeated the Demon King and returned home!") 
      : (language === 'ko' ? "여정은 여기서 끝이 났습니다." : "Your journey ends here.");
  }
};

// Helper to guess emoji based on name if Gemini fails or for fallback
export const getMonsterEmoji = (name: string, isBoss: boolean): string => {
  const n = name.toLowerCase().replace(/\s/g, '');
  if (isBoss) return "👿";
  // Korean checks
  if (n.includes("슬라임") || n.includes("slime") || n.includes("blob")) return "💧";
  if (n.includes("고블린") || n.includes("오크") || n.includes("goblin") || n.includes("orc")) return "👺";
  if (n.includes("늑대") || n.includes("울프") || n.includes("wolf") || n.includes("dog")) return "🐺";
  if (n.includes("드래곤") || n.includes("용") || n.includes("dragon") || n.includes("drake")) return "🐉";
  if (n.includes("해골") || n.includes("스켈레톤") || n.includes("skeleton") || n.includes("bone")) return "💀";
  if (n.includes("유령") || n.includes("귀신") || n.includes("ghost") || n.includes("spirit")) return "👻";
  if (n.includes("거미") || n.includes("spider")) return "🕷️";
  if (n.includes("박쥐") || n.includes("bat")) return "🦇";
  if (n.includes("뱀") || n.includes("snake") || n.includes("worm")) return "🐍";
  return "👾";
};

export const generateMonster = async (level: number, zoneType: string, isBoss: boolean, baseName: string | undefined, language: 'en' | 'ko'): Promise<Enemy> => {
  try {
    const difficulty = isBoss ? "EXTREME" : "NORMAL";
    // Customize prompt based on zone
    let zoneDesc = "grasslands";
    if (zoneType === 'FOREST') zoneDesc = "dark forest";
    if (zoneType === 'DUNGEON') zoneDesc = "deep underground dungeon";
    
    // If we already have a base name (from map entity), use it
    const promptName = baseName ? `based on a "${baseName}"` : "Create a fantasy monster";
    const langInstruction = language === 'ko' ? "Provide name and description in Korean." : "Provide name and description in English.";

    const prompt = isBoss
      ? "Create the ultimate Demon King boss."
      : `Create a ${promptName} for a level ${level} hero in the ${zoneDesc}. Difficulty: ${difficulty}.`;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        hp: { type: Type.INTEGER },
        atk: { type: Type.INTEGER },
        expReward: { type: Type.INTEGER },
        goldReward: { type: Type.INTEGER },
      },
      required: ["name", "description", "hp", "atk", "expReward", "goldReward"],
    };

    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${prompt}
      Base stats roughly on Level ${level}.
      Normal Monster: HP ~ ${level * 20}, Atk ~ ${level * 3}.
      Dungeon Monster: HP ~ ${level * 35}, Atk ~ ${level * 5}.
      Demon King: HP 500, Atk 25 (Fixed high stats).
      ${langInstruction}
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const data = JSON.parse(response.text);
    const emoji = getMonsterEmoji(data.name, isBoss);
    
    return {
      name: data.name,
      description: data.description,
      hp: data.hp,
      maxHp: data.hp,
      atk: data.atk,
      expReward: data.expReward,
      goldReward: data.goldReward,
      emoji: emoji,
      isBoss: isBoss
    };

  } catch (error) {
    console.error("Gemini Monster Gen Error:", error);
    // Fallback monster
    const fallbackName = baseName || (isBoss ? (language === 'ko' ? "마왕" : "Demon King") : (language === 'ko' ? "야생 슬라임" : "Wild Slime"));
    return {
      name: fallbackName,
      description: language === 'ko' ? "적대적인 생명체입니다." : "A hostile creature.",
      hp: level * 20,
      maxHp: level * 20,
      atk: level * 2,
      expReward: level * 10,
      goldReward: level * 5,
      emoji: getMonsterEmoji(baseName || "slime", isBoss),
      isBoss: isBoss
    };
  }
};