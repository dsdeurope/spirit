// functions/api/analyze.js

export async function onRequest(context) {
  const { request, env } = context;
  
  // Récupération sécurisée de la clé API
  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;

  // En-têtes CORS obligatoires pour que le navigateur accepte la réponse
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  // 1. Gestion impérative de la pré-vérification OPTIONS (évite l'erreur 405/403 navigateur)
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 2. Vérification de la méthode (Seul POST est autorisé pour l'analyse)
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
      status: 405,
      headers: corsHeaders
    });
  }

  // 3. Vérification de la clé API
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral manquante dans les variables Cloudflare." }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    // 4. Parsing du corps de la requête
    let dataInput = {};
    try {
      dataInput = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Format JSON invalide." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { prompt, type, durationMinutes } = dataInput;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le champ 'prompt' est requis." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 5. Construction du Prompt Système avec contrainte de longueur stricte
    const systemInstruction = `Tu es un théologien exégète et bibliste francophone de haut niveau. 
    Tu rédiges des analyses détaillées, riches, historiquement précises et accessibles.
    
    ⚠️ CONTRAINTE DE LONGUEUR ABSOLUE ET PRIORITAIRE :
    Ta réponse doit être EXTÊMEMENT DÉTAILLÉE. Tu dois rédiger un MINIMUM absolu de 300 à 400 mots.
    Ne fais JAMAIS de résumé court. Développe rigoureusement chaque point, chaque argument, chaque nuance historique et théologique.
    Si le sujet semble court, creuse les implications pratiques, les racines hébraïques/grecques, et le contexte culturel pour atteindre cet objectif.
    Le texte doit être dense, nourri et structuré avec des paragraphes clairs.`;

    let finalUserPrompt = prompt;
    
    // Ajout de la contrainte de temps si présente
    if (durationMinutes) {
      finalUserPrompt += ` \n\n[CONTRAINE DE FORMAT] : Ce contenu est destiné à une méditation profonde de ${durationMinutes} minute(s). 
      Adapte la densité et la longueur du texte pour offrir une lecture riche et continue correspondant exactement à ce temps de parole (environ 130 mots par minute). 
      Ne sois jamais superficiel.`;
    }

    // 6. Appel à l'API Mistral
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
        max_tokens: 2500, // Augmenté pour permettre 300-400 mots sans coupure
        top_p: 1
      })
    });

    // 7. Gestion des erreurs de l'API externe
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

    // 8. Réponse réussie vers le frontend
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
