import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    const { context } = await request.json();

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = `Tu es un estimateur de prix pour Les Artistes Rénov. 
À partir du contexte de la discussion, génère un devis sous forme de JSON exact avec les clés suivantes (les clés doivent rester en anglais, mais les valeurs doivent être dans la même langue que la discussion) :
- title: string (ex: 'Devis Réel' ou 'Real Estimate' ou 'تقدير حقيقي')
- repairType: string
- partType: string
- materialCost: string (ex: '130 €')
- laborCost: string (ex: '100 €')
- totalCost: string (ex: '230 €')
Ne retourne QUE le JSON valide, sans balises markdown ni texte autour.`;

    const promptText = `Contexte de la discussion: ${context}`;

    let text;
    try {
      // 1. Try Gemini
      const result = await generateText({
        model: google('gemini-1.5-pro'),
        system: systemPrompt,
        prompt: promptText
      });
      text = result.text;
    } catch (e) {
      console.warn("Gemini API failed, falling back to OpenRouter", e);
      // 2. Fallback to OpenRouter
      const fallbackResult = await generateText({
        model: openrouter('openai/gpt-4o-mini'),
        system: systemPrompt,
        prompt: promptText
      });
      text = fallbackResult.text;
    }

    let devisData;
    try {
      // Clean up markdown block if the model wraps the JSON
      const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      devisData = JSON.parse(cleanedText);
    } catch (e) {
      devisData = {
        title: 'Devis Estimé',
        repairType: 'Travaux de rénovation',
        partType: 'Matériaux',
        materialCost: 'Sur devis',
        laborCost: 'Sur devis',
        totalCost: 'À définir'
      };
    }

    return NextResponse.json(devisData);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
