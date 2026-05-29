// functions/api/analyze.js
//
// Cloudflare Pages Function — proxy sécurisé vers Mistral pour les
// 8 onglets d'analyse Lectio. La clé API reste côté serveur (jamais
// exposée au navigateur).
//
// Route publique : POST /api/analyze
// Corps attendu  : { prompt: string, type?: string, max_tokens?: number }
// Réponse        : { success: true, result: string, type: string }

export async function onRequest(context) {
  const { request, env } = context;

  // 1. En-têtes CORS pour TOUTES les réponses
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Custom-Header",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json"
  };

  // 2. Pré-vérification OPTIONS (évite l'erreur 405 du navigateur)
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 3. Seul POST est autorisé
  if (request.method !== "POST") {
    return new Response(JSON.stringify({
      error: "Method Not Allowed",
      message: "Cette endpoint accepte uniquement les requêtes POST.",
      received_method: request.method
    }), { status: 405, headers: corsHeaders });
  }

  // 4. Vérification de la clé API (variable d'environnement Cloudflare)
  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({
      error: "Configuration manquante : MISTRAL_API_KEY non définie dans Cloudflare."
    }), { status: 500, headers: corsHeaders });
  }

  try {
    // 5. Parsing sécurisé du JSON
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Corps de requête invalide (JSON attendu)." }), {
        status: 400, headers: corsHeaders
      });
    }

    const { prompt, type, max_tokens: requestedMaxTokens } = body;
    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le champ 'prompt' est obligatoire." }), {
        status: 400, headers: corsHeaders
      });
    }

    // 6. Prompt système : profond, structuré, 300 mots min, SANS markdown
    const systemMsg =
      "Tu es un assistant théologique expert. Tes réponses sont structurées, " +
      "profondes et bibliques. Tu rédiges un MINIMUM de 300 mots. " +
      "Rédige en paragraphes fluides et naturels. " +
      "N'utilise PAS de symboles markdown comme ####, ###, ## ou ** dans ta réponse.";

    // 6b. Choix du modèle adaptatif selon le type d'onglet :
    //     • small (~10× moins cher) : onglets factuels où la profondeur compte moins
    //     • large : onglets nécessitant exégèse poussée et nuance théologique
    const MODEL_BY_TYPE = {
      contexte:      "mistral-small-latest",
      qui_parle:     "mistral-small-latest",
      destinataires: "mistral-small-latest",
      theme:         "mistral-small-latest",
      p1_biblical:   "mistral-small-latest",
      dict:          "mistral-small-latest",
      sens:          "mistral-large-latest",
      pourquoi:      "mistral-large-latest",
      theologiens:   "mistral-large-latest",
      spirituel:     "mistral-large-latest",
      p1_theological:"mistral-large-latest",
      p1_meditative: "mistral-large-latest",
    };
    const chosenModel = MODEL_BY_TYPE[type] || "mistral-large-latest";

    // 7. Appel à Mistral
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: chosenModel,
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: requestedMaxTokens || 2000
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
    }), { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error("[analyze.js] Critical Error:", error);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      details: error.message
    }), { status: 500, headers: corsHeaders });
  }
}
