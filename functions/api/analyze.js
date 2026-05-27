// functions/api/analyze.js

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. En-têtes CORS obligatoires pour TOUTES les réponses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Custom-Header",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };

  // 2. Gestion explicite de la pré-vérification OPTIONS
  // C'est CE BLOC qui empêche l'erreur 405 du navigateur
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204, // No Content est la réponse standard pour OPTIONS
      headers: corsHeaders
    });
  }

  // 3. Refus strict de toute méthode autre que POST
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ 
      error: "Method Not Allowed", 
      message: "Cette endpoint accepte uniquement les requêtes POST.",
      received_method: request.method 
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // 4. Vérification de la clé API
  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Configuration manquante : MISTRAL_API_KEY non définie dans Cloudflare." }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    // 5. Parsing sécurisé du JSON
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Corps de requête invalide (JSON attendu)." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { prompt, type, max_tokens: requestedMaxTokens } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le champ 'prompt' est obligatoire." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 6. Construction du prompt système renforcé
    const systemMsg = "Tu es un assistant théologique expert. Tes réponses sont structurées, profondes et bibliques. Tu rédiges un MINIMUM de 300 mots.";
    
    // 7. Appel à Mistral
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: requestedMaxTokens || 2500
      })
    });

    if (!mistralResponse.ok) {
      const errText = await mistralResponse.text();
      throw new Error(`Mistral API Error ${mistralResponse.status}: ${errText}`);
    }

    const data = await mistralResponse.json();
    const content = data.choices?.[0]?.message?.content || "";

    // 8. Succès
    return new Response(JSON.stringify({
      success: true,
      result: content,
      type: type || "unknown"
    }), {
      status: 200,
      headers: corsHeaders
    });

  } catch (error) {
    console.error("[analyze.js] Critical Error:", error);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      details: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
