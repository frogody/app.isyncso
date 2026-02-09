/**
 * UI string translations for the multi-language demo experience.
 * Simple flat maps — no runtime i18n library needed.
 */

const translations = {
  // Demo voice states
  'state.ready': {
    en: 'Ready', nl: 'Klaar', es: 'Listo', fr: 'Pr\u00eat', de: 'Bereit',
    it: 'Pronto', pt: 'Pronto', ja: '\u6e96\u5099\u5b8c\u4e86', ko: '\uc900\ube44', zh: '\u5c31\u7eea', hi: '\u0924\u0948\u092f\u093e\u0930',
  },
  'state.listening': {
    en: 'Listening...', nl: 'Luisteren...', es: 'Escuchando...', fr: '\u00c9coute...', de: 'H\u00f6ren...',
    it: 'Ascoltando...', pt: 'Ouvindo...', ja: '\u8074\u3044\u3066\u3044\u307e\u3059...', ko: '\ub4e3\uace0 \uc788\uc2b5\ub2c8\ub2e4...', zh: '\u6b63\u5728\u542c...', hi: '\u0938\u0941\u0928 \u0930\u0939\u093e \u0939\u0948...',
  },
  'state.thinking': {
    en: 'Thinking...', nl: 'Denken...', es: 'Pensando...', fr: 'R\u00e9flexion...', de: 'Denken...',
    it: 'Pensando...', pt: 'Pensando...', ja: '\u8003\u3048\u4e2d...', ko: '\uc0dd\uac01 \uc911...', zh: '\u601d\u8003\u4e2d...', hi: '\u0938\u094b\u091a \u0930\u0939\u093e \u0939\u0948...',
  },
  'state.speaking': {
    en: 'Speaking...', nl: 'Spreken...', es: 'Hablando...', fr: 'Parle...', de: 'Sprechen...',
    it: 'Parlando...', pt: 'Falando...', ja: '\u8a71\u3057\u3066\u3044\u307e\u3059...', ko: '\ub9d0\ud558\ub294 \uc911...', zh: '\u6b63\u5728\u8bf4...', hi: '\u092c\u094b\u0932 \u0930\u0939\u093e \u0939\u0948...',
  },

  // Demo controls
  'controls.back': {
    en: 'Back', nl: 'Terug', es: 'Atr\u00e1s', fr: 'Retour', de: 'Zur\u00fcck',
    it: 'Indietro', pt: 'Voltar', ja: '\u623b\u308b', ko: '\ub4a4\ub85c', zh: '\u8fd4\u56de', hi: '\u0935\u093e\u092a\u0938',
  },
  'controls.next': {
    en: 'Next', nl: 'Volgende', es: 'Siguiente', fr: 'Suivant', de: 'Weiter',
    it: 'Avanti', pt: 'Pr\u00f3ximo', ja: '\u6b21\u3078', ko: '\ub2e4\uc74c', zh: '\u4e0b\u4e00\u6b65', hi: '\u0905\u0917\u0932\u093e',
  },
  'controls.continueDemo': {
    en: 'Continue Demo', nl: 'Demo hervatten', es: 'Continuar demo', fr: 'Continuer la d\u00e9mo', de: 'Demo fortsetzen',
    it: 'Continua demo', pt: 'Continuar demo', ja: '\u30c7\u30e2\u3092\u7d9a\u3051\u308b', ko: '\ub370\ubaa8 \uacc4\uc18d', zh: '\u7ee7\u7eed\u6f14\u793a', hi: '\u0921\u0947\u092e\u094b \u091c\u093e\u0930\u0940 \u0930\u0916\u0947\u0902',
  },
  'controls.endDemo': {
    en: 'End demo', nl: 'Demo be\u00ebindigen', es: 'Finalizar demo', fr: 'Terminer la d\u00e9mo', de: 'Demo beenden',
    it: 'Fine demo', pt: 'Encerrar demo', ja: '\u30c7\u30e2\u3092\u7d42\u4e86', ko: '\ub370\ubaa8 \uc885\ub8cc', zh: '\u7ed3\u675f\u6f14\u793a', hi: '\u0921\u0947\u092e\u094b \u0938\u092e\u093e\u092a\u094d\u0924',
  },
  'controls.step': {
    en: 'Step {current} of {total}', nl: 'Stap {current} van {total}', es: 'Paso {current} de {total}', fr: '\u00c9tape {current} sur {total}', de: 'Schritt {current} von {total}',
    it: 'Passo {current} di {total}', pt: 'Etapa {current} de {total}', ja: '\u30b9\u30c6\u30c3\u30d7 {current}/{total}', ko: '{total}\uc911 {current}\ub2e8\uacc4', zh: '\u7b2c{current}\u6b65/\u5171{total}\u6b65', hi: '\u0915\u0926\u092e {current}/{total}',
  },

  // Voice panel
  'voice.speakAnytime': {
    en: 'Speak anytime to ask questions', nl: 'Spreek op elk moment om vragen te stellen', es: 'Habla en cualquier momento para hacer preguntas', fr: 'Parlez \u00e0 tout moment pour poser des questions', de: 'Sprechen Sie jederzeit, um Fragen zu stellen',
    it: 'Parla in qualsiasi momento per fare domande', pt: 'Fale a qualquer momento para fazer perguntas', ja: '\u3044\u3064\u3067\u3082\u8cea\u554f\u3067\u304d\u307e\u3059', ko: '\uc5b8\uc81c\ub4e0\uc9c0 \uc9c8\ubb38\ud558\uc138\uc694', zh: '\u968f\u65f6\u63d0\u95ee', hi: '\u0915\u092d\u0940 \u092d\u0940 \u0938\u0935\u093e\u0932 \u092a\u0942\u0921\u093c\u0947\u0902',
  },
  'voice.typeQuestion': {
    en: 'Type a question...', nl: 'Typ een vraag...', es: 'Escribe una pregunta...', fr: 'Tapez une question...', de: 'Frage eingeben...',
    it: 'Scrivi una domanda...', pt: 'Digite uma pergunta...', ja: '\u8cea\u554f\u3092\u5165\u529b...', ko: '\uc9c8\ubb38\uc744 \uc785\ub825\ud558\uc138\uc694...', zh: '\u8f93\u5165\u95ee\u9898...', hi: '\u0938\u0935\u093e\u0932 \u091f\u093e\u0907\u092a \u0915\u0930\u0947\u0902...',
  },

  // Discovery suggestions
  'discovery.revenue': {
    en: 'Revenue & Sales Growth', nl: 'Omzet & Verkoopgroei', es: 'Ingresos y Crecimiento de Ventas', fr: 'Revenus et Croissance des Ventes', de: 'Umsatz & Verkaufswachstum',
    it: 'Ricavi e Crescita Vendite', pt: 'Receita e Crescimento de Vendas', ja: '\u58f2\u4e0a\u3068\u55b6\u696d\u6210\u9577', ko: '\ub9e4\ucd9c \ubc0f \uc601\uc5c5 \uc131\uc7a5', zh: '\u6536\u5165\u4e0e\u9500\u552e\u589e\u957f', hi: '\u0930\u093e\u091c\u0938\u094d\u0935 \u0914\u0930 \u092c\u093f\u0915\u094d\u0930\u0940 \u0935\u0943\u0926\u094d\u0927\u093f',
  },
  'discovery.talent': {
    en: 'Hiring & Talent', nl: 'Werving & Talent', es: 'Contrataci\u00f3n y Talento', fr: 'Recrutement et Talents', de: 'Einstellung & Talent',
    it: 'Assunzioni e Talento', pt: 'Contrata\u00e7\u00e3o e Talentos', ja: '\u63a1\u7528\u3068\u4eba\u6750', ko: '\ucc44\uc6a9 \ubc0f \uc778\uc7ac', zh: '\u62db\u8058\u4e0e\u4eba\u624d', hi: '\u092d\u0930\u094d\u0924\u0940 \u0914\u0930 \u092a\u094d\u0930\u0924\u093f\u092d\u093e',
  },
  'discovery.finance': {
    en: 'Finance & Operations', nl: 'Financi\u00ebn & Operaties', es: 'Finanzas y Operaciones', fr: 'Finance et Op\u00e9rations', de: 'Finanzen & Betrieb',
    it: 'Finanza e Operazioni', pt: 'Finan\u00e7as e Opera\u00e7\u00f5es', ja: '\u8ca1\u52d9\u3068\u904b\u55b6', ko: '\uc7ac\ubb34 \ubc0f \uc6b4\uc601', zh: '\u8d22\u52a1\u4e0e\u8fd0\u8425', hi: '\u0935\u093f\u0924\u094d\u0924 \u0914\u0930 \u0938\u0902\u091a\u093e\u0932\u0928',
  },
  'discovery.everything': {
    en: 'Show me everything', nl: 'Laat alles zien', es: 'Mu\u00e9strame todo', fr: 'Montrez-moi tout', de: 'Zeig mir alles',
    it: 'Mostrami tutto', pt: 'Mostre-me tudo', ja: '\u5168\u90e8\u898b\u305b\u3066', ko: '\ubaa8\ub450 \ubcf4\uc5ec\uc8fc\uc138\uc694', zh: '\u5168\u90e8\u5c55\u793a', hi: '\u0938\u092c \u0926\u093f\u0916\u093e\u0913',
  },

  // RequestDemo page
  'request.startDemo': {
    en: 'Start My Personalized Demo', nl: 'Start mijn gepersonaliseerde demo', es: 'Iniciar mi demo personalizada', fr: 'D\u00e9marrer ma d\u00e9mo personnalis\u00e9e', de: 'Meine personalisierte Demo starten',
    it: 'Avvia la mia demo personalizzata', pt: 'Iniciar minha demo personalizada', ja: '\u30d1\u30fc\u30bd\u30ca\u30e9\u30a4\u30ba\u30c7\u30e2\u3092\u958b\u59cb', ko: '\ub098\ub9cc\uc758 \ub370\ubaa8 \uc2dc\uc791', zh: '\u5f00\u59cb\u6211\u7684\u4e2a\u6027\u5316\u6f14\u793a', hi: '\u092e\u0947\u0930\u093e \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0921\u0947\u092e\u094b \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902',
  },
  'request.buildingExperience': {
    en: 'Building your experience', nl: 'Ervaring wordt opgebouwd', es: 'Creando tu experiencia', fr: 'Cr\u00e9ation de votre exp\u00e9rience', de: 'Ihre Erfahrung wird erstellt',
    it: 'Creazione della tua esperienza', pt: 'Criando sua experi\u00eancia', ja: '\u4f53\u9a13\u3092\u69cb\u7bc9\u4e2d', ko: '\uacbd\u5075 \uc900\ube44 \uc911', zh: '\u6b63\u5728\u6784\u5efa\u60a8\u7684\u4f53\u9a8c', hi: '\u0906\u092a\u0915\u093e \u0905\u0928\u0941\u092d\u0935 \u0924\u0948\u092f\u093e\u0930 \u0939\u094b \u0930\u0939\u093e \u0939\u0948',
  },
  'request.personalizing': {
    en: 'Personalizing everything for {company}', nl: 'Alles personaliseren voor {company}', es: 'Personalizando todo para {company}', fr: 'Personnalisation pour {company}', de: 'Alles f\u00fcr {company} personalisieren',
    it: 'Personalizzazione per {company}', pt: 'Personalizando tudo para {company}', ja: '{company}\u5411\u3051\u306b\u30ab\u30b9\u30bf\u30de\u30a4\u30ba\u4e2d', ko: '{company}\uc744 \uc704\ud574 \ub9de\ucda4 \uc124\uc815 \uc911', zh: '\u6b63\u5728\u4e3a{company}\u8fdb\u884c\u4e2a\u6027\u5316', hi: '{company} \u0915\u0947 \u0932\u093f\u090f \u0938\u092c \u0915\u0941\u091b \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902',
  },
  'request.demoReady': {
    en: 'Your demo is ready \u2014 launching now', nl: 'Je demo is klaar \u2014 wordt nu gestart', es: 'Tu demo est\u00e1 lista \u2014 lanzando ahora', fr: 'Votre d\u00e9mo est pr\u00eate \u2014 lancement', de: 'Ihre Demo ist bereit \u2014 wird gestartet',
    it: 'La tua demo \u00e8 pronta \u2014 avvio in corso', pt: 'Sua demo est\u00e1 pronta \u2014 iniciando', ja: '\u30c7\u30e2\u306e\u6e96\u5099\u304c\u3067\u304d\u307e\u3057\u305f', ko: '\ub370\ubaa8\uac00 \uc900\ube44\ub418\uc5c8\uc2b5\ub2c8\ub2e4 \u2014 \uc2dc\uc791\ud569\ub2c8\ub2e4', zh: '\u6f14\u793a\u5df2\u5c31\u7eea \u2014 \u6b63\u5728\u542f\u52a8', hi: '\u0906\u092a\u0915\u093e \u0921\u0947\u092e\u094b \u0924\u0948\u092f\u093e\u0930 \u0939\u0948 \u2014 \u0936\u0941\u0930\u0942 \u0939\u094b \u0930\u0939\u093e \u0939\u0948',
  },
  'request.fillRequired': {
    en: 'Please fill in your name, email, and company.', nl: 'Vul je naam, e-mail en bedrijf in.', es: 'Por favor, completa tu nombre, correo y empresa.', fr: 'Veuillez remplir votre nom, e-mail et entreprise.', de: 'Bitte geben Sie Ihren Namen, E-Mail und Firma ein.',
    it: 'Compila nome, email e azienda.', pt: 'Preencha seu nome, e-mail e empresa.', ja: '\u540d\u524d\u3001\u30e1\u30fc\u30eb\u3001\u4f1a\u793e\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002', ko: '\uc774\ub984, \uc774\uba54\uc77c, \ud68c\uc0ac\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694.', zh: '\u8bf7\u586b\u5199\u60a8\u7684\u59d3\u540d\u3001\u90ae\u7bb1\u548c\u516c\u53f8\u3002', hi: '\u0915\u0943\u092a\u092f\u093e \u0905\u092a\u0928\u093e \u0928\u093e\u092e, \u0908\u092e\u0947\u0932 \u0914\u0930 \u0915\u0902\u092a\u0928\u0940 \u092d\u0930\u0947\u0902\u0964',
  },
  'request.error': {
    en: 'Something went wrong. Please try again.', nl: 'Er ging iets mis. Probeer het opnieuw.', es: 'Algo sali\u00f3 mal. Int\u00e9ntalo de nuevo.', fr: 'Une erreur est survenue. Veuillez r\u00e9essayer.', de: 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.',
    it: 'Qualcosa \u00e8 andato storto. Riprova.', pt: 'Algo deu errado. Tente novamente.', ja: '\u30a8\u30e9\u30fc\u304c\u767a\u751f\u3057\u307e\u3057\u305f\u3002\u518d\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044\u3002', ko: '\ubb38\uc81c\uac00 \ubc1c\uc0dd\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.', zh: '\u51fa\u4e86\u70b9\u95ee\u9898\uff0c\u8bf7\u91cd\u8bd5\u3002', hi: '\u0915\u0941\u091b \u0917\u0932\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964',
  },
  'request.noAccount': {
    en: 'No account needed. Your demo starts in under 30 seconds.', nl: 'Geen account nodig. Je demo start in minder dan 30 seconden.', es: 'Sin necesidad de cuenta. Tu demo comienza en menos de 30 segundos.', fr: 'Aucun compte requis. Votre d\u00e9mo d\u00e9marre en moins de 30 secondes.', de: 'Kein Konto erforderlich. Ihre Demo startet in unter 30 Sekunden.',
    it: 'Nessun account necessario. La demo inizia in meno di 30 secondi.', pt: 'Sem necessidade de conta. Sua demo come\u00e7a em menos de 30 segundos.', ja: '\u30a2\u30ab\u30a6\u30f3\u30c8\u4e0d\u8981\u300230\u79d2\u4ee5\u5185\u306b\u30c7\u30e2\u304c\u59cb\u307e\u308a\u307e\u3059\u3002', ko: '\uacc4\uc815 \ud544\uc694 \uc5c6\uc74c. 30\ucd08 \uc774\ub0b4\uc5d0 \ub370\ubaa8\uac00 \uc2dc\uc791\ub429\ub2c8\ub2e4.', zh: '\u65e0\u9700\u8d26\u6237\u300230\u79d2\u5185\u5f00\u59cb\u6f14\u793a\u3002', hi: '\u0915\u093f\u0938\u0940 \u0916\u093e\u0924\u0947 \u0915\u0940 \u091c\u0930\u0942\u0930\u0924 \u0928\u0939\u0940\u0902\u0964 30 \u0938\u0947\u0915\u0902\u0921 \u092e\u0947\u0902 \u0921\u0947\u092e\u094b \u0936\u0941\u0930\u0942\u0964',
  },

  // Phase labels
  'phase.enriching': {
    en: 'Analyzing your company', nl: 'Je bedrijf analyseren', es: 'Analizando tu empresa', fr: 'Analyse de votre entreprise', de: 'Analyse Ihres Unternehmens',
    it: 'Analisi della tua azienda', pt: 'Analisando sua empresa', ja: '\u4f1a\u793e\u3092\u5206\u6790\u4e2d', ko: '\ud68c\uc0ac \ubd84\uc11d \uc911', zh: '\u6b63\u5728\u5206\u6790\u60a8\u7684\u516c\u53f8', hi: '\u0906\u092a\u0915\u0940 \u0915\u0902\u092a\u0928\u0940 \u0915\u093e \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923',
  },
  'phase.enrichingDesc': {
    en: 'Gathering intelligence from public sources', nl: 'Gegevens verzamelen uit openbare bronnen', es: 'Recopilando informaci\u00f3n de fuentes p\u00fablicas', fr: 'Collecte d\'informations publiques', de: 'Informationen aus \u00f6ffentlichen Quellen sammeln',
    it: 'Raccolta informazioni da fonti pubbliche', pt: 'Coletando dados de fontes p\u00fablicas', ja: '\u516c\u958b\u60c5\u5831\u3092\u53ce\u96c6\u4e2d', ko: '\uacf5\uac1c \uc790\ub8cc\uc5d0\uc11c \uc815\ubcf4 \uc218\uc9d1 \uc911', zh: '\u4ece\u516c\u5f00\u6e90\u6536\u96c6\u4fe1\u606f', hi: '\u0938\u093e\u0930\u094d\u0935\u091c\u0928\u093f\u0915 \u0938\u094d\u0930\u094b\u0924\u094b\u0902 \u0938\u0947 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u090f\u0915\u0924\u094d\u0930 \u0915\u0930\u0928\u093e',
  },
  'phase.researching': {
    en: 'Building your demo strategy', nl: 'Demo-strategie opbouwen', es: 'Creando tu estrategia de demo', fr: 'Cr\u00e9ation de votre strat\u00e9gie', de: 'Demo-Strategie wird erstellt',
    it: 'Creazione strategia demo', pt: 'Criando sua estrat\u00e9gia de demo', ja: '\u30c7\u30e2\u6226\u7565\u3092\u69cb\u7bc9\u4e2d', ko: '\ub370\ubaa8 \uc804\ub7b5 \uc218\ub9bd \uc911', zh: '\u6b63\u5728\u5236\u5b9a\u6f14\u793a\u7b56\u7565', hi: '\u0906\u092a\u0915\u0940 \u0921\u0947\u092e\u094b \u0930\u0923\u0928\u0940\u0924\u093f \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0928\u093e',
  },
  'phase.researchingDesc': {
    en: 'Personalizing the experience for your team', nl: 'De ervaring personaliseren voor je team', es: 'Personalizando la experiencia para tu equipo', fr: 'Personnalisation pour votre \u00e9quipe', de: 'Erfahrung f\u00fcr Ihr Team personalisieren',
    it: 'Personalizzazione per il tuo team', pt: 'Personalizando a experi\u00eancia para sua equipe', ja: '\u30c1\u30fc\u30e0\u5411\u3051\u306b\u30ab\u30b9\u30bf\u30de\u30a4\u30ba\u4e2d', ko: '\ud300\uc744 \uc704\ud574 \uacbd\u5075 \ub9de\ucda4\ud654 \uc911', zh: '\u4e3a\u60a8\u7684\u56e2\u961f\u4e2a\u6027\u5316', hi: '\u0906\u092a\u0915\u0940 \u091f\u0940\u092e \u0915\u0947 \u0932\u093f\u090f \u0905\u0928\u0941\u092d\u0935 \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0915\u0930\u0928\u093e',
  },
  'phase.creating': {
    en: 'Preparing your personalized demo', nl: 'Je gepersonaliseerde demo voorbereiden', es: 'Preparando tu demo personalizada', fr: 'Pr\u00e9paration de votre d\u00e9mo', de: 'Ihre personalisierte Demo wird vorbereitet',
    it: 'Preparazione della demo personalizzata', pt: 'Preparando sua demo personalizada', ja: '\u30d1\u30fc\u30bd\u30ca\u30e9\u30a4\u30ba\u30c7\u30e2\u3092\u6e96\u5099\u4e2d', ko: '\ub9de\ucda4\ud615 \ub370\ubaa8 \uc900\ube44 \uc911', zh: '\u6b63\u5728\u51c6\u5907\u60a8\u7684\u4e2a\u6027\u5316\u6f14\u793a', hi: '\u0906\u092a\u0915\u093e \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0921\u0947\u092e\u094b \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0928\u093e',
  },
  'phase.creatingDesc': {
    en: 'Setting up your interactive walkthrough', nl: 'Je interactieve rondleiding instellen', es: 'Configurando tu recorrido interactivo', fr: 'Mise en place de votre visite interactive', de: 'Interaktive Rundgang wird eingerichtet',
    it: 'Configurazione del tour interattivo', pt: 'Configurando seu tour interativo', ja: '\u30a4\u30f3\u30bf\u30e9\u30af\u30c6\u30a3\u30d6\u30a6\u30a9\u30fc\u30af\u30b9\u30eb\u30fc\u3092\u8a2d\u5b9a\u4e2d', ko: '\uc778\ud130\ub799\ud2f0\ube0c \uc548\ub0b4 \uc124\uc815 \uc911', zh: '\u6b63\u5728\u8bbe\u7f6e\u60a8\u7684\u4ea4\u4e92\u5f0f\u6f14\u793a', hi: '\u0906\u092a\u0915\u093e \u0907\u0902\u091f\u0930\u0948\u0915\u094d\u091f\u093f\u0935 \u0935\u0949\u0915\u0925\u094d\u0930\u0942 \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0928\u093e',
  },

  // DemoExperience
  'demo.noToken': {
    en: 'Please use a valid demo link to access this experience.', nl: 'Gebruik een geldige demo-link om toegang te krijgen.', es: 'Usa un enlace de demo v\u00e1lido para acceder.', fr: 'Veuillez utiliser un lien de d\u00e9mo valide.', de: 'Bitte verwenden Sie einen g\u00fcltigen Demo-Link.',
    it: 'Usa un link demo valido per accedere.', pt: 'Use um link de demo v\u00e1lido para acessar.', ja: '\u6709\u52b9\u306a\u30c7\u30e2\u30ea\u30f3\u30af\u3092\u4f7f\u7528\u3057\u3066\u304f\u3060\u3055\u3044\u3002', ko: '\uc720\ud6a8\ud55c \ub370\ubaa8 \ub9c1\ud06c\ub97c \uc0ac\uc6a9\ud574\uc8fc\uc138\uc694.', zh: '\u8bf7\u4f7f\u7528\u6709\u6548\u7684\u6f14\u793a\u94fe\u63a5\u3002', hi: '\u0915\u0943\u092a\u092f\u093e \u090f\u0915 \u0935\u0948\u0927 \u0921\u0947\u092e\u094b \u0932\u093f\u0902\u0915 \u0915\u093e \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0947\u0902\u0964',
  },
  'demo.preparing': {
    en: 'Preparing your demo...', nl: 'Demo wordt voorbereid...', es: 'Preparando tu demo...', fr: 'Pr\u00e9paration de votre d\u00e9mo...', de: 'Demo wird vorbereitet...',
    it: 'Preparazione della demo...', pt: 'Preparando sua demo...', ja: '\u30c7\u30e2\u3092\u6e96\u5099\u4e2d...', ko: '\ub370\ubaa8 \uc900\ube44 \uc911...', zh: '\u6b63\u5728\u51c6\u5907\u6f14\u793a...', hi: '\u0921\u0947\u092e\u094b \u0924\u0948\u092f\u093e\u0930 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...',
  },
  'demo.welcome': {
    en: 'Welcome, {name}', nl: 'Welkom, {name}', es: 'Bienvenido, {name}', fr: 'Bienvenue, {name}', de: 'Willkommen, {name}',
    it: 'Benvenuto, {name}', pt: 'Bem-vindo, {name}', ja: '\u3088\u3046\u3053\u305d\u3001{name}\u3055\u3093', ko: '\ud658\uc601\ud569\ub2c8\ub2e4, {name}\ub2d8', zh: '\u6b22\u8fce\uff0c{name}', hi: '\u0938\u094d\u0935\u093e\u0917\u0924 \u0939\u0948, {name}',
  },
  'demo.settingUp': {
    en: 'Setting up your personalized experience', nl: 'Je gepersonaliseerde ervaring instellen', es: 'Configurando tu experiencia personalizada', fr: 'Mise en place de votre exp\u00e9rience', de: 'Ihre personalisierte Erfahrung wird eingerichtet',
    it: 'Configurazione esperienza personalizzata', pt: 'Configurando sua experi\u00eancia personalizada', ja: '\u30d1\u30fc\u30bd\u30ca\u30e9\u30a4\u30ba\u4f53\u9a13\u3092\u6e96\u5099\u4e2d', ko: '\ub9de\ucda4\ud615 \uacbd\ud5d8 \uc124\uc815 \uc911', zh: '\u6b63\u5728\u8bbe\u7f6e\u60a8\u7684\u4e2a\u6027\u5316\u4f53\u9a8c', hi: '\u0906\u092a\u0915\u093e \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0905\u0928\u0941\u092d\u0935 \u0924\u0948\u092f\u093e\u0930 \u0939\u094b \u0930\u0939\u093e \u0939\u0948',
  },
  'demo.thanks': {
    en: 'Thanks for exploring iSyncso', nl: 'Bedankt voor het verkennen van iSyncso', es: 'Gracias por explorar iSyncso', fr: 'Merci d\'avoir explor\u00e9 iSyncso', de: 'Danke f\u00fcr die Erkundung von iSyncso',
    it: 'Grazie per aver esplorato iSyncso', pt: 'Obrigado por explorar o iSyncso', ja: 'iSyncso\u3092\u3054\u89a7\u3044\u305f\u3060\u304d\u3042\u308a\u304c\u3068\u3046\u3054\u3056\u3044\u307e\u3059', ko: 'iSyncso\ub97c \ud0d0\uc0c9\ud574 \uc8fc\uc154\uc11c \uac10\uc0ac\ud569\ub2c8\ub2e4', zh: '\u611f\u8c22\u60a8\u63a2\u7d22 iSyncso', hi: 'iSyncso \u0915\u094b \u090f\u0915\u094d\u0938\u092a\u094d\u0932\u094b\u0930 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0927\u0928\u094d\u092f\u0935\u093e\u0926',
  },
  'demo.scheduleCall': {
    en: 'Schedule a Call', nl: 'Plan een gesprek', es: 'Programar una llamada', fr: 'Planifier un appel', de: 'Gespr\u00e4ch planen',
    it: 'Pianifica una chiamata', pt: 'Agendar uma liga\u00e7\u00e3o', ja: '\u901a\u8a71\u3092\u4e88\u7d04', ko: '\ud1b5\ud654 \uc608\uc57d', zh: '\u9884\u7ea6\u901a\u8bdd', hi: '\u0915\u0949\u0932 \u0936\u0947\u0921\u094d\u092f\u0942\u0932 \u0915\u0930\u0947\u0902',
  },
  'demo.replayDemo': {
    en: 'Replay Demo', nl: 'Demo opnieuw afspelen', es: 'Repetir demo', fr: 'Rejouer la d\u00e9mo', de: 'Demo wiederholen',
    it: 'Ripeti demo', pt: 'Repetir demo', ja: '\u30c7\u30e2\u3092\u518d\u751f', ko: '\ub370\ubaa8 \ub2e4\uc2dc \ubcf4\uae30', zh: '\u91cd\u64ad\u6f14\u793a', hi: '\u0921\u0947\u092e\u094b \u0926\u094b\u092c\u093e\u0930\u093e \u091a\u0932\u093e\u090f\u0902',
  },
  'demo.readyToStart': {
    en: 'Ready to Get Started?', nl: 'Klaar om te beginnen?', es: '\u00bfListo para comenzar?', fr: 'Pr\u00eat \u00e0 commencer?', de: 'Bereit anzufangen?',
    it: 'Pronto per iniziare?', pt: 'Pronto para come\u00e7ar?', ja: '\u59cb\u3081\u307e\u3057\u3087\u3046\u304b\uff1f', ko: '\uc2dc\uc791\ud560 \uc900\ube44\uac00 \ub418\uc168\ub098\uc694?', zh: '\u51c6\u5907\u597d\u5f00\u59cb\u4e86\u5417\uff1f', hi: '\u0936\u0941\u0930\u0942 \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u0924\u0948\u092f\u093e\u0930?',
  },
  'demo.loadingPage': {
    en: 'Loading page...', nl: 'Pagina laden...', es: 'Cargando p\u00e1gina...', fr: 'Chargement...', de: 'Seite wird geladen...',
    it: 'Caricamento pagina...', pt: 'Carregando p\u00e1gina...', ja: '\u30da\u30fc\u30b8\u3092\u8aad\u307f\u8fbc\u307f\u4e2d...', ko: '\ud398\uc774\uc9c0 \ub85c\ub529 \uc911...', zh: '\u6b63\u5728\u52a0\u8f7d\u9875\u9762...', hi: '\u092a\u0947\u091c \u0932\u094b\u0921 \u0939\u094b \u0930\u0939\u093e \u0939\u0948...',
  },

  // Closing page
  'demo.closingText': {
    en: "That was a quick tour of iSyncso for {company}. Speak or type to ask any final questions.",
    nl: "Dat was een korte rondleiding door iSyncso voor {company}. Spreek of typ om eventuele laatste vragen te stellen.",
    es: "Eso fue un recorrido rápido por iSyncso para {company}. Habla o escribe para hacer preguntas finales.",
    fr: "C'était un aperçu rapide d'iSyncso pour {company}. Parlez ou tapez pour poser vos dernières questions.",
    de: "Das war eine kurze Tour durch iSyncso für {company}. Sprechen oder tippen Sie, um letzte Fragen zu stellen.",
    it: "Questo è stato un tour rapido di iSyncso per {company}. Parla o scrivi per fare le ultime domande.",
    pt: "Esse foi um tour rápido pelo iSyncso para a {company}. Fale ou digite para fazer perguntas finais.",
    ja: "{company}のためのiSyncsoクイックツアーでした。最後の質問があれば、話すか入力してください。",
    ko: "{company}를 위한 iSyncso 간단한 투어였습니다. 마지막 질문이 있으면 말하거나 입력하세요.",
    zh: "这是为{company}准备的 iSyncso 快速导览。如有最后的问题，请说或输入。",
    hi: "यह {company} के लिए iSyncso का एक त्वरित दौरा था। अंतिम प्रश्न पूछने के लिए बोलें या टाइप करें।",
  },

  // Discovery greeting (spoken by SYNC at demo start)
  'discovery.greeting': {
    en: "Hey {name}! Before I walk you through iSyncso, I'd love to know — what's most important for {company} right now? Are you looking to grow revenue, hire talent, streamline finances, or something else entirely?",
    nl: "Hoi {name}! Voordat ik je door iSyncso leid, wil ik graag weten — wat is op dit moment het belangrijkst voor {company}? Wil je de omzet laten groeien, talent aannemen, de financiën stroomlijnen, of iets anders?",
    es: "¡Hola {name}! Antes de mostrarte iSyncso, me encantaría saber — ¿qué es lo más importante para {company} ahora mismo? ¿Buscas aumentar ingresos, contratar talento, optimizar finanzas, o algo completamente diferente?",
    fr: "Salut {name} ! Avant de vous présenter iSyncso, j'aimerais savoir — qu'est-ce qui est le plus important pour {company} en ce moment ? Vous cherchez à augmenter le chiffre d'affaires, recruter des talents, optimiser les finances, ou autre chose ?",
    de: "Hey {name}! Bevor ich dir iSyncso zeige, würde ich gerne wissen — was ist für {company} gerade am wichtigsten? Möchtest du den Umsatz steigern, Talente einstellen, die Finanzen optimieren, oder etwas ganz anderes?",
    it: "Ciao {name}! Prima di mostrarti iSyncso, vorrei sapere — cosa è più importante per {company} in questo momento? Vuoi far crescere il fatturato, assumere talenti, ottimizzare le finanze, o qualcos'altro?",
    pt: "Olá {name}! Antes de te mostrar o iSyncso, gostaria de saber — o que é mais importante para a {company} agora? Procura aumentar receitas, contratar talentos, otimizar finanças, ou algo completamente diferente?",
    ja: "こんにちは{name}さん！iSyncsoをご紹介する前に、{company}にとって今一番大切なことを教えてください。売上を伸ばしたい、人材を採用したい、財務を効率化したい、それとも他に何かありますか？",
    ko: "안녕하세요 {name}님! iSyncso를 안내해 드리기 전에, {company}에서 지금 가장 중요한 것이 무엇인지 알고 싶습니다. 매출 성장, 인재 채용, 재무 관리, 아니면 다른 것을 찾고 계신가요?",
    zh: "你好 {name}！在我带你了解 iSyncso 之前，我想知道——{company} 现在最重要的是什么？你想增长收入、招聘人才、优化财务，还是其他什么？",
    hi: "नमस्ते {name}! iSyncso के बारे में बताने से पहले, मैं जानना चाहूंगा — {company} के लिए अभी सबसे ज़रूरी क्या है? क्या आप राजस्व बढ़ाना चाहते हैं, प्रतिभा भर्ती करना, वित्त को सुव्यवस्थित करना, या कुछ और?",
  },

  // Language selector
  'language.label': {
    en: 'Demo language', nl: 'Demotaal', es: 'Idioma de la demo', fr: 'Langue de la d\u00e9mo', de: 'Demo-Sprache',
    it: 'Lingua della demo', pt: 'Idioma da demo', ja: '\u30c7\u30e2\u306e\u8a00\u8a9e', ko: '\ub370\ubaa8 \uc5b8\uc5b4', zh: '\u6f14\u793a\u8bed\u8a00', hi: '\u0921\u0947\u092e\u094b \u092d\u093e\u0937\u093e',
  },
};

/**
 * Translate a key to a given language, with optional variable interpolation.
 * @param {string} key - Translation key (e.g. 'controls.next')
 * @param {string} lang - Language code (e.g. 'nl')
 * @param {Record<string, string>} [vars] - Variables to interpolate (e.g. { company: 'Acme' })
 * @returns {string}
 */
export function t(key, lang = 'en', vars) {
  const entry = translations[key];
  if (!entry) return key;
  let str = entry[lang] || entry.en || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
  }
  return str;
}

export default translations;
