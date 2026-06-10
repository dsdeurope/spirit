/**
 * ═══════════════════════════════════════════════════════════
 * CLOUDFLARE WORKER — PROXY API MISTRAL + BOT TELEGRAM
 * ═══════════════════════════════════════════════════════════
 *
 * Secrets requis (wrangler secret put) :
 *   MISTRAL_API_KEY
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */

const APP_URL = 'https://spirit.zenithlab.net';

/* ─── Versets du jour (Louis Segond 1910) ─────────────────────────────── */
const DAILY_VERSES = [
  { ref: 'Jean 3:16',          text: 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.' },
  { ref: 'Psaume 23:1',        text: 'L\'Éternel est mon berger : je ne manquerai de rien.' },
  { ref: 'Romains 8:28',       text: 'Toutes choses concourent au bien de ceux qui aiment Dieu.' },
  { ref: 'Philippiens 4:13',   text: 'Je puis tout par celui qui me fortifie.' },
  { ref: 'Ésaïe 40:31',        text: 'Ceux qui se confient en l\'Éternel renouvellent leur force. Ils prennent le vol comme les aigles ; ils courent, et ne se lassent point ; ils marchent, et ne se fatiguent point.' },
  { ref: 'Jérémie 29:11',      text: 'Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance.' },
  { ref: 'Proverbes 3:5-6',    text: 'Confie-toi en l\'Éternel de tout ton cœur, et ne t\'appuie pas sur ta sagesse ; reconnais-le dans toutes tes voies, et il aplanira tes sentiers.' },
  { ref: 'Matthieu 11:28',     text: 'Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos.' },
  { ref: 'Psaume 46:2',        text: 'Dieu est pour nous un refuge et un appui, un secours qui ne manque jamais dans la détresse.' },
  { ref: '1 Corinthiens 13:4', text: 'L\'amour est patient, il est plein de bonté ; l\'amour n\'est point envieux ; l\'amour ne se vante point, il ne s\'enfle point d\'orgueil.' },
  { ref: 'Galates 5:22',       text: 'Mais le fruit de l\'Esprit, c\'est l\'amour, la joie, la paix, la patience, la bonté, la bénignité, la fidélité, la douceur, la tempérance.' },
  { ref: 'Josué 1:9',          text: 'Sois fort et courageux. Ne t\'effraie point et ne t\'épouvante point, car l\'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.' },
  { ref: 'Psaume 119:105',     text: 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.' },
  { ref: 'Matthieu 5:3',       text: 'Heureux ceux qui ont le cœur humble, car le royaume des cieux est à eux !' },
  { ref: 'Jean 14:6',          text: 'Jésus lui dit : Je suis le chemin, la vérité, et la vie. Nul ne vient au Père que par moi.' },
  { ref: 'Romains 8:1',        text: 'Il n\'y a donc maintenant aucune condamnation pour ceux qui sont en Jésus-Christ.' },
  { ref: 'Psaume 34:9',        text: 'Goûtez et voyez que l\'Éternel est bon. Heureux l\'homme qui cherche en lui son refuge !' },
  { ref: 'Ésaïe 41:10',        text: 'Ne crains rien, car je suis avec toi ; ne promène pas des regards inquiets, car je suis ton Dieu ; je te fortifie, je viens à ton secours.' },
  { ref: '2 Timothée 1:7',     text: 'Car ce n\'est pas un esprit de timidité que Dieu nous a donné, mais un esprit de force, d\'amour et de sagesse.' },
  { ref: 'Jean 1:1',           text: 'Au commencement était la Parole, et la Parole était avec Dieu, et la Parole était Dieu.' },
  { ref: 'Hébreux 11:1',       text: 'Or la foi est une ferme assurance des choses qu\'on espère, une démonstration de celles qu\'on ne voit pas.' },
  { ref: 'Jacques 1:17',       text: 'Toute grâce excellente et tout don parfait descendent d\'en haut, du Père des lumières, chez lequel il n\'y a ni changement ni ombre de variation.' },
  { ref: 'Psaume 27:1',        text: 'L\'Éternel est ma lumière et mon salut : de qui aurais-je crainte ? L\'Éternel est le soutien de ma vie : de qui aurais-je frayeur ?' },
  { ref: 'Romains 12:2',       text: 'Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l\'intelligence.' },
  { ref: 'Matthieu 6:33',      text: 'Cherchez premièrement le royaume et la justice de Dieu ; et toutes ces choses vous seront données par-dessus.' },
  { ref: 'Psaume 91:1',        text: 'Celui qui demeure sous l\'abri du Très-Haut repose à l\'ombre du Tout-Puissant.' },
  { ref: '1 Jean 4:19',        text: 'Nous l\'aimons, parce qu\'il nous a aimés le premier.' },
  { ref: 'Éphésiens 2:8',      text: 'Car c\'est par la grâce que vous êtes sauvés, par le moyen de la foi. Et cela ne vient pas de vous, c\'est le don de Dieu.' },
  { ref: 'Psaume 37:4',        text: 'Fais de l\'Éternel tes délices, et il te donnera ce que ton cœur désire.' },
  { ref: 'Lamentations 3:23',  text: 'Elles se renouvellent chaque matin. Ta fidélité est grande !' },
  { ref: 'Psaume 103:1',       text: 'Bénis l\'Éternel, ô mon âme ! Que tout ce qui est en moi bénisse son saint nom !' },
  { ref: 'Jean 10:10',         text: 'Le voleur ne vient que pour dérober, égorger et détruire ; moi, je suis venu afin que les brebis aient la vie, et qu\'elles soient dans l\'abondance.' },
  { ref: 'Apocalypse 3:20',    text: 'Voici, je me tiens à la porte, et je frappe. Si quelqu\'un entend ma voix et ouvre la porte, j\'entrerai chez lui, je souperai avec lui, et lui avec moi.' },
  { ref: 'Psaume 16:8',        text: 'J\'ai constamment l\'Éternel sous mes yeux ; quand il est à ma droite, je ne chancelle pas.' },
  { ref: 'Matthieu 28:20',     text: 'Et voici, je suis avec vous tous les jours, jusqu\'à la fin du monde.' },
  { ref: 'Philippiens 4:7',    text: 'Et la paix de Dieu, qui surpasse toute intelligence, gardera vos cœurs et vos pensées en Jésus-Christ.' },
  { ref: 'Ésaïe 53:5',         text: 'Mais il était blessé pour nos péchés, brisé pour nos iniquités ; le châtiment qui nous donne la paix est tombé sur lui, et c\'est par ses meurtrissures que nous sommes guéris.' },
  { ref: 'Psaume 121:1-2',     text: 'Je lève les yeux vers les montagnes… D\'où me viendra le secours ? Le secours me vient de l\'Éternel, qui a fait les cieux et la terre.' },
  { ref: 'Jean 16:33',         text: 'Dans le monde vous aurez des tribulations ; mais prenez courage, j\'ai vaincu le monde.' },
  { ref: '1 Pierre 5:7',       text: 'Déchargez-vous sur lui de tous vos soucis, car il prend soin de vous.' },
  { ref: 'Romains 5:8',        text: 'Mais Dieu prouve son amour envers nous, en ce que Christ est mort pour nous pendant que nous étions encore des pécheurs.' },
  { ref: 'Psaume 139:14',      text: 'Je te loue de ce que je suis une créature si merveilleuse. Tes œuvres sont admirables, et mon âme le reconnaît bien.' },
  { ref: 'Genèse 1:1',         text: 'Au commencement, Dieu créa les cieux et la terre.' },
  { ref: '2 Chroniques 7:14',  text: 'Si mon peuple sur qui mon nom est invoqué s\'humilie, prie, et cherche ma face, et s\'il se détourne de ses mauvaises voies, je l\'exaucerai des cieux, je lui pardonnerai son péché, et je guérirai son pays.' },
  { ref: 'Actes 1:8',          text: 'Mais vous recevrez une puissance, le Saint-Esprit survenant sur vous, et vous serez mes témoins à Jérusalem, dans toute la Judée, dans la Samarie, et jusqu\'aux extrémités de la terre.' },
  { ref: 'Marc 10:27',         text: 'Jésus les regarda et dit : Aux hommes cela est impossible, mais non à Dieu ; car tout est possible à Dieu.' },
  { ref: 'Psaume 51:12',       text: 'Rends-moi la joie de ton salut, et qu\'un esprit de bonne volonté me soutienne !' },
  { ref: 'Romains 10:9',       text: 'Si tu confesses de ta bouche le Seigneur Jésus, et si tu crois dans ton cœur que Dieu l\'a ressuscité des morts, tu seras sauvé.' },
  { ref: '1 Thessaloniciens 5:16-18', text: 'Soyez toujours joyeux. Priez sans cesse. Rendez grâces en toutes choses.' },
  { ref: 'Psaume 62:2',        text: 'Il est mon seul rocher et mon salut, ma haute retraite : je ne serai point ébranlé.' },
  { ref: 'Ésaïe 26:3',         text: 'A celui dont l\'esprit est ferme tu assures la paix, la paix, parce qu\'il se confie en toi.' },
  { ref: 'Jean 8:36',          text: 'Si donc le Fils vous affranchit, vous serez réellement libres.' },
  { ref: 'Luc 1:37',           text: 'Car rien n\'est impossible à Dieu.' },
  { ref: 'Matthieu 7:7',       text: 'Demandez, et l\'on vous donnera ; cherchez, et vous trouverez ; frappez, et l\'on vous ouvrira.' },
  { ref: 'Psaume 145:18',      text: 'L\'Éternel est près de tous ceux qui l\'invoquent, de tous ceux qui l\'invoquent en vérité.' },
  { ref: 'Éphésiens 6:10',     text: 'Au reste, fortifiez-vous dans le Seigneur, et par sa force toute-puissante.' },
  { ref: 'Colossiens 3:23',    text: 'Quoi que vous fassiez, faites-le de bon cœur, comme pour le Seigneur et non pour des hommes.' },
  { ref: 'Proverbes 16:9',     text: 'Le cœur de l\'homme médite sa voie, mais c\'est l\'Éternel qui dirige ses pas.' },
  { ref: 'Jean 15:5',          text: 'Je suis le cep, vous êtes les sarments. Celui qui demeure en moi et en qui je demeure porte beaucoup de fruit, car sans moi vous ne pouvez rien faire.' },
  { ref: 'Romains 15:13',      text: 'Que le Dieu de l\'espérance vous remplisse de toute joie et de toute paix dans la foi, pour que vous abondiez en espérance, par la puissance du Saint-Esprit !' },
  { ref: 'Hébreux 4:16',       text: 'Approchons-nous donc avec assurance du trône de la grâce, afin d\'obtenir miséricorde et de trouver grâce, pour être secourus dans nos besoins.' },
  { ref: 'Psaume 9:11',        text: 'Chantez à l\'Éternel, qui réside en Sion ; publiez parmi les peuples ses hauts faits !' },
  { ref: '1 Corinthiens 10:13',text: 'Dieu, qui est fidèle, ne permettra pas que vous soyez tentés au-delà de vos forces ; mais avec la tentation il préparera aussi le moyen d\'en sortir.' },
];

function getDailyVerse() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day   = Math.floor((now - start) / 86400000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}

/* ─── Telegram helpers ────────────────────────────────────────────────── */
async function tgCall(method, body, token) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sendDailyVerse(env) {
  const v = getDailyVerse();
  const text =
    `📖 *Verset du Jour*\n\n` +
    `_${v.ref}_\n\n` +
    `« ${v.text} »\n\n` +
    `⏱ *Choisissez votre durée d'étude :*`;

  return tgCall('sendMessage', {
    chat_id:    env.TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: '⏱ 2 min',  callback_data: 'lectio:2'  },
        { text: '⏱ 5 min',  callback_data: 'lectio:5'  },
        { text: '⏱ 10 min', callback_data: 'lectio:10' },
      ]],
    },
  }, env.TELEGRAM_BOT_TOKEN);
}

