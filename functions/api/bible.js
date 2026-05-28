// functions/api/bible.js
//
// Cloudflare Pages Function — proxy sécurisé vers Mistral pour récupérer
// le texte d'un chapitre biblique (Louis Segond 1910).
//
// Route publique : POST /api/bible
// Corps attendu  : { book: string, chapter: number|string, verse?: number|string }
// Réponse        : { success: true, text: string, reference: string }

export async function onRequest(context) {
  const { request, env } = context;

  const MISTRAL_API_KEY = env.MISTRAL_API_KEY;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  // Pré-vérification OPTIONS
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Seul POST autorisé
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
      status: 405, headers: corsHeaders
    });
  }

  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({
      error: "Clé API Mistral non configurée dans les variables d'environnement Cloudflare."
    }), { status: 500, headers: corsHeaders });
  }

  try {
    // Parsing du corps
    let dataInput = {};
    try {
      dataInput = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Format JSON invalide." }), {
        status: 400, headers: corsHeaders
      });
    }

    const { book, chapter, verse } = dataInput;

    if (!book || !chapter) {
      return new Response(JSON.stringify({ error: "Les paramètres 'book' et 'chapter' sont requis." }), {
        status: 400, headers: corsHeaders
      });
    }

    // Construction du prompt
    let promptText = `Donne moi le texte exact et complet du passage biblique suivant en version Louis Segond 1910 : ${book} chapitre ${chapter}`;
    if (verse) {
      promptText += `, verset ${verse}`;
    } else {
      promptText += ` (tout le chapitre)`;
    }
    promptText += `. Réponds UNIQUEMENT par le texte biblique, sans introduction, sans commentaire, sans 'Voici le texte'. Commence directement par le premier mot du verset. Si le chapitre est long, assure-toi de ne rien omettre.`;

    // Appel à Mistral (modèle rapide, température basse pour fidélité)
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-small-latest", // mistral-tiny est déprécié
        messages: [
          {
            role: "system",
            content: "Tu es un expert biblique. Tu fournis uniquement le texte exact de la Bible en français (Louis Segond 1910). Tu ne donnes aucune explication, aucun ajout. Tu respectes scrupuleusement la ponctuation et la structure du texte original."
          },
          { role: "user", content: promptText }
        ],
        temperature: 0.1,
        max_tokens: 2500,
        top_p: 1
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error(`Erreur Mistral API : ${response.status}`, errData);
      throw new Error(`Erreur API Mistral (${response.status}) : ${errData.substring(0, 150)}`);
    }

    const data = await response.json();
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
      throw new Error("Aucun texte biblique généré (structure invalide).");
    }

    const bibleText = data.choices[0].message.content.trim();

    return new Response(JSON.stringify({
      success: true,
      text: bibleText,
      reference: `${book} ${chapter}${verse ? ':' + verse : ''}`
    }), { headers: corsHeaders });

  } catch (error) {
    console.error("Erreur interne bible.js:", error);
    return new Response(JSON.stringify({ error: error.message || "Une erreur inattendue est survenue." }), {
      status: 500, headers: corsHeaders
    });
  }
}
