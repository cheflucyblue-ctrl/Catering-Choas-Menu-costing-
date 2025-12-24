
import { GoogleGenAI, Type } from "@google/genai";
import { MenuData, Dish, SubRecipe, Supplier } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeMenuFile = async (base64Data: string, mimeType: string): Promise<MenuData> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `You are a professional restaurant consultant and cost analyst in South Africa. 
    Analyze EVERY PAGE of the uploaded menu file and extract every single dish into a structured format.
    
    CRITICAL RULES:
    1. BREAK DOWN TO RAW GOODS: For every dish, infer the fundamental raw ingredients.
    2. QUANTITIES: Use realistic restaurant portion sizes.
    3. MANUFACTURED ITEMS: If an item is clearly made in-house, place it in 'subRecipes'.
    4. SECTIONS: Organize into Breakfast, Starters, Mains, Desserts, Pizza, Kids, or Drinks.
    5. UNITS: Use metric (g, kg, ml, l) or 'unit'.
    6. CURRENCY: Prices are in South African Rand (R).`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dishes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                section: { type: Type.STRING, enum: ['Breakfast', 'Starters', 'Mains', 'Desserts', 'Pizza', 'Kids', 'Drinks'] },
                menuPrice: { type: Type.NUMBER },
                description: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredientName: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING }
                    },
                    required: ["ingredientName", "quantity", "unit"]
                  }
                }
              },
              required: ["id", "name", "section", "ingredients"]
            }
          },
          subRecipes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                yieldQuantity: { type: Type.NUMBER },
                yieldUnit: { type: Type.STRING },
                ingredients: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      ingredientName: { type: Type.STRING },
                      quantity: { type: Type.NUMBER },
                      unit: { type: Type.STRING }
                    },
                    required: ["ingredientName", "quantity", "unit"]
                  }
                }
              },
              required: ["id", "name", "ingredients", "yieldQuantity", "yieldUnit"]
            }
          }
        }
      }
    }
  });

  try {
    const text = response.text;
    const raw = JSON.parse(text || '{}');
    return raw as MenuData;
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { dishes: [], subRecipes: [] };
  }
};

export const analyzeInvoiceFile = async (base64Data: string, mimeType: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `You are a high-precision invoice audit tool. 
          Analyze the uploaded supplier invoice and extract:
          1. Supplier Name
          2. Invoice Date
          3. Line items with Name, Quantity, Unit, Price Per Unit (Unit Cost), and Line Total.
          Ensure all costs are in South African Rand.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supplierName: { type: Type.STRING },
          invoiceDate: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                unit: { type: Type.STRING },
                pricePerUnit: { type: Type.NUMBER },
                totalPrice: { type: Type.NUMBER }
              },
              required: ["name", "quantity", "unit", "pricePerUnit", "totalPrice"]
            }
          }
        },
        required: ["supplierName", "items"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse invoice", e);
    return { supplierName: 'Unknown', items: [] };
  }
};

export const analyzeSupplierCard = async (base64Data: string, mimeType: string): Promise<Partial<Supplier>> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        },
        {
          text: `Extract supplier details from this image (business card, letterhead, or photo).
          Return structured JSON for:
          1. Company Name
          2. Contact Person
          3. Email
          4. Phone Number
          5. Category (e.g., Meat, Produce, Dry Goods, Beverage, General)`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          contactPerson: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          category: { type: Type.STRING }
        },
        required: ["name"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error("Failed to parse supplier card", e);
    return { name: 'Extracted Supplier' };
  }
};

export const suggestIngredientPrices = async (ingredients: string[]): Promise<Record<string, { cost: number, unit: string, baseQty: number }>> => {
    if (ingredients.length === 0) return {};
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Provide wholesale market prices for these restaurant ingredients in South Africa (Rands). 
        Format: name, cost, unit (kg/l/unit), baseQty (1000 for kg/l, 1 for unit).
        Ingredients: ${ingredients.join(', ')}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prices: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                cost: { type: Type.NUMBER },
                                unit: { type: Type.STRING },
                                baseQty: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        }
    });

    try {
        const text = response.text;
        const data = JSON.parse(text || '{}');
        const result: Record<string, any> = {};
        if (data.prices && Array.isArray(data.prices)) {
          data.prices.forEach((p: any) => {
              result[p.name] = { cost: p.cost, unit: p.unit, baseQty: p.baseQty };
          });
        }
        return result;
    } catch (e) {
        return {};
    }
}