async function handleWebhook(request, env) {
  const update = await request.json();

  // Réponse à un bouton inline
  if (update.callback_query) {
    const cq   = update.callback_query;
    const data = cq.data; // 'lectio:2' | 'lectio:5' | 'lectio:10'

    await tgCall('answerCallbackQuery', { callback_query_id: cq.id }, env.TELEGRAM_BOT_TOKEN);

    if (data.startsWith('lectio:')) {
      const min = data.split(':')[1];
      const url = `${APP_URL}/?lectio=${min}`;
      await tgCall('sendMessage', {
        chat_id:    cq.message.chat.id,
        text:       `✨ Votre étude de *${min} min* est prête !`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: `📖 Ouvrir l'étude (${min} min)`, url },
          ]],
        },
      }, env.TELEGRAM_BOT_TOKEN);
    }
  }

  // Commande /verset
  if (update.message?.text === '/verset') {
    await sendDailyVerse({ ...env, TELEGRAM_CHAT_ID: update.message.chat.id });
  }

  return new Response('ok');
}

/* ─── Scheduled (Cron) ────────────────────────────────────────────────── */
async function scheduled(event, env, ctx) {
  ctx.waitUntil(sendDailyVerse(env));
}

/* ─── CORS headers ────────────────────────────────────────────────────── */
const cors = (env) => ({
  'Access-Control-Allow-Origin':  env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
});

