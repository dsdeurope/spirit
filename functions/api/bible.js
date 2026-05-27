// functions/api/bible.js

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
    const { book, chapter, verse } = await request.json();

    if (!book || !chapter) {
      return new Response(JSON.stringify({ error: "Livre et chapitre requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Construction du prompt pour obtenir exactement le texte demandé
    let promptText = `Donne moi le texte exact du passage biblique suivant en version Louis Segond 1910 : ${book} chapitre ${chapter}`;
    if (verse) {
      promptText += `, verset ${verse}`;
    } else {
      promptText += ` (tout le chapitre)`;
    }
    
    promptText += `. Réponds UNIQUEMENT par le texte biblique, sans introduction, sans commentaire, sans 'Voici le texte'. Commence directement par le premier mot du verset.`;

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-tiny", // Modèle le plus rapide et économique (Free Tier eligible)
        messages: [
          {
            role: "system",
            content: "Tu es un expert biblique. Tu fournis uniquement le texte exact de la Bible en français (Louis Segond). Tu ne donnes aucune explication."
          },
          {
            role: "user",
            content: promptText
          }
        ],
        temperature: 0.1, // Très faible pour éviter les hallucinations et rester fidèle au texte
        max_tokens: 2500 // Suffisant pour un chapitre entier
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`Erreur Mistral: ${response.status} - ${errData}`);
    }

    const data = await response.json();
    const bibleText = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({ 
      success: true, 
      text: bibleText,
      reference: `${book} ${chapter}${verse ? ':' + verse : ''}`
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Erreur API Bible:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
