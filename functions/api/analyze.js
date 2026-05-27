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
    const { prompt, type } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Appel à l'API Mistral avec paramètres optimisés pour les longs textes
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest", // Modèle équilibré pour la qualité et la longueur
        messages: [
          {
            role: "system",
            content: "Tu es un assistant théologique et spirituel expert. Tu réponds en français avec profondeur, clarté et bienveillance. Tes analyses sont structurées, bibliques et pertinentes pour la vie chrétienne contemporaine. Tu es capable de produire des contenus longs et détaillés sans te répéter."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5, // Équilibre parfait entre créativité et stabilité structurelle
        max_tokens: 3000, // Augmenté à 3000 pour permettre des analyses complètes de chapitres entiers sans coupure
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
      type: type
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
