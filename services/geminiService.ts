import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Enemy } from "../types";

// Initialize Gemini
// NOTE: API Key is expected to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = "gemini-2.5-flash";

export const generateStoryIntro = async (playerName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `Write a short, immersive 3-paragraph introduction for a text-based RPG. 
      The protagonist, named "${playerName}", is an ordinary person suddenly summoned to a fantasy world by a desperate goddess.
      The world is on the brink of destruction by the Demon King.
      The tone should be serious but adventurous. Do not use markdown formatting like **bold**.`,
    });
    return response.text || "You wake up in a strange new world...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Welcome, ${playerName}. You have been summoned to a world in peril. Defeat the Demon King to return home.`;
  }
};

export const generateEndingStory = async (playerName: string, victory: boolean): Promise<string> => {
  try {
    const prompt = victory 
      ? `Write a triumphant ending for the hero "${playerName}" who has defeated the Demon King. They are thanked by the kingdom and a portal opens to return them to their original world. 2 paragraphs.`
      : `Write a tragic ending for the hero "${playerName}" who fell in battle against the dark forces. The world is plunged into darkness. 1 paragraph.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || (victory ? "You won!" : "You died.");
  } catch (error) {
    console.error("Gemini Error:", error);
    return victory ? "You defeated the Demon King and returned home!" : "Your journey ends here.";
  }
};

// Helper to guess emoji based on name if Gemini fails or for fallback
export const getMonsterEmoji = (name: string, isBoss: boolean): string => {
  const n = name.toLowerCase();
  if (isBoss) return "👿";
  if (n.includes("slime") || n.includes("blob")) return "💧";
  if (n.includes("goblin") || n.includes("orc")) return "👺";
  if (n.includes("wolf") || n.includes("dog")) return "🐺";
  if (n.includes("dragon") || n.includes("drake")) return "🐉";
  if (n.includes("skeleton") || n.includes("bone")) return "💀";
  if (n.includes("ghost") || n.includes("spirit")) return "👻";
  if (n.includes("spider")) return "🕷️";
  if (n.includes("bat")) return "🦇";
  if (n.includes("snake")) return "🐍";
  return "👾";
};

export const generateMonster = async (level: number, zoneType: string, isBoss: boolean, baseName?: string): Promise<Enemy> => {
  try {
    const difficulty = isBoss ? "EXTREME" : "NORMAL";
    // Customize prompt based on zone
    let zoneDesc = "grasslands";
    if (zoneType === 'FOREST') zoneDesc = "dark forest";
    if (zoneType === 'DUNGEON') zoneDesc = "deep underground dungeon";
    
    // If we already have a base name (from map entity), use it
    const promptName = baseName ? `based on a ${baseName}` : "Create a fantasy monster";

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
    return {
      name: baseName || (isBoss ? "Demon King" : "Wild Slime"),
      description: "A hostile creature.",
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