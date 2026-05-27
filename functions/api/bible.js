// functions/api/bible.js

export async function onRequest(context) {
  const { request } = context;
  
  // Récupère la clé API depuis les variables d'environnement de Cloudflare Pages
  const MISTRAL_API_KEY = context.env.MISTRAL_API_KEY;

  // En-têtes CORS obligatoires pour autoriser le frontend à consommer l'API
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

  // 2. Vérification de la méthode (Seul POST est autorisé pour cette endpoint)
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée. Utilisez POST." }), {
      status: 405,
      headers: corsHeaders
    });
  }

  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Clé API Mistral non configurée dans les variables d'environnement Cloudflare." }), {
      status: 500,
      headers: corsHeaders
    });
  }

  try {
    // 3. Parsing du corps de la requête
    let dataInput = {};
    try {
      dataInput = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Format JSON invalide." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const { book, chapter, verse } = dataInput;

    if (!book || !chapter) {
      return new Response(JSON.stringify({ error: "Les paramètres 'book' et 'chapter' sont requis." }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Construction du prompt pour obtenir exactement le texte demandé
    let promptText = `Donne moi le texte exact et complet du passage biblique suivant en version Louis Segond 1910 : ${book} chapitre ${chapter}`;
    
    if (verse) {
      promptText += `, verset ${verse}`;
    } else {
      promptText += ` (tout le chapitre)`;
    }
    
    promptText += `. Réponds UNIQUEMENT par le texte biblique, sans introduction, sans commentaire, sans 'Voici le texte'. Commence directement par le premier mot du verset. Si le chapitre est long, assure-toi de ne rien omettre.`;

    // Appel à l'API Mistral avec capacité étendue pour les longs chapitres
    // CORRECTION : Suppression de l'espace à la fin de l'URL
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-tiny", // Modèle rapide et efficace pour la restitution de texte
        messages: [
          {
            role: "system",
            content: "Tu es un expert biblique. Tu fournis uniquement le texte exact de la Bible en français (Louis Segond 1910). Tu ne donnes aucune explication, aucun ajout. Tu respectes scrupuleusement la ponctuation et la structure du texte original."
          },
          {
            role: "user",
            content: promptText
          }
        ],
        temperature: 0.1, // Très faible pour éviter toute hallucination ou modification du texte sacré
        max_tokens: 2500, // Augmenté à 2500 pour couvrir les chapitres les plus longs sans coupure
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
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error("Erreur interne bible.js:", error);
    return new Response(JSON.stringify({ error: error.message || "Une erreur inattendue est survenue." }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
