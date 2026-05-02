import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { error: 'Supabase non configuré : définissez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.' },
        { status: 503 }
      );
    }

    const { messages, userId = 'user-demo-id' } = await request.json();

    const google = createGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const systemPrompt = `Tu es un système de classification pour Les Artistes Rénov.
En te basant sur le contexte de la discussion, retourne UNIQUEMENT un objet JSON avec les deux clés suivantes :
- "domain" : une chaîne de caractères parmi ('plomberie', 'electricite', 'peinture', 'revetements', 'general')
- "contextSummary" : une phrase résumant le problème (ex: "Fuite d'eau détectée sous l'évier de la cuisine").
Ne retourne aucun texte supplémentaire.`;

    const promptText = messages
      .filter((m: any) => !(m.content || '').startsWith('data:image'))
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');

    let text;
    try {
      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: promptText
      });
      text = result.text;
    } catch (e) {
      console.warn("Gemini API failed, falling back to OpenRouter", e);
      const fallbackResult = await generateText({
        model: openrouter('nvidia/nemotron-3-nano-30b-a3b:free'),
        system: systemPrompt,
        prompt: promptText
      });
      text = fallbackResult.text;
    }

    let parsed;
    try {
      const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleanedText);
    } catch (e) {
      parsed = { domain: 'general', contextSummary: 'Problème nécessitant l\'intervention d\'un expert' };
    }

    // Créer une demande de support dans Supabase
    const requestId = randomUUID();

    // Ensure the user profile exists to satisfy foreign key constraints
    await supabase.from('profiles').upsert({
      id: userId,
      email: `${userId}@guest.local`,
      full_name: 'Invité',
      role: 'guest',
    });

    const { data: requestData, error: requestError } = await supabase
      .from('support_requests')
      .insert({
        id: requestId,
        user_id: userId,
        domain: parsed.domain,
        context: parsed.contextSummary,
        status: 'pending'
      })
      .select()
      .single();

    if (requestError) {
      console.error("Supabase insert error:", requestError);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    // Copier l'historique de chat dans la table messages
    for (const msg of messages) {
      if (msg.isImage || msg.isEstimate) continue; // On ignore les contenus complexes pour cette démo
      await supabase.from('messages').insert({
        request_id: requestId,
        sender_id: userId, // Simplification
        content: msg.content,
        role: msg.role === 'user' ? 'user' : 'ia'
      });
    }

    return NextResponse.json({ 
      success: true, 
      requestId: requestId, 
      domain: parsed.domain 
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
