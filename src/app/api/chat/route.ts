import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: Request) {
  try {
    const { messages, isExpertMode } = await request.json();
    
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = isExpertMode
      ? `Tu es l'Expert de Rénovation de l'entreprise "Les Artistes Rénov".
Règles strictes que tu dois respecter :
1. Comprends tout l'historique de la conversation.
2. Réponds TOUJOURS en Markdown bien structuré (titres ##, listes -, **gras**, etc.).
3. Réponds de manière claire, professionnelle et utile, dans la langue de l'utilisateur.
4. Ne dis jamais "je ne sais pas" sans proposer une solution alternative.
5. Donne toujours une réponse pertinente même si l'information est incomplète.
6. Pose des questions si nécessaire pour mieux comprendre le problème.
7. Si l'utilisateur a envoyé une image (indiqué par le contexte), analyse le contexte et donne une hypothèse réaliste du problème.
8. Si l'utilisateur demande un devis, fournis une estimation structurée contenant : type de réparation, prix estimé, main d'œuvre, total.
Tu interviens pour donner des détails très techniques.`
      : `Tu es l'assistant IA de "Les Artistes Rénov".
Règles strictes que tu dois respecter :
1. Comprends tout l'historique de la conversation.
2. Réponds TOUJOURS en Markdown bien structuré (titres ##, listes -, **gras**, etc.).
3. Réponds de manière claire, chaleureuse et utile, dans la langue de l'utilisateur.
4. Ne dis jamais "je ne sais pas" sans proposer une solution alternative.
5. Donne toujours une réponse pertinente même si l'information est incomplète.
6. Pose des questions si nécessaire pour mieux comprendre le problème.
7. Si l'utilisateur a envoyé une image (indiqué par le contexte), analyse le contexte et donne une hypothèse réaliste du problème.
8. Si l'utilisateur demande un devis, fournis une estimation structurée contenant : type de réparation, prix estimé, main d'œuvre, total.`;

    const coreMessages: any[] = messages.map((m: any) => {
      if (m.isImage && m.content.startsWith('data:image')) {
        return {
          role: m.role,
          content: [
            { type: 'image', image: m.content.split(',')[1] }
          ]
        };
      }
      return {
        role: m.role,
        content: m.content
      };
    });

    let text;
    try {
      // 1. Try Gemini natively with multimodal support
      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        messages: coreMessages
      });
      text = result.text;
    } catch (e) {
      console.warn("Gemini API failed, falling back to OpenRouter", e);
      const fallbackMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.isImage ? '[Utilisateur a envoyé une image]' : m.content
      }));

      // 2. Fallback to OpenRouter (text-only)
      const fallbackResult = await generateText({
        model: openrouter('nvidia/nemotron-3-nano-30b-a3b:free'),
        system: systemPrompt,
        messages: fallbackMessages
      });
      text = fallbackResult.text;
    }

    return NextResponse.json({ reply: text });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
