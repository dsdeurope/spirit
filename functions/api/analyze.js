// functions/api/analyze.js

export async function onRequest(context) {
  const { request } = context;
  
  // Récupération sécurisée de la clé API depuis les variables d'environnement Cloudflare
  const MISTRAL_API_KEY = context.env.MISTRAL_API_KEY;

  // Gestion stricte du CORS pour éviter les blocages navigateur
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Vérification de la clé API
  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral non configurée dans les variables d'environnement Cloudflare." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }

  try {
    // On force la lecture en POST uniquement pour la robustesse
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const dataInput = await request.json();
    const { prompt, type, durationMinutes } = dataInput;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le paramètre 'prompt' est requis." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // --- CONSTRUCTION DU PROMPT SYSTÈME OPTIMISÉ ---
    const systemInstruction = `Tu es un théologien exégète et bibliste francophone de haut niveau. 
    Tu rédiges des analyses détaillées, riches, historiquement précises et accessibles.
    
    ⚠️ CONTRAINTE DE LONGUEUR ABSOLUE ET PRIORITAIRE :
    Ta réponse doit être EXTÊMEMENT DÉTAILLÉE. Tu dois rédiger un MINIMUM absolu de 300 à 400 mots.
    Ne fais JAMAIS de résumé court. Développe rigoureusement chaque point, chaque argument, chaque nuance historique et théologique.
    Si le sujet semble court, creuse les implications pratiques, les racines hébraïques/grecques, et le contexte culturel pour atteindre cet objectif.
    Le texte doit être dense, nourri et structuré avec des paragraphes clairs.`;

    // --- AJOUT DE LA CONTRAINTE DE TEMPS ---
    let finalUserPrompt = prompt;
    if (durationMinutes) {
      finalUserPrompt += ` \n\n[CONTRAINE DE FORMAT] : Ce contenu est destiné à une méditation profonde de ${durationMinutes} minute(s). 
      Adapte la densité et la longueur du texte pour offrir une lecture riche et continue correspondant exactement à ce temps de parole (environ 130 mots par minute). 
      Ne sois jamais superficiel.`;
    }

    // --- APPEL À L'API MISTRAL (CORRIGÉ) ---
    // Correction 1 : Suppression des espaces dans l'URL
    // Correction 2 : Utilisation de backticks (`) pour l'injection de la clé API
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}` // Correction critique ici
      },
      body: JSON.stringify({
        model: "mistral-large-latest", // Modèle le plus puissant pour le respect des contraintes longues
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: 0.6, // Équilibre créativité/rigueur
        max_tokens: 2500, // Réservoir suffisant pour 300-400 mots sans coupure
        top_p: 1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Erreur Mistral API : ${response.status}`, errText);
      throw new Error(`Erreur API Mistral (${response.status}) : ${errText.substring(0, 100)}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error("Aucune réponse générée par l'IA (structure invalide).");
    }

    const analysisText = data.choices[0].message.content.trim();

    // Retour de la réponse avec les headers CORS
    return new Response(JSON.stringify({ 
      success: true, 
      result: analysisText,
      type: type,
      wordCount: analysisText.split(/\s+/).length // Estimation du nombre de mots pour débogage
    }), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error) {
    console.error("Erreur interne analyze.js:", error);
    return new Response(JSON.stringify({ 
      error: error.message || "Une erreur inattendue est survenue lors de l'analyse." 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
