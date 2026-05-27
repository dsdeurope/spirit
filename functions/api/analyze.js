// functions/api/analyze.js
// Version Blindée contre les erreurs 405 et problèmes CORS

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // 1. Configuration des en-têtes CORS (Critique pour éviter les blocages navigateur)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json"
  };

  // 2. Gestion explicite et immédiate du pré-vol OPTIONS
  // Le navigateur envoie souvent OPTIONS avant POST. On doit répondre OK tout de suite.
  if (request.method === "OPTIONS") {
    return new Response(null, { 
      status: 204, // No Content est la réponse standard pour OPTIONS
      headers: corsHeaders 
    });
  }

  // 3. Vérification stricte : On n'accepte QUE POST pour le traitement
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ 
      error: "Méthode non autorisée", 
      detail: `La méthode ${request.method} n'est pas supportée. Utilisez POST.`,
      received_method: request.method
    }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // 4. Récupération de la clé API
  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ 
      error: "Configuration manquante", 
      detail: "La variable MISTRAL_API_KEY n'est pas définie dans Cloudflare." 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    // 5. Lecture du corps de la requête avec gestion d'erreur robuste
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      return new Response(JSON.stringify({ 
        error: "JSON invalide", 
        detail: "Le corps de la requête n'est pas un JSON valide." 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { prompt, type, durationMinutes, book, chapter } = requestData;

    if (!prompt) {
      return new Response(JSON.stringify({ 
        error: "Prompt manquant", 
        detail: "Le champ 'prompt' est obligatoire dans la requête JSON." 
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 6. Construction du Prompt Système Renforcé (Contrainte de 300+ mots)
    const systemInstruction = `Tu es un théologien exégète expert, spécialisé dans l'analyse biblique profonde en français.
    
    RÈGLE D'OR ABSOLUE : 
    Ta réponse doit impérativement contenir entre 300 et 500 mots. 
    Il est INTERDIT de faire un résumé court. Tu dois développer chaque argument, donner du contexte historique, expliquer les termes originaux (hébreu/grec), et tirer des applications pratiques détaillées.
    Si tu sens que tu vas finir trop court, ajoute une section "Implications pour aujourd'hui" ou "Éclairage historique" pour atteindre l'objectif de longueur.
    Structure ta réponse avec des paragraphes clairs.`;

    // Ajout de la contrainte de temps au prompt utilisateur
    let finalPrompt = prompt;
    if (durationMinutes) {
      finalPrompt += `\n\n[CONTRAINE DE TEMPS] : Ce texte sera lu pendant une méditation de ${durationMinutes} minutes. 
      Adapte la longueur et la densité du contenu pour remplir exactement ce temps de lecture à voix haute (environ 130-140 mots par minute).`;
    }

    // 7. Appel à l'API Mistral
    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalPrompt }
        ],
        temperature: 0.6,
        max_tokens: 2500, // Espace suffisant pour 400+ mots
        top_p: 1
      })
    });

    // 8. Gestion des erreurs venant de Mistral
    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error(`[Mistral Error ${mistralResponse.status}]:`, errorText);
      throw new Error(`API Mistral a renvoyé ${mistralResponse.status}: ${errorText.substring(0, 100)}`);
    }

    const mistralData = await mistralResponse.json();

    if (!mistralData.choices || mistralData.choices.length === 0) {
      throw new Error("L'API Mistral n'a retourné aucun choix de réponse.");
    }

    const content = mistralData.choices[0].message.content;

    // 9. Réponse finale réussie vers le frontend
    return new Response(JSON.stringify({
      success: true,
      result: content,
      type: type,
      wordCount: content.split(/\s+/).length,
      debug: {
        receivedBook: book,
        receivedChapter: chapter,
        duration: durationMinutes
      }
    }), {
      headers: corsHeaders
    });

  } catch (err) {
    console.error("[CRITICAL ERROR in analyze.js]:", err);
    return new Response(JSON.stringify({
      error: "Erreur Interne",
      message: err.message,
      stack: err.stack // Utile pour le débogage en dev
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