/* ─── Main fetch handler ──────────────────────────────────────────────── */
async function fetchHandler(request, env, ctx) {
  const ch  = cors(env);
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') return new Response(null, { headers: ch });

  // Telegram webhook
  if (url.pathname === '/api/telegram' && request.method === 'POST') {
    return handleWebhook(request, env);
  }

  // Mistral proxy
  if (url.pathname === '/api/mistral') {
    if (request.method !== 'POST')
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...ch, 'Content-Type': 'application/json' } });

    if (!env.MISTRAL_API_KEY)
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });

    try {
      const body = await request.json();
      if (!body.messages || !Array.isArray(body.messages))
        return new Response(JSON.stringify({ error: 'Invalid request: messages array required' }), { status: 400, headers: { ...ch, 'Content-Type': 'application/json' } });

      const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.MISTRAL_API_KEY}` },
        body: JSON.stringify({
          model:           body.model || 'mistral-large-latest',
          messages:        body.messages,
          temperature:     body.temperature ?? 0.7,
          max_tokens:      body.max_tokens ?? 800,
          response_format: body.response_format,
        }),
      });

      if (!mistralResponse.ok) {
        const err = await mistralResponse.text();
        return new Response(JSON.stringify({ error: 'Mistral API error', status: mistralResponse.status, details: err }), { status: mistralResponse.status, headers: { ...ch, 'Content-Type': 'application/json' } });
      }

      const data = await mistralResponse.json();
      return new Response(JSON.stringify(data), { headers: { ...ch, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error', message: error.message }), { status: 500, headers: { ...ch, 'Content-Type': 'application/json' } });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...ch, 'Content-Type': 'application/json' } });
}

export default { fetch: fetchHandler, scheduled };
