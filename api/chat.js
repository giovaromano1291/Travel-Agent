// api/chat.js — Vercel Edge Function
// Proxy SSE verso l'API Anthropic. Streaming obbligatorio per evitare il
// timeout di 25s del piano Hobby di Vercel.
//
// NOTA: se il tuo chat.js attuale funziona già, NON è necessario sostituirlo.
// Il fallback mobile in PlannerPage (res.text()) legge lo stesso identico
// formato SSE "data: {...}", quindi è compatibile con qualsiasi proxy SSE.
// Questo file è solo un riferimento robusto.

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Streaming sempre attivo (evita timeout 25s Hobby)
  const anthropicBody = {
    ...body,
    stream: true,
    model: body.model || 'claude-sonnet-4-6',
    max_tokens: body.max_tokens || 1000,
  };

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicBody),
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '');
    return new Response(errText || JSON.stringify({ error: 'Upstream error' }), {
      status: upstream.status || 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Re-streaming diretto del corpo SSE verso il client.
  // Funziona sia per il path streaming (getReader) sia per il fallback mobile (res.text()).
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
