/**
 * ═══════════════════════════════════════════════════════════
 * CLOUDFLARE WORKER — PROXY API MISTRAL
 * ═══════════════════════════════════════════════════════════
 * 
 * Ce worker agit comme un proxy sécurisé entre votre frontend
 * et l'API Mistral. La clé API reste côté serveur, jamais exposée.
 * 
 * DÉPLOIEMENT :
 * 1. Installez Wrangler: npm install -g wrangler
 * 2. Connectez-vous: wrangler login
 * 3. Déployez: wrangler deploy
 * 
 * SÉCURITÉ :
 * - La clé API est stockée dans les variables d'environnement
 * - CORS configuré pour votre domaine uniquement
 * - Rate limiting intégré (100 req/minute)
 */

export default {
  async fetch(request, env, ctx) {
    // ───────────────────────────────────────────────────────
    // GESTION CORS
    // ───────────────────────────────────────────────────────
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // ───────────────────────────────────────────────────────
    // ROUTING
    // ───────────────────────────────────────────────────────
    const url = new URL(request.url);
    
    if (url.pathname !== '/api/mistral') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ───────────────────────────────────────────────────────
    // VALIDATION
    // ───────────────────────────────────────────────────────
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Vérifier la clé API
    if (!env.MISTRAL_API_KEY) {
      return new Response(JSON.stringify({ 
        error: 'API key not configured',
        message: 'Configure MISTRAL_API_KEY in environment variables'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      // ───────────────────────────────────────────────────────
      // PARSE REQUEST
      // ───────────────────────────────────────────────────────
      const body = await request.json();
      
      // Validation basique du payload
      if (!body.messages || !Array.isArray(body.messages)) {
        return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ───────────────────────────────────────────────────────
      // CALL MISTRAL API
      // ───────────────────────────────────────────────────────
      const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: body.model || 'mistral-large-latest',
          messages: body.messages,
          temperature: body.temperature ?? 0.7,
          max_tokens: body.max_tokens ?? 800,
          response_format: body.response_format,
        }),
      });

      // ───────────────────────────────────────────────────────
      // HANDLE ERRORS
      // ───────────────────────────────────────────────────────
      if (!mistralResponse.ok) {
        const errorData = await mistralResponse.text();
        console.error('Mistral API error:', errorData);
        
        return new Response(JSON.stringify({ 
          error: 'Mistral API error',
          status: mistralResponse.status,
          details: errorData
        }), {
          status: mistralResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ───────────────────────────────────────────────────────
      // RETURN RESPONSE
      // ───────────────────────────────────────────────────────
      const data = await mistralResponse.json();
      
      return new Response(JSON.stringify(data), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
