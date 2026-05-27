// functions/api/analyze.js

export async function onRequest(context) {
  const { request } = context;
  const MISTRAL_API_KEY = context.env.MISTRAL_API_KEY;

  // Gestion des requêtes de pré-vérification (OPTIONS) pour éviter les blocages navigateurs
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      }
    });
  }

  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral non configurée" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }

  try {
    // Lecture des données, que la méthode soit POST ou GET adaptative
    let dataInput = {};
    if (request.method === "POST") {
      dataInput = await request.json();
    } else {
      const url = new URL(request.url);
      dataInput = {
        prompt: url.searchParams.get("prompt"),
        type: url.searchParams.get("type"),
        durationMinutes: parseInt(url.searchParams.get("durationMinutes")) || 4
      };
    }

    const { prompt, type, durationMinutes } = dataInput;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Le prompt est requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const systemInstruction = `Tu es un assistant théologique et spirituel expert francophone. 
    Tu réponds avec profondeur, clarté, bienveillance et une grande richesse de détails.
    Tes analyses sont structurées, bibliques, historiques et pertinentes pour la vie chrétienne contemporaine.
    
    ⚠️ CONTRAINTE DE LONGUEUR ABSOLUE :
    Ta réponse doit être extrêmement détaillée, approfondie et structurée. 
    Tu dois rédiger un MINIMUM absolu de 300 à 400 mots pour ce contenu. 
    Ne fais jamais de résumé court. Développe rigoureusement chaque point, chaque argument et chaque nuance.
    Si le sujet semble court, creuse les implications théologiques, historiques et pratiques pour atteindre cet objectif.
    Le texte doit être dense et nourri.`;

    let finalUserPrompt = prompt;
    if (durationMinutes) {
      finalUserPrompt += ` \n\n(Note : Ce contenu est destiné à une méditation de ${durationMinutes} minute(s). Adapte la densité et la profondeur pour offrir une lecture riche correspondant à ce temps, sans jamais être superficiel.)`;
    }

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer \${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: 0.6,
        max_tokens: 2500,
        top_p: 1
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Erreur Mistral: \${response.status} - \${errData}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    const analysisText = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ 
      success: true, 
      result: analysisText,
      type: type,
      wordCountEstimate: analysisText.split(' ').length
    }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
}
