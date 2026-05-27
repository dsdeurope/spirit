// functions/api/analyze.js

export async function onRequest(context) {
  const { request, env } = context;
  
  // Récupération de la clé API depuis les variables d'environnement Cloudflare
  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;

  // Définition des en-têtes CORS pour autoriser les requêtes depuis le navigateur
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  // 1. GESTION IMPÉRATIVE DE LA PRÉ-VÉRIFICATION (OPTIONS)
  // Le navigateur envoie cette requête avant le POST. Si on ne répond pas ici, erreur 405/403.
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. VÉRIFICATION DE LA MÉTHODE (Seul POST est autorisé pour l'analyse)
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // 3. VÉRIFICATION DE LA CLÉ API
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral manquante dans les variables Cloudflare (MISTRAL_API_KEY)." }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    // 4. PARSING DU CORPS DE LA REQUÊTE
    let dataInput = {};
    try {
      dataInput = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Format JSON invalide dans la requête." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { prompt, type, max_tokens: clientMaxTokens } = dataInput;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le champ 'prompt' est requis." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 5. CONSTRUCTION DU PROMPT SYSTÈME AVEC CONTRAINTE DE LONGUEUR FORTE
    // C'est ici qu'on force les 300-400 mots minimum comme demandé.
    const systemInstruction = `Tu es un théologien exégète et bibliste francophone de haut niveau. 
    Tu rédiges des analyses détaillées, riches, historiquement précises et accessibles.
    
    ⚠️ CONTRAINTE DE LONGUEUR ABSOLUE ET PRIORITAIRE :
    Ta réponse doit être EXTÊMEMENT DÉTAILLÉE. Tu dois rédiger un MINIMUM absolu de 300 à 400 mots.
    Ne fais JAMAIS de résumé court. Développe rigoureusement chaque point, chaque argument, chaque nuance historique et théologique.
    Si le sujet semble court, creuse les implications pratiques, les racines hébraïques/grecques, et le contexte culturel pour atteindre cet objectif.
    Le texte doit être dense, nourri et structuré avec des paragraphes clairs.`;

    // On ajoute une instruction utilisateur pour renforcer la contrainte si nécessaire
    let finalUserPrompt = prompt;
    if (!prompt.includes("MINIMUM")) {
        finalUserPrompt += ` \n\n[CONTRAINE DE FORMAT OBLIGATOIRE] : Rédige un contenu très dense d'au moins 300 mots. Ne sois jamais superficiel.`;
    }

    // 6. APPEL À L'API MISTRAL
    // Utilisation de max_tokens: 2500 pour laisser de la place au texte long
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest", // Modèle performant pour le raisonnement théologique
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: 0.6, // Équilibre créativité/rigueur
        max_tokens: clientMaxTokens || 2500, // Priorité à la valeur du client, sinon 2500
        top_p: 1
      })
    });

    // 7. GESTION DES ERREURS DE L'API EXTERNE
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Erreur Mistral API : ${response.status}`, errText);
      throw new Error(`Erreur API Mistral (${response.status}) : ${errText.substring(0, 150)}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error("Aucune réponse générée par l'IA (structure invalide).");
    }

    const analysisText = data.choices[0].message.content.trim();

    // 8. RÉPONSE RÉUSSIE VERS LE FRONTEND
    return new Response(JSON.stringify({ 
      success: true, 
      result: analysisText,
      type: type,
      wordCount: analysisText.split(/\s+/).length
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Erreur interne analyze.js:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Une erreur inattendue est survenue lors de l'analyse." 
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
