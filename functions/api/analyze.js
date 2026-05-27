// functions/api/analyze.js

export async function onRequestPost(context) {
  const { request } = context;
  
  // Récupère la clé API depuis les variables d'environnement de Cloudflare Pages
  const MISTRAL_API_KEY = context.env.MISTRAL_API_KEY;

  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral non configurée dans les variables d'environnement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { prompt, type, durationMinutes } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Calcul du nombre de mots cibles basé sur le temps (env. 130 mots/min)
    // On ajoute un buffer pour s'assurer d'avoir assez de contenu dense
    const targetWords = durationMinutes ? Math.max(350, Math.round(durationMinutes * 130)) : 400;
    
    // Construction du message système renforcé pour la longueur
    const systemInstruction = `Tu es un assistant théologique et spirituel expert francophone. 
    Tu réponds avec profondeur, clarté, bienveillance et une grande richesse de détails.
    Tes analyses sont structurées, bibliques, historiques et pertinentes pour la vie chrétienne contemporaine.
    
    ⚠️ CONTRAINTE DE LONGUEUR ABSOLUE :
    Ta réponse doit être extrêmement détaillée, approfondie et structurée. 
    Tu dois rédiger un MINIMUM absolu de 300 à 400 mots pour ce contenu. 
    Ne fais jamais de résumé court. Développe rigoureusement chaque point, chaque argument et chaque nuance.
    Si le sujet semble court, creuse les implications théologiques, historiques et pratiques pour atteindre cet objectif.
    Le texte doit être dense et nourri.`;

    // Fusion du prompt utilisateur avec la contrainte de temps si présente
    let finalUserPrompt = prompt;
    if (durationMinutes) {
      finalUserPrompt += ` \n\n(Note : Ce contenu est destiné à une méditation de ${durationMinutes} minute(s). Adapte la densité et la profondeur pour offrir une lecture riche correspondant à ce temps, sans jamais être superficiel.)`;
    }

    // Appel à l'API Mistral avec paramètres optimisés pour les longs textes
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest", // Modèle le plus capable pour suivre des instructions complexes de longueur
        messages: [
          {
            role: "system",
            content: systemInstruction
          },
          {
            role: "user",
            content: finalUserPrompt
          }
        ],
        temperature: 0.6, // Équilibre entre créativité et précision structurelle
        max_tokens: 2500, // AUGMENTÉ : Espace suffisant pour 300-400 mots+ sans coupure
        top_p: 1
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Erreur Mistral: ${response.status} - ${errData}`);
    }

    const data = await response.json();
    
    // Vérification de sécurité si le contenu est vide
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    const analysisText = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ 
      success: true, 
      result: analysisText,
      type: type,
      wordCountEstimate: analysisText.split(' ').length // Optionnel : retourne le compteur pour débogage
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Erreur API Analyse:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
