const ELECTION_DATA = {
  meta: {
    countryCode: 'ar',
    countryName: 'Argentina',
    lang: 'es-AR',
    basePath: '/ar',
    statsCountry: 'ar',
    title: 'PolitiFácil Argentina',
    badge: '2027',
    subtitle: 'Argentina · Rumbo a Presidenciales y Legislativas 2027',
    electionDate: '2027-10-24',
    electionDateDisplay: '24 de octubre de 2027',
    electionTimeIso: '2027-10-24T08:00:00-03:00',
    countdownLabel: 'para las Presidenciales y Legislativas 2027',
    decree: 'Código Electoral Nacional (Ley 19.945) · Ciclo Presidencial y Legislativo 2027',
    seatsCongress: 257,
    seatsCongressMajority: 129,
    seatsSenate: 72,
    electoralCensus: 35987634,
    chamberSummary: '257 bancas en Diputados · 72 en el Senado',
    defaultSelectedPartyId: 'provincias-unidas',
    defaultPairLeft: 'fuerza-patria',
    defaultPairRight: 'lla',
    defaultAxis: 'economia',
    seedStats: { totalParticipants: 0, averageScore: 50.0 },
    shareSlug: 'argentina-2027',
    shareTitle: 'Mi Brújula Electoral Argentina 2027',
    sectionTitles: {
      'arco-overview': 'PolitiFácil Argentina 2027 | Comparador Electoral Neutral y Test de Afinidad',
      comparador: 'Comparador de Propuestas a Ciegas Argentina 2027 | PolitiFácil',
      entrevistas: 'Entrevistas a Referentes de Argentina (Sin Opinión) | PolitiFácil',
      'test-afinidad': 'Test de Afinidad Argentina 2027 (10 Escenarios Sin Siglas) | PolitiFácil',
    },
  },

  axes: [
    { id: 'economia', label: 'Economía, Inflación, Dólar e Impuestos', icon: '💵' },
    { id: 'empleo', label: 'Trabajo, Salarios y Reforma Laboral', icon: '💼' },
    { id: 'servicios', label: 'Salud, Educación Pública y Jubilaciones', icon: '🏥' },
    { id: 'vivienda', label: 'Vivienda, Alquileres y Obra Pública', icon: '🏠' },
    { id: 'federalismo', label: 'Federalismo, Coparticipación y Estado', icon: '🏛️' },
    { id: 'seguridad', label: 'Seguridad, Justicia y Política Exterior', icon: '🛡️' },
    { id: 'produccion', label: 'Energía, Vaca Muerta, Campo e Industria', icon: '🌱' },
    { id: 'instituciones', label: 'Instituciones, Transparencia y Derechos', icon: '⚖️' },
  ],

  parties: [
    {
      id: 'fit-u',
      name: 'Frente de Izquierda y de Trabajadores - Unidad',
      shortName: 'FIT-U',
      candidate: 'Myriam Bregman',
      ideologyLabel: 'Izquierda anticapitalista y socialista',
      spectrumScore: 10,
      economicAxis: 6,
      socialTerritorialAxis: 12,
      color: '#dc2626',
      officialUrl: 'https://laizquierdadiario.com',
      secondaryUrl: 'https://pts.org.ar',
      summary:
        'Plantea el desconocimiento soberano de la deuda externa y la ruptura con el FMI, la estatización bajo control obrero de sectores estratégicos, prohibición de despidos, reducción de la jornada laboral a 6 horas y defensa de la movilización callejera.',
      officialCommunication: {
        slogans: [
          'La crisis la tienen que pagar los capitalistas',
          'Ni ajuste ni FMI',
          'Trabajar 6 horas para que trabajemos todos',
          'Contra el régimen del ajuste',
        ],
        tone: 'Militante, confrontativo con todo el arco patronal y parlamentario tradicional; prioriza la denuncia social y la movilización callejera.',
        framing:
          'Enmarca el debate político como una disputa directa entre trabajadores, jubilados y juventudes precarizadas frente a grandes grupos económicos, el FMI y las fuerzas que facilitan leyes de ajuste.',
        channels:
          'Prensa partidaria digital (La Izquierda Diario), banca parlamentaria en Diputados, cobertura directa de conflictos gremiales y redes de asambleas.',
        keywords: [
          'Ruptura con el FMI',
          'No pago de la deuda',
          'Salario igual a canasta familiar',
          'Banca estatal única',
          'Jornada de 6 horas',
          'Control obrero',
        ],
      },
      interviewStyle: {
        summary:
          'Firme, rápida y polémica en debates televisivos y radiales; contrasta leyes laborales y presupuestos con casos concretos de fábricas, hospitales y jubilaciones.',
        register: 'Asertivo, sindical-clasista y de refutación directa al oficialismo y al peronismo.',
      },
      proposals: {
        economia: {
          headline: 'No pago de la deuda externa, ruptura con el FMI y banca estatal única',
          points: [
            'Desconocimiento soberano de la deuda externa fraudulenta y ruptura inmediata de los acuerdos y metas fiscales con el FMI.',
            'Nacionalización integral del sistema bancario y monopolio estatal del comercio exterior para frenar la fuga de capitales y la especulación cambiaria.',
            'Impuesto extraordinario y progresivo a las grandes fortunas, bancos y corporaciones agroexportadoras, y eliminación del IVA a la canasta básica.',
          ],
          sourceLabel: 'Plataforma Electoral FIT-U / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        empleo: {
          headline: 'Jornada de 6 horas sin rebaja salarial, salario mínimo vital y fin de la tercerización',
          points: [
            'Reducción de la jornada laboral a 6 horas diarias y 5 días semanales sin recorte de sueldo para repartir las horas de trabajo disponibles.',
            'Salario mínimo igual al costo real de la canasta familiar, indexado automáticamente por inflación mensual.',
            'Derogación de reformas de flexibilización laboral, pase a planta de contratados/plataformas y prohibición de despidos y suspensiones.',
          ],
          sourceLabel: 'Programa FIT-U / pts.org.ar',
          sourceUrl: 'https://pts.org.ar',
        },
        servicios: {
          headline: 'Presupuesto de emergencia en salud y universidades, jubilación al 82 % móvil',
          points: [
            'Triplicación inmediata del presupuesto de educación pública, ciencia y universidades nacionales, y eliminación de subsidios a la enseñanza privada.',
            'Sistema único estatal, gratuito y universal de salud con producción pública de medicamentos.',
            'Restitución inmediata del 82 % móvil para las jubilaciones, con haberes mínimos iguales a la canasta básica del adulto mayor y restitución de moratorias.',
          ],
          sourceLabel: 'Plataforma FIT-U / laizquierdadiario.com',
          sourceUrl: 'https://laizquierdadiario.com',
        },
        vivienda: {
          headline: 'Créditos a tasa cero, impuesto a viviendas ociosas y urbanización integral',
          points: [
            'Impuesto fuertemente progresivo a viviendas ociosas en manos de grandes tenedores y fondos inmobiliarios para volcarlas al alquiler social.',
            'Plan estatal masivo de obra pública y urbanización de barrios populares bajo control de vecinos y comisiones de trabajadores.',
            'Suspensión de desalojos por mora salarial y regulación estatal de los alquileres atada a la evolución de los ingresos.',
          ],
          sourceLabel: 'Plataforma Electoral FIT-U / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        federalismo: {
          headline: 'Planificación federal de recursos sin pactos de ajuste con gobernadores',
          points: [
            'Rechazo a los pactos fiscales que transfieren recortes nacionales a las administraciones provinciales y municipales.',
            'Financiamiento nacional directo de infraestructura básica en el norte y la Patagonia con fondos recuperados del pago de deuda.',
            'Abolición de regímenes fiscales especiales y exenciones impositivas otorgadas a grandes corporaciones extractivas en las provincias.',
          ],
          sourceLabel: 'pts.org.ar — Programa Nacional',
          sourceUrl: 'https://pts.org.ar',
        },
        seguridad: {
          headline: 'Derogación de protocolos represivos, juicio político al abuso policial y no alineamiento',
          points: [
            'Derogación del protocolo antipiquetes y rechazo a la intervención de las Fuerzas Armadas en tareas de seguridad interior.',
            'Desmantelamiento de las fuerzas de inteligencia interna, apertura de archivos y control popular sobre las cúpulas policiales.',
            'Política exterior antiimperialista: rechazo al alineamiento automático con Washington o el FMI e integración solidaria latinoamericana.',
          ],
          sourceLabel: 'laizquierdadiario.com / Plataforma FIT-U',
          sourceUrl: 'https://laizquierdadiario.com',
        },
        produccion: {
          headline: 'Estatización de energía, litio y puertos bajo control de trabajadores y comunidades',
          points: [
            'Renacionalización total de YPF, el litio, las empresas de energía eléctrica, gas y los puertos exportadores bajo gestión de trabajadores y usuarios.',
            'Prohibición de desmontes y control ambiental vinculante por asambleas locales en minería e hidrocarburos.',
            'Reforma agraria democrática con expropiación de grandes latifundios improductivos y fomento a la agricultura familiar sin agrotóxicos.',
          ],
          sourceLabel: 'Plataforma FIT-U / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        instituciones: {
          headline: 'Elección popular de jueces, revocabilidad de cargos y dieta igual a un docente',
          points: [
            'Todo diputado, senador, funcionario y juez debe cobrar exactamente lo mismo que una maestra de escuela o trabajador calificado, con mandatos revocables.',
            'Elección directa por voto popular de jueces y fiscales, y disolución del Senado hacia una Asamblea Única representativa.',
            'Defensa plena del derecho al aborto legal, educación sexual integral (ESI), cupo laboral trans y separación efectiva de Iglesia y Estado.',
          ],
          sourceLabel: 'pts.org.ar — Reforma Política',
          sourceUrl: 'https://pts.org.ar',
        },
      },
    },

    {
      id: 'fuerza-patria',
      name: 'Fuerza Patria (Peronismo / PJ)',
      shortName: 'Fuerza Patria',
      candidate: 'Axel Kicillof',
      ideologyLabel: 'Peronismo nacional-desarrollista y estatalista',
      spectrumScore: 30,
      economicAxis: 26,
      socialTerritorialAxis: 32,
      color: '#0284c7',
      officialUrl: 'https://pj.org.ar',
      secondaryUrl: 'https://www.electoral.gob.ar',
      summary:
        'Agrupa al peronismo y sus aliados en defensa del mercado interno, la industria nacional, la obra pública, la paritaria libre y un Estado regulador frente al ajuste fiscal y la apertura irrestricta de importaciones.',
      officialCommunication: {
        slogans: [
          'Producción, trabajo y soberanía nacional',
          'Escudo y red frente al ajuste',
          'El Estado presente donde el mercado no llega',
          'Defender la industria y la universidad pública',
        ],
        tone: 'Pedagógico-económico y confrontativo con el modelo libertario; combina defensa de gestión provincial con reivindicación histórica de derechos sociales.',
        framing:
          'Presenta la elección como una disyuntiva entre un proyecto de industrialización, educación y consumo interno versus la desregulación financiera, la reprimarización económica y la caída del salario real.',
        channels:
          'Actos territoriales en el conurbano bonaerense e interior, redes del PJ y gobernadores afines, entrevistas extensas en medios nacionales y canales de streaming.',
        keywords: [
          'Mercado interno',
          'Industria nacional',
          'Paritarias libres',
          'Obra pública',
          'Soberanía energética',
          'Universidad pública',
        ],
      },
      interviewStyle: {
        summary:
          'Explicativo y detallista en cifras macroeconómicas; cuestiona la "falsa antinomia entre Estado y mercado" y vincula la baja inflacionaria oficialista con la recesión industrial y el cierre de pymes.',
        register: 'Didáctico-académico combinado con tono político de barricada territorial.',
      },
      proposals: {
        economia: {
          headline: 'Reindustrialización, administración del comercio exterior y alivio tributario a pymes',
          points: [
            'Política macroeconómica orientada al crecimiento, el consumo interno y la defensa de pymes industriales frente a la apertura indiscriminada de importaciones.',
            'Segmentación y alivio de impuestos regresivos al consumo y a las economías regionales, compensado con mayor progresividad sobre rentas financieras y grandes patrimonios.',
            'Administración inteligente de divisas para priorizar insumos productivos, tecnología e infraestructura, y renegociación soberana de los vencimientos externos.',
          ],
          sourceLabel: 'Plataforma Electoral Fuerza Patria / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        empleo: {
          headline: 'Defensa de paritarias libres, indemnizaciones vigentes y crédito productivo para pymes',
          points: [
            'Rechazo frontal a la flexibilización laboral que recorta indemnizaciones, debilita convenios colectivos o desregula la jornada.',
            'Fortalecimiento de la negociación paritaria colectiva para recuperar el poder adquisitivo salarial perdido y combate a la informalidad mediante incentivos a pymes.',
            'Líneas de crédito blando de la banca pública para sostener el empleo formal en industria, comercio y construcción.',
          ],
          sourceLabel: 'pj.org.ar — Eje Trabajo y Producción',
          sourceUrl: 'https://pj.org.ar',
        },
        servicios: {
          headline: 'Blindaje financiero a universidades nacionales, salud pública y moratoria previsional',
          points: [
            'Ley de financiamiento garantizado para universidades nacionales, CONICET y escuelas técnicas con actualización automática por inflación.',
            'Reconstrucción de la red pública de hospitales, provisión gratuita de medicamentos esenciales y programas de salud mental comunitaria.',
            'Actualización previsional por encima de la inflación, restitución de medicamentos gratuitos para jubilados y continuidad de esquemas de inclusión previsional.',
          ],
          sourceLabel: 'Plataforma Fuerza Patria / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        vivienda: {
          headline: 'Reactivación de obra pública nacional, programas tipo Procrear y regulación de alquileres',
          points: [
            'Reanudación inmediata de la obra pública nacional paralizada en rutas, agua potable, cloacas y complejos habitacionales.',
            'Relanzamiento de créditos hipotecarios estatales accesibles y programas de lotes con servicios para primera vivienda.',
            'Marco equilibrado para alquileres urbanos con protección al inquilino frente a abusos e incentivos fiscales para propietarios que ofrezcan contratos estables en pesos.',
          ],
          sourceLabel: 'pj.org.ar / Gobierno PBA',
          sourceUrl: 'https://pj.org.ar',
        },
        federalismo: {
          headline: 'Restitución de fondos coparticipables y subsidios al transporte y energía del interior',
          points: [
            'Devolución de transferencias nacionales retenidas a las provincias y respeto estricto de los acuerdos de coparticipación federal.',
            'Restablecimiento del Fondo de Incentivo Docente y de subsidios federales coordinados para el transporte público y tarifas sociales.',
            'Plan federal de logística ferroviaria y rutas nacionales para reducir asimetrías entre el AMBA y las provincias.',
          ],
          sourceLabel: 'Plataforma Fuerza Patria / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        seguridad: {
          headline: 'Inversión provincial en fuerzas policiales, prevención social y narcotráfico federal',
          points: [
            'Fortalecimiento coordinado de policías locales con equipamiento, patrulleros, tecnología de vigilancia y despliegue federal contra el narcotráfico y lavado.',
            'Respeto irrestricto al derecho constitucional a la protesta social y rechazo a la militarización de conflictos internos.',
            'Política exterior multilateral que preserve el Mercosur, los BRICS ampliados como socios comerciales y el reclamo soberano por Malvinas.',
          ],
          sourceLabel: 'pj.org.ar — Seguridad y Política Exterior',
          sourceUrl: 'https://pj.org.ar',
        },
        produccion: {
          headline: 'YPF estatal como motor energético, valor agregado en origen y transición soberana',
          points: [
            'Centralidad estratégica de YPF bajo mayoría estatal para financiar gasoductos, industrialización petroquímica y tarifas energéticas competitivas para la industria.',
            'Industrialización en origen del litio, minerales críticos y agroalimentos con transferencia tecnológica de universidades públicas.',
            'Segmentación de retenciones agropecuarias para proteger a pequeños y medianos productores cooperativos frente a grandes concentradores.',
          ],
          sourceLabel: 'Plataforma Fuerza Patria / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        instituciones: {
          headline: 'Ampliación de la Corte, paridad de género y regulación contra discursos de odio',
          points: [
            'Reforma del Poder Judicial y ampliación federal de la Corte Suprema para garantizar independencia frente a presiones corporativas y mediáticas.',
            'Sostenimiento de políticas públicas de género, prevención de violencias, Memoria, Verdad y Justicia y cupos de inclusión.',
            'Transparencia y rendición de cuentas en contrataciones públicas sin desmantelar los organismos de control estatal.',
          ],
          sourceLabel: 'pj.org.ar',
          sourceUrl: 'https://pj.org.ar',
        },
      },
    },

    {
      id: 'ucr',
      name: 'Unión Cívica Radical',
      shortName: 'UCR',
      candidate: 'Martín Lousteau / Maximiliano Pullaro',
      ideologyLabel: 'Centro reformista, republicano y social-liberal',
      spectrumScore: 48,
      economicAxis: 46,
      socialTerritorialAxis: 44,
      color: '#e11d48',
      officialUrl: 'https://ucr.org.ar',
      secondaryUrl: 'https://www.electoral.gob.ar',
      summary:
        'Defiende el equilibrio fiscal con sensibilidad social, la educación y universidad públicas reformadas, la institucionalidad republicana y un rol arbitral de centro entre el kirchnerismo y La Libertad Avanza.',
      officialCommunication: {
        slogans: [
          'Equilibrio fiscal sin romper el Estado',
          'Educación pública, producción y república',
          'Ni kirchnerismo ni dogmatismo libertario',
          'Capacidad de gestión para resolver problemas',
        ],
        tone: 'Institucional, moderado y técnico; reivindica la gestión de gobernadores e intendentes radicales como alternativa a la polarización.',
        framing:
          'Plantea que la Argentina necesita orden macroeconómico y cuentas sanas, pero sin destruir la educación universitaria, la salud pública, la ciencia ni las instituciones democráticas.',
        channels:
          'Comité Nacional y convenciones provinciales, vocería parlamentaria en Senado y Diputados, gestiones en Santa Fe, Mendoza, Corrientes, Jujuy y Chaco, y medios gráficos/streaming.',
        keywords: [
          'Equilibrio con justicia',
          'Universidad pública',
          'Capacidad de gestión',
          'República e instituciones',
          'Superávit productivo',
          'Federalismo fiscal',
        ],
      },
      interviewStyle: {
        summary:
          'Argumentación estructurada en datos presupuestarios y comparaciones internacionales; combina respaldo a reformas económicas racionales con críticas firmes al estilo confrontativo del Ejecutivo.',
        register: 'Técnico-republicano, dialoguista y orientado a propuestas de política pública.',
      },
      proposals: {
        economia: {
          headline: 'Equilibrio fiscal sostenible con reforma tributaria progresiva y baja de carga productiva',
          points: [
            'Consolidación de cuentas fiscales equilibradas mediante eficiencia en el gasto y eliminación de privilegios tributarios corporativos.',
            'Reforma tributaria integral para reemplazar impuestos distorsivos (Ingresos Brutos, impuesto al cheque y retenciones) por un sistema simple que incentive la inversión.',
            'Unificación cambiaria ordenada y fortalecimiento de reservas del Banco Central con independencia técnica de su directorio.',
          ],
          sourceLabel: 'Plataforma UCR / ucr.org.ar',
          sourceUrl: 'https://ucr.org.ar',
        },
        empleo: {
          headline: 'Modernización laboral consensuada para pymes sin perder derechos esenciales',
          points: [
            'Régimen laboral específico para micro y pequeñas empresas que reduzca litigiosidad judicial y cargas patronales para nuevas contrataciones formales.',
            'Capacitación técnica continua articulada entre sindicatos, cámaras empresarias y universidades para reconvertir oficios.',
            'Regularización progresiva del empleo informal mediante incentivos fiscales temporales al blanqueo laboral.',
          ],
          sourceLabel: 'ucr.org.ar — Agenda Productiva',
          sourceUrl: 'https://ucr.org.ar',
        },
        servicios: {
          headline: 'Pacto educativo nacional, presupuesto universitario blindado y reforma previsional',
          points: [
            'Defensa irrestricta de la universidad pública gratuita, el sistema científico (CONICET) y evaluación transparente de calidad en escuela primaria y secundaria.',
            'Integración y coordinación entre el sistema público, obras sociales y sector privado para reducir tiempos de espera sanitaria.',
            'Fórmula previsional transparente ajustada por inflación más un componente de crecimiento económico, eliminando regímenes de privilegio.',
          ],
          sourceLabel: 'ucr.org.ar / Congreso Nacional',
          sourceUrl: 'https://ucr.org.ar',
        },
        vivienda: {
          headline: 'Créditos UVA con tope salarial, obra pública transparente y suelo urbano planificado',
          points: [
            'Fomento al crédito hipotecario de largo plazo con fondos compensadores que protejan la cuota frente a saltos bruscos de inflación.',
            'Mantenimiento de obra pública estratégica de agua, saneamiento y conectividad mediante licitaciones abiertas y auditoría ciudadana.',
            'Incentivos municipales y fiscales a la construcción de vivienda media para ampliar la oferta en alquiler.',
          ],
          sourceLabel: 'Plataforma UCR / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        federalismo: {
          headline: 'Nueva ley de coparticipación federal y autonomía fiscal real para las provincias',
          points: [
            'Discusión de una nueva Ley de Coparticipación Federal que premie la eficiencia recaudatoria provincial y garantice servicios básicos en todo el país.',
            'Prohibición de los recortes discrecionales o discrecionalidad en Aportes del Tesoro Nacional (ATN) como herramienta de presión política.',
            'Fortalecimiento de regiones metropolitanas y consorcios municipales para gestionar transporte, residuos y seguridad.',
          ],
          sourceLabel: 'ucr.org.ar — Federalismo',
          sourceUrl: 'https://ucr.org.ar',
        },
        seguridad: {
          headline: 'Sistema acusatorio federal contra el narcotráfico y fuerzas profesionales con control civil',
          points: [
            'Implementación en todo el país del Código Procesal Penal acusatorio, agencias antinarco federales y persecución de la ruta del dinero.',
            'Modernización y profesionalización de las fuerzas de seguridad con equipamiento, inteligencia criminal y respeto a los derechos humanos.',
            'Política exterior anclada en la democracia, los derechos humanos, el acuerdo Mercosur-UE y el multilateralismo equilibrado.',
          ],
          sourceLabel: 'ucr.org.ar / Gestión Santa Fe',
          sourceUrl: 'https://ucr.org.ar',
        },
        produccion: {
          headline: 'Baja gradual de retenciones al campo, transición energética y bioeconomía',
          points: [
            'Sendero previsible de reducción y eliminación de derechos de exportación agropecuarios, sustituidos por imposición a la renta.',
            'Impulso a la bioeconomía, energías renovables, gas de Vaca Muerta y minería sustentable con estándares ambientales internacionales.',
            'Inversión en hidrovía, puertos y corredores bioceánicos para bajar costos logísticos del interior productivo.',
          ],
          sourceLabel: 'ucr.org.ar — Desarrollo Sustentable',
          sourceUrl: 'https://ucr.org.ar',
        },
        instituciones: {
          headline: 'Boleta Única, Ficha Limpia, independencia judicial y presupuesto aprobado por ley',
          points: [
            'Consolidación de la Boleta Única de Papel en todas las jurisdicciones, sanción efectiva de Ficha Limpia y ley de financiamiento transparente de campañas.',
            'Prohibición de gobernar sin Presupuesto aprobado por el Congreso y límites estrictos al abuso de Decretos de Necesidad y Urgencia (DNU).',
            'Designación de jueces de la Corte Suprema y Procurador General por amplio consenso parlamentario y paridad institucional.',
          ],
          sourceLabel: 'ucr.org.ar — Calidad Institucional',
          sourceUrl: 'https://ucr.org.ar',
        },
      },
    },

    {
      id: 'provincias-unidas',
      name: 'Provincias Unidas',
      shortName: 'Provincias Unidas',
      candidate: 'Martín Llaryora / Juan Schiaretti',
      ideologyLabel: 'Federalismo productivo, desarrollista y dialoguista',
      spectrumScore: 58,
      economicAxis: 58,
      socialTerritorialAxis: 56,
      color: '#0d9488',
      officialUrl: 'https://www.electoral.gob.ar',
      secondaryUrl: 'https://www.cba.gov.ar',
      summary:
        'Coalición federal de gobernadores y bloques provinciales (Córdoba, Santa Fe, Chubut y aliados) que actúa como tercera vía y árbitro en el Congreso: apoya el equilibrio fiscal pero exige shock productivo, baja de retenciones e infraestructura para el interior.',
      officialCommunication: {
        slogans: [
          'Equilibrio fiscal con desarrollo productivo',
          'El país se construye desde el interior',
          'Salir de la timba financiera y apostar a la producción',
          'Diálogo, gestión y federalismo real',
        ],
        tone: 'Pragmático, gestor y federalista; evita la grieta ideológica porteña y destaca experiencias locales con superávit fiscal e inversión en infraestructura.',
        framing:
          'Contrapone la "Argentina productiva del trabajo y las provincias" frente al centralismo del AMBA, la especulación financiera y la confrontación estéril entre dos polos.',
        channels:
          'Vocería conjunta de gobernadores en foros empresarios (IDEA, agroindustria), bloque parlamentario bisagra en Diputados y Senado, y medios del interior y nacionales.',
        keywords: [
          'Shock productivo',
          'Superávit con obra pública',
          'Fin de las retenciones',
          'Federalismo real',
          'Banca de desarrollo',
          'Tercera vía',
        ],
      },
      interviewStyle: {
        summary:
          'Calmado y enfocado en casos concretos de gestión provincial ("tener superávit sin dejar de hacer rutas ni escuelas"); marca distancia tanto del estatismo sin control como del ajuste recesivo.',
        register: 'Ejecutivo-gestor, conciliador y reivindicativo del interior productivo.',
      },
      proposals: {
        economia: {
          headline: 'Superávit fiscal compatible con obra pública y eliminación de impuestos distorsivos',
          points: [
            'Regla de déficit cero en gastos corrientes combinada con inversión estratégica de capital en infraestructura productiva.',
            'Eliminación gradual de retenciones a las exportaciones y del impuesto a los débitos y créditos bancarios ("impuesto al cheque").',
            'Política cambiaria competitiva y crédito productivo para pymes industriales, tecnológicas y agroalimentarias del interior.',
          ],
          sourceLabel: 'Documentos Programáticos Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        empleo: {
          headline: 'Incentivos al primer empleo, baja de costos no salariales para pymes y formación técnica',
          points: [
            'Programas federales de primer empleo y entrenamiento laboral en empresas con incentivos fiscales compartidos (modelo PPP).',
            'Actualización laboral enfocada en reducir la industria del juicio en pequeñas y medianas empresas preservando derechos básicos.',
            'Articulación entre escuelas técnicas, clústeres tecnológicos e industrias regionales.',
          ],
          sourceLabel: 'Plataforma Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        servicios: {
          headline: 'Gestión eficiente de salud y educación con responsabilidad provincial y fondos garantizados',
          points: [
            'Mantenimiento de la educación pública y técnica como motor de ascenso social, sumando conectividad, programación e inglés desde nivel inicial.',
            'Sostenimiento del sistema sanitario descentralizado con compras conjuntas de medicamentos de alto costo entre provincias.',
            'Cumplimiento efectivo de las transferencias nacionales adeudadas a las cajas previsionales provinciales no transferidas.',
          ],
          sourceLabel: 'Bloque Provincias Unidas — Congreso',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        vivienda: {
          headline: 'Infraestructura logística, gasoductos, rutas y acceso al crédito en cada provincia',
          points: [
            'Continuidad de obras de infraestructura vial, hídrica y energética mediante esquemas transparentes público-privados y presupuesto plurianual.',
            'Bancos provinciales impulsando créditos hipotecarios y programas de loteo con servicios en ciudades intermedias.',
            'Desregulación ágil de permisos locales para atraer inversión privada en vivienda sin abandonar la urbanización básica.',
          ],
          sourceLabel: 'Plataforma Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        federalismo: {
          headline: 'Reparto federal automático de impuestos nacionales y fin del centralismo del AMBA',
          points: [
            'Coparticipación automática de los impuestos que hoy recauda exclusivamente Nación (como parte de combustibles y retenciones) hacia todas las provincias.',
            'Eliminación de asimetrías históricas en subsidios al transporte y tarifas eléctricas que favorecen al área metropolitana de Buenos Aires.',
            'Autonomía de los distritos para definir calendarios, esquemas productivos y acuerdos comerciales subnacionales.',
          ],
          sourceLabel: 'Documentos de Gobernadores — Provincias Unidas',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        seguridad: {
          headline: 'Justicia federal ágil, persecución del narcotráfico en rutas y coordinación provincial',
          points: [
            'Despliegue coordinado de fuerzas federales y policías provinciales en fronteras, rutas nacionales y zonas críticas del narcotráfico.',
            'Transferencia de competencias de narcomenudeo con financiamiento nacional efectivo a las justicias provinciales.',
            'Inserción internacional pragmática enfocada en abrir mercados exportadores (UE, Asia, EE. UU. y Mercosur) para la producción regional.',
          ],
          sourceLabel: 'Plataforma Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        produccion: {
          headline: 'Retenciones cero al campo, biocombustibles, economía del conocimiento y minería moderna',
          points: [
            'Reducción a cero de las retenciones agropecuarias para liberar inversión en maquinaria, tecnología agrícola y agregado de valor en origen.',
            'Impulso legislativo a biocombustibles (bioetanol y biodiésel), gas natural, energía eólica/solar y clústeres de economía del conocimiento.',
            'Seguridad jurídica para inversiones mineras y energéticas con regalías justas para las provincias productoras.',
          ],
          sourceLabel: 'Plataforma Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        instituciones: {
          headline: 'Consenso parlamentario, respeto a la división de poderes y reforma electoral moderna',
          points: [
            'Construcción de mayorías parlamentarias basadas en acuerdos programáticos por ley en lugar de decretos unilaterales o bloqueos totales.',
            'Implementación integral de la Boleta Única de Papel, transparencia digital en compras públicas y Ficha Limpia.',
            'Diálogo institucional respetuoso entre Casa Rosada, gobernadores, intendentes y el Poder Judicial.',
          ],
          sourceLabel: 'Bloque Provincias Unidas / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
      },
    },

    {
      id: 'pro',
      name: 'PRO - Propuesta Republicana',
      shortName: 'PRO',
      candidate: 'Mauricio Macri',
      ideologyLabel: 'Centroderecha liberal-conservadora y pro-mercado',
      spectrumScore: 74,
      economicAxis: 76,
      socialTerritorialAxis: 70,
      color: '#ca8a04',
      officialUrl: 'https://pro.com.ar',
      secondaryUrl: 'https://www.electoral.gob.ar',
      summary:
        'Impulsa la modernización del Estado, la reducción impositiva y de trabas burocráticas, la apertura económica al mundo, la seguridad jurídica para inversiones y el orden público, debatiendo grados de convergencia programática con el oficialismo.',
      officialCommunication: {
        slogans: [
          'Cambio con gestión y república',
          'Bajar impuestos para crecer e invertir',
          'Orden, ley y modernización del Estado',
          'Integrar a la Argentina al mundo',
        ],
        tone: 'Ejecutivo, republicano y orientado al sector privado; alterna respaldo a reformas de mercado con exigencia de institucionalidad y método de gestión.',
        framing:
          'Sostiene que el progreso requiere reglas claras, respeto irrestricto a la propiedad privada, apertura al comercio internacional y eficiencia estatal para dejar atrás el populismo.',
        channels:
          'Apariciones estratégicas de Mauricio Macri y referentes distritales (CABA, Entre Ríos, Chubut), pódcasts de negocios y debate político, y vocería legislativa.',
        keywords: [
          'Seguridad jurídica',
          'Modernización estatal',
          'Baja de impuestos',
          'Apertura comercial',
          'Ley y orden',
          'Inversión privada',
        ],
      },
      interviewStyle: {
        summary:
          'Coloquial y directo en pódcasts y televisión; defiende el levantamiento del cepo cambiario, la disciplina presupuestaria y la cultura del mérito empresarial frente al asistencialismo.',
        register: 'Empresarial-pragmático con apelación a experiencias de gestión en Ciudad de Buenos Aires y Nación.',
      },
      proposals: {
        economia: {
          headline: 'Eliminación total de restricciones cambiarias, baja de impuestos y equilibrio fiscal',
          points: [
            'Mantenimiento estricto del equilibrio fiscal combinado con una reducción progresiva de Ganancias, Bienes Personales y retenciones.',
            'Consolidación de un mercado cambiario único y libre sin cepo para atraer inversión extranjera directa en infraestructura y tecnología.',
            'Privatización o concesión eficiente de empresas estatales deficitarias y simplificación regulatoria para nuevas sociedades.',
          ],
          sourceLabel: 'Plataforma Electoral PRO / pro.com.ar',
          sourceUrl: 'https://pro.com.ar',
        },
        empleo: {
          headline: 'Modernización de convenios por empresa, fin de la litigiosidad y fondo de cese',
          points: [
            'Actualización de los convenios colectivos permitiendo acuerdos por empresa o región, y habilitación de fondos de cese laboral optativos.',
            'Eliminación de multas y topes claros a honorarios en juicios laborales para dar previsibilidad de contratación a pymes.',
            'Incentivos impositivos a la formalización de trabajadores independientes y plataformas digitales.',
          ],
          sourceLabel: 'pro.com.ar — Modernización Laboral',
          sourceUrl: 'https://pro.com.ar',
        },
        servicios: {
          headline: 'Evaluación educativa obligatoria, historia clínica digital y sustentabilidad previsional',
          points: [
            'Pruebas censales periódicas de aprendizaje en escuelas públicas y privadas, esencialidad educativa y formación docente continua.',
            'Digitalización total del sistema sanitario público, historia clínica interoperable y alianzas público-privadas para alta complejidad.',
            'Saneamiento del sistema previsional incentivando el ahorro voluntario complementario y eliminando jubilaciones de privilegio.',
          ],
          sourceLabel: 'Plataforma PRO / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        vivienda: {
          headline: 'Mercado libre de alquileres, crédito hipotecario privado y concesiones de infraestructura',
          points: [
            'Libertad contractual plena en alquileres en moneda acordada para multiplicar la oferta disponible y bajar precios reales.',
            'Expansión de créditos hipotecarios bancarios respaldados por estabilidad macroeconómica y seguridad jurídica sobre contratos.',
            'Infraestructura estratégica de transporte, aeropuertos y puertos bajo esquemas de concesión privada competitiva.',
          ],
          sourceLabel: 'pro.com.ar / CNE',
          sourceUrl: 'https://pro.com.ar',
        },
        federalismo: {
          headline: 'Pacto de responsabilidad fiscal con provincias y transparencia en gasto subnacional',
          points: [
            'Acuerdos fiscales federales que condicionen transferencias extraordinarias al cumplimiento de metas de equilibrio en cada provincia.',
            'Reducción de estructuras políticas y legislaturas provinciales sobredimensionadas para bajar Ingresos Brutos locales.',
            'Defensa de la autonomía y los recursos propios de la Ciudad Autónoma de Buenos Aires y de los distritos productivos.',
          ],
          sourceLabel: 'Plataforma PRO / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        seguridad: {
          headline: 'Respaldo firme a las fuerzas de seguridad, baja de edad de imputabilidad y orden público',
          points: [
            'Reforma penal integral con endurecimiento de penas para narcotráfico y delitos violentos, y baja de la edad de imputabilidad.',
            'Protección legal al accionar policial, uso de tecnología (cámaras, anillos digitales, pistolas Taser) y erradicación de cortes ilegales de vías.',
            'Alineamiento con democracias occidentales, impulso rápido al acuerdo Mercosur-UE y ingreso pleno a la OCDE.',
          ],
          sourceLabel: 'pro.com.ar — Orden y Libertad',
          sourceUrl: 'https://pro.com.ar',
        },
        produccion: {
          headline: 'Régimen de grandes inversiones (RIGI), apertura exportadora y campo sin retenciones',
          points: [
            'Estabilidad fiscal y cambiaria de largo plazo para megaproyectos de energía, minería de cobre y litio, y exportación de GNL.',
            'Cronograma firme para eliminar retenciones al agro y liberar cupos y trabas burocráticas de exportación.',
            'Fomento a la economía del conocimiento, inteligencia artificial y servicios basados en el talento argentino.',
          ],
          sourceLabel: 'Plataforma PRO / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        instituciones: {
          headline: 'Ficha Limpia, gobierno digital abierto, respeto a la Corte y transparencia estatal',
          points: [
            'Sanción definitiva de Ficha Limpia para impedir candidaturas de condenados por corrupción en segunda instancia.',
            'Digitalización de trámites, expedientes electrónicos y licitaciones públicas transparentes en tiempo real.',
            'Respeto irrestricto a la división de poderes, libertad de prensa y cumplimiento de fallos judiciales.',
          ],
          sourceLabel: 'pro.com.ar — República',
          sourceUrl: 'https://pro.com.ar',
        },
      },
    },

    {
      id: 'lla',
      name: 'La Libertad Avanza',
      shortName: 'LLA',
      candidate: 'Javier Milei',
      ideologyLabel: 'Liberalismo libertario, desregulador y conservador',
      spectrumScore: 92,
      economicAxis: 96,
      socialTerritorialAxis: 86,
      color: '#7c3aed',
      officialUrl: 'https://lalibertadavanza.com.ar',
      secondaryUrl: 'https://www.argentina.gob.ar',
      summary:
        'Impulsa el déficit fiscal cero innegociable, la reducción drástica del gasto público y ministerios, la desregulación total de mercados, privatizaciones, competencia de monedas, reforma laboral y endurecimiento penal bajo el principio de "el que las hace las paga".',
      officialCommunication: {
        slogans: [
          'Viva la libertad, carajo',
          'El déficit cero no se negocia',
          'No hay plata · Motosierra al gasto político',
          'El que las hace, las paga',
        ],
        tone: 'Disruptivo, doctrinario y polarizante contra la "casta política"; alterna explicaciones técnicas de teoría económica austríaca con épica de batalla cultural.',
        framing:
          'Plantea una confrontación histórica entre las "ideas de la libertad", el mérito individual y la propiedad privada frente a décadas de estatismo, déficit fiscal e inflación.',
        channels:
          'Comunicación directa presidencial en redes (X, Instagram), entrevistas en televisión y prensa internacional, cadena oficial y actos de La Libertad Avanza en todo el país.',
        keywords: [
          'Déficit cero',
          'Motosierra',
          'Desregulación',
          'Competencia de monedas',
          'RIGI',
          'Propiedad privada',
        ],
      },
      interviewStyle: {
        summary:
          'Enfático y rápido en cifras macroeconómicas (inflación mayorista, base monetaria, riesgo país); confronta premisas críticas defendiendo que la modernización laboral y el ajuste devuelven crecimiento real.',
        register: 'Vehemente, técnico-doctrinario y de ataque frontal al consenso político previo.',
      },
      proposals: {
        economia: {
          headline: 'Déficit cero constitucional, competencia de monedas, cierre del BCRA y baja drástica de impuestos',
          points: [
            'Regla estricta de déficit cero innegociable y reducción sostenida del gasto público nacional como única vía para extinguir la inflación.',
            'Avance hacia la competencia de monedas y reforma monetaria definitiva que impida la emisión sin respaldo para financiar al Tesoro.',
            'Eliminación gradual del 90 % de los impuestos nacionales vigentes una vez consolidado el superávit fiscal, junto con privatización de empresas públicas.',
          ],
          sourceLabel: 'lalibertadavanza.com.ar / Plataforma Oficial CNE',
          sourceUrl: 'https://lalibertadavanza.com.ar',
        },
        empleo: {
          headline: 'Modernización laboral profunda, libertad de contratación y fin de la industria del juicio',
          points: [
            'Reforma laboral integral para eliminar trabas de contratación, extender períodos de prueba y sustituir indemnizaciones litigiosas por fondos de cese voluntarios.',
            'Reducción de cargas patronales y aportes obligatorios para bajar el costo laboral formal y absorber empleo en blanco.',
            'Libertad de afiliación sindical, eliminación de cuotas solidarias compulsivas y acuerdos salariales flexibles por empresa.',
          ],
          sourceLabel: 'argentina.gob.ar / Plataforma LLA',
          sourceUrl: 'https://www.argentina.gob.ar',
        },
        servicios: {
          headline: 'Sistema de vouchers educativos a la demanda, libre elección sanitaria y reforma previsional',
          points: [
            'Transición hacia esquemas de financiamiento a la demanda (vouchers o becas directas a familias) con auditoría estricta de fondos universitarios.',
            'Desregulación total del sistema de salud y obras sociales permitiendo libre elección de prestadores privados sin intermediación sindical.',
            'Reforma previsional de largo plazo orientada a la capitalización individual voluntaria y saneamiento actuarial tras la baja del gasto público.',
          ],
          sourceLabel: 'Plataforma Oficial LLA / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        vivienda: {
          headline: 'Desregulación absoluta de alquileres, obra pública por iniciativa privada y crédito bancario',
          points: [
            'Libertad contractual total en alquileres (plazo, moneda y ajuste) sin intervención estatal, multiplicando la oferta privada de inmuebles.',
            'Eliminación de la obra pública financiada con emisión o impuestos, reemplazada por concesiones e iniciativa 100 % privada a riesgo empresarial.',
            'Desarrollo del crédito hipotecario privado a partir de la estabilidad monetaria y la baja de tasas de interés.',
          ],
          sourceLabel: 'lalibertadavanza.com.ar',
          sourceUrl: 'https://lalibertadavanza.com.ar',
        },
        federalismo: {
          headline: 'Competencia fiscal entre provincias, fin de transferencias discrecionales y ajuste subnacional',
          points: [
            'Eliminación total de transferencias discrecionales de Nación a provincias para forzar el equilibrio fiscal en gobernaciones e intendencias.',
            'Reforma del esquema de coparticipación hacia la correspondencia fiscal donde cada provincia recaude y gaste lo propio.',
            'Competencia impositiva entre jurisdicciones para atraer inversiones privadas con menores tasas locales.',
          ],
          sourceLabel: 'Plataforma LLA / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        seguridad: {
          headline: 'Doctrina "el que las hace las paga", baja de imputabilidad y alineamiento con EE. UU. e Israel',
          points: [
            'Aplicación estricta del protocolo de orden público en rutas y calles, respaldo total a fuerzas federales y reforma penal de cumplimiento efectivo.',
            'Baja de la edad de imputabilidad penal y ampliación de las facultades de legítima defensa frente a delitos violentos.',
            'Alineamiento geopolítico estratégico con Estados Unidos, Israel y las democracias occidentales, y apertura comercial bilateral.',
          ],
          sourceLabel: 'lalibertadavanza.com.ar / Seguridad Nacional',
          sourceUrl: 'https://lalibertadavanza.com.ar',
        },
        produccion: {
          headline: 'Desregulación energética total, expansión del RIGI y retenciones cero al consolidar superávit',
          points: [
            'Libre exportación de hidrocarburos, energía eléctrica y minería a precios internacionales sin cupos ni restricciones cuantitativas.',
            'Profundización del Régimen de Incentivo para Grandes Inversiones (RIGI) en Vaca Muerta, litio, cobre y GNL.',
            'Eliminación definitiva de los derechos de exportación al campo y de registros de exportadores en la medida en que lo permita el superávit fiscal.',
          ],
          sourceLabel: 'Plataforma Oficial LLA / CNE',
          sourceUrl: 'https://www.electoral.gob.ar',
        },
        instituciones: {
          headline: 'Achicamiento radical del Estado, cierre de organismos públicos y desburocratización',
          points: [
            'Reducción permanente de ministerios, secretarías, pauta oficial y organismos considerados ideológicos o duplicados.',
            'Revisión y derogación masiva de regulaciones, licencias y trámites mediante facultades delegadas y leyes de desregulación.',
            'Implementación de Boleta Única de Papel, reforma política para eliminar financiamiento estatal partidario y eventual eliminación de las PASO.',
          ],
          sourceLabel: 'lalibertadavanza.com.ar / reforma del Estado',
          sourceUrl: 'https://lalibertadavanza.com.ar',
        },
      },
    },
  ],

  territorialParties: [
    {
      id: 'hacemos-cordoba',
      name: 'Hacemos Unidos por Córdoba',
      shortName: 'Hacemos Córdoba',
      territory: 'Córdoba',
      candidate: 'Martín Llaryora / Juan Schiaretti',
      spectrumLabel: 'Peronismo federal productivista',
      color: '#0d9488',
      officialUrl: 'https://www.cba.gov.ar',
      priorities:
        'Eliminación de retenciones agropecuarias, impulso a biocombustibles, mantenimiento de obra pública provincial con superávit y defensa de la caja previsional de Córdoba.',
      parliamentaryRole:
        'Núcleo vertebrador del bloque federal Provincias Unidas en Diputados; su voto define quórum, leyes económicas y el margen de negociación con gobernadores.',
    },
    {
      id: 'frente-renovador-misiones',
      name: 'Frente Renovador de la Concordia',
      shortName: 'FR Concordia',
      territory: 'Misiones',
      candidate: 'Hugo Passalacqua / Carlos Rovira',
      spectrumLabel: 'Provincialismo pragmático misionero',
      color: '#2563eb',
      officialUrl: 'https://www.electoral.gob.ar',
      priorities:
        'Zona aduanera especial para Misiones, protección de las economías yerbatera, tealera y forestal, infraestructura energética y compensaciones de frontera.',
      parliamentaryRole:
        'Bloque provincial con bancas clave en Diputados y Senado; negocia de manera pragmática votación por votación a cambio de agenda productiva misionera.',
    },
    {
      id: 'neuquinizate',
      name: 'La Neuquinidad / Comunidad',
      shortName: 'La Neuquinidad',
      territory: 'Neuquén',
      candidate: 'Rolando Figueroa',
      spectrumLabel: 'Provincialismo energético neuquino',
      color: '#059669',
      officialUrl: 'https://www.neuquen.gob.ar',
      priorities:
        'Defensa de la titularidad provincial de los recursos de Vaca Muerta, regalías hidrocarburíferas, obra vial neuquina y empleo local prioritario.',
      parliamentaryRole:
        'Actor relevante en la Cámara Baja y Alta en toda discusión sobre leyes de hidrocarburos, gasoductos, RIGI y coparticipación energética.',
    },
    {
      id: 'juntos-rio-negro',
      name: 'Juntos Somos Río Negro',
      shortName: 'JSRN',
      territory: 'Río Negro',
      candidate: 'Alberto Weretilneck',
      spectrumLabel: 'Provincialismo patagónico transversal',
      color: '#16a34a',
      officialUrl: 'https://rionegro.gov.ar',
      priorities:
        'Inversiones en puertos y plantas de exportación energética en la costa atlántica, defensa de la fruticultura del Alto Valle y compensaciones patagónicas de gas.',
      parliamentaryRole:
        'Voto clave en el Senado y Diputados en debates sobre energía patagónica, tarifas diferenciales de zona fría e infraestructura federal.',
    },
    {
      id: 'coalicion-civica',
      name: 'Coalición Cívica ARI',
      shortName: 'CC-ARI',
      territory: 'CABA, PBA y Nacional',
      candidate: 'Elisa Carrió / Maximiliano Ferraro',
      spectrumLabel: 'Centro republicano anticorrupción',
      color: '#d97706',
      officialUrl: 'https://coalicioncivica.org.ar',
      priorities:
        'Ficha Limpia, combate judicial contra redes de corrupción, actualización previsional justa, defensa del campo sin retenciones y control estricto de decretos presidenciales.',
      parliamentaryRole:
        'Bloque legislativo autónomo de alto perfil técnico; actúa como fiscal republicano en votaciones de DNU, nombramientos judiciales y leyes previsionales.',
    },
  ],

  axisComparisons: {
    economia: {
      similarities: [
        'Todos los espacios reconocen que controlar la inflación de manera estable y recuperar el crédito son prioridades económicas centrales.',
        'UCR, Provincias Unidas, PRO y LLA coinciden en la necesidad de mantener equilibrio en las cuentas públicas y simplificar impuestos distorsivos.',
        'FIT-U y Fuerza Patria priorizan recomponer el poder adquisitivo del mercado interno y proteger a sectores vulnerables antes que profundizar el ajuste.',
      ],
      differences: [
        'Rol estatal vs. desregulación: LLA y PRO buscan reducir drásticamente ministerios, impuestos y regulaciones; Fuerza Patria y FIT-U defienden un Estado regulador o planificador.',
        'Deuda y moneda: FIT-U propone romper con el FMI y estatizar la banca; LLA impulsa competencia de monedas y superávit financiero; UCR y Provincias Unidas abogan por Banco Central independiente y reservas.',
        'Obra pública e impuestos: Provincias Unidas y Fuerza Patria defienden invertir en infraestructura productiva; LLA la traslada a iniciativa privada.',
      ],
    },
    empleo: {
      similarities: [
        'Existe diagnóstico compartido sobre el problema estructural de la informalidad laboral en Argentina (superior al 40 %).',
        'UCR, Provincias Unidas, PRO y LLA coinciden en revisar la alta litigiosidad judicial que afecta a pymes al contratar o desvincular personal.',
        'FIT-U y Fuerza Patria coinciden en rechazar reformas que recorten indemnizaciones o debiliten convenios colectivos.',
      ],
      differences: [
        'Indemnizaciones y jornada: LLA y PRO proponen fondos de cese laboral, períodos de prueba amplios y acuerdos por empresa; FIT-U exige jornada de 6 horas y prohibición de despidos.',
        'Negociación salarial: Fuerza Patria y FIT-U defienden paritarias nacionales centralizadas; LLA promueve libertad de contratación y acuerdos descentralizados.',
        'Pymes del interior: UCR y Provincias Unidas proponen regímenes diferenciados y alivio de cargas específico para micro y pequeñas empresas.',
      ],
    },
    servicios: {
      similarities: [
        'Amplio arco legislativo (FIT-U, Fuerza Patria, UCR y Provincias Unidas) coincide en preservar la gratuidad y financiamiento de las universidades nacionales.',
        'Todos los espacios identifican la crisis del sistema previsional y la caída del poder de compra de jubilaciones como un desafío urgente.',
      ],
      differences: [
        'Modelo educativo y sanitario: LLA plantea vouchers educativos y libre elección desregulada de obras sociales; Fuerza Patria y FIT-U defienden gestión y presupuesto estatal directo.',
        'Jubilaciones y moratorias: FIT-U reclama el 82 % móvil inmediato; Fuerza Patria defiende moratorias previsionales; PRO y LLA impulsan capitalización voluntaria y saneamiento fiscal.',
        'Auditorías y gestión: UCR, Provincias Unidas y PRO enfatizan evaluaciones educativas censales y eficiencia administrativa en hospitales.',
      ],
    },
    vivienda: {
      similarities: [
        'Todos los espacios reconocen que el acceso a la primera vivienda propia está bloqueado sin estabilidad macroeconómica ni crédito hipotecario.',
        'Fuerza Patria, UCR y Provincias Unidas coinciden en la necesidad de infraestructura básica (agua, cloacas, rutas) como soporte urbano.',
      ],
      differences: [
        'Ley de Alquileres: LLA y PRO defienden la libertad contractual absoluta sin topes ni plazos impuestos; FIT-U y sectores de Fuerza Patria proponen regulación e impuestos a viviendas ociosas.',
        'Obra pública: Fuerza Patria y Provincias Unidas impulsan planes nacionales y provinciales de vivienda e infraestructura; LLA suprime la obra pública estatal en favor de inversión privada.',
      ],
    },
    federalismo: {
      similarities: [
        'Fuerza Patria, UCR y Provincias Unidas coinciden en rechazar la discrecionalidad de Nación en el envío de fondos y en reclamar previsibilidad para las provincias.',
        'La mayoría de las fuerzas reconocen que el esquema de coparticipación vigente desde 1988 requiere actualización.',
      ],
      differences: [
        'Correspondencia vs. solidaridad: LLA propone competencia fiscal entre provincias eliminando giros discrecionales; Fuerza Patria prioriza fondos compensadores y subsidios coordinados.',
        'Agenda del interior: Provincias Unidas exige coparticipar impuestos hoy concentrados en Nación y eliminar asimetrías de subsidios respecto al AMBA.',
      ],
    },
    seguridad: {
      similarities: [
        'Casi todo el arco parlamentario (salvo enfoques propios de seguridad interior en FIT-U) coincide en la prioridad de combatir el narcotráfico federal y el crimen organizado en Rosario y fronteras.',
        'UCR, Provincias Unidas, PRO y LLA respaldan el sistema penal acusatorio federal y mayor equipamiento tecnológico para fuerzas.',
      ],
      differences: [
        'Protocolo de protestas y edad penal: LLA y PRO defienden protocolo antipiquetes estricto y baja de imputabilidad; FIT-U y Fuerza Patria rechazan la criminalización de la protesta y la militarización.',
        'Política exterior: LLA y PRO impulsan alineamiento estrecho con EE. UU., Israel y OCDE; Fuerza Patria defiende multipolaridad y BRICS; FIT-U plantea ruptura antiimperialista.',
      ],
    },
    produccion: {
      similarities: [
        'Fuerza Patria, UCR, Provincias Unidas, PRO y LLA coinciden en que Vaca Muerta, la minería de litio/cobre y la agroindustria son motores esenciales de divisas.',
        'UCR, Provincias Unidas, PRO y LLA proponen reducir o eliminar las retenciones a las exportaciones agropecuarias.',
      ],
      differences: [
        'Propiedad de recursos: FIT-U propone estatización integral de YPF, litio y puertos bajo control obrero; LLA y PRO priorizan desregulación privada y RIGI; Fuerza Patria defiende YPF con mayoría estatal.',
        'Valor agregado vs. exportación libre: Fuerza Patria y Provincias Unidas impulsan biocombustibles e industrialización en origen; LLA prioriza libre exportación sin cupos.',
      ],
    },
    instituciones: {
      similarities: [
        'UCR, Provincias Unidas, PRO y LLA han confluido en respaldar la Boleta Única de Papel para modernizar el sistema de votación nacional.',
        'Todos los espacios expresan discursos de combate a la corrupción, aunque discrepan en mecanismos y alcances.',
      ],
      differences: [
        'Decretos y Congreso: UCR y Provincias Unidas exigen límites a los DNU y sanción anual del Presupuesto; LLA utiliza desregulación ejecutiva y vetos amparado en su tercio legislativo.',
        'Poder Judicial y derechos: Fuerza Patria propone ampliar la Corte; PRO y UCR priorizan Ficha Limpia y consenso parlamentario; FIT-U propone elección popular de jueces y dieta igual a un docente.',
      ],
    },
  },

  interviews: [
    {
      partyId: 'lla',
      candidate: 'Javier Milei',
      media: 'Revista Forbes / La Voz',
      program: 'Entrevista económica de gestión',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Inflación y economía',
      questionContext:
        'Consultado sobre la trayectoria de los precios, la salida del cepo y el programa macroeconómico del Gobierno.',
      quote:
        'Recibimos en diciembre una inflación viajando al 54%, equivalente al 17.000% anual. El último dato dio 1,4%, o sea que es un poco más del 15%. Bajamos sustancialmente la tasa de inflación.',
      expressionStyle: 'Exposición macroeconómica con cifras anualizadas comparativas',
      sourceUrl: 'https://www.lavoz.com.ar',
    },
    {
      partyId: 'lla',
      candidate: 'Javier Milei',
      media: 'LN+ / Entrevista con Luis Majul',
      program: 'Análisis político televisivo',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Reforma laboral',
      questionContext:
        'Ante críticas sindicales y de la oposición por el impacto del proyecto de modernización laboral enviado al Congreso.',
      quote:
        'La modernización laboral que nosotros proponemos no le quita derechos a nadie; es para que dar empleo sea sencillo y formal.',
      expressionStyle: 'Defensa directa frente a acusaciones opositoras',
      sourceUrl: 'https://www.argentina.gob.ar',
    },
    {
      partyId: 'lla',
      candidate: 'Javier Milei',
      media: 'Prensa Nacional / Discurso Presupuestario',
      program: 'Presentación de cuentas fiscales',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Presupuesto y déficit cero',
      questionContext:
        'Al fijar los límites de negociación parlamentaria sobre partidas de gasto y equilibrio fiscal.',
      quote:
        'El Presupuesto está construido sobre la base del déficit cero.',
      expressionStyle: 'Definición categórica de ancla fiscal innegociable',
      sourceUrl: 'https://www.argentina.gob.ar',
    },
    {
      partyId: 'fuerza-patria',
      candidate: 'Axel Kicillof',
      media: 'Clarín',
      program: 'Entrevista política dominical',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Estado vs. mercado',
      questionContext:
        'Respecto al rol de la obra pública, la regulación estatal y el debate ideológico propuesto por la Casa Rosada.',
      quote:
        'Milei vende una falsa antinomia: no es todo Estado o todo mercado.',
      expressionStyle: 'Crítica conceptual buscando romper el marco binario oficialista',
      sourceUrl: 'https://www.clarin.com',
    },
    {
      partyId: 'fuerza-patria',
      candidate: 'Axel Kicillof',
      media: 'Cadena SER / Chequeado',
      program: 'Entrevista radiofónica internacional',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Actividad económica y pymes',
      questionContext:
        'Consultado en gira internacional sobre las consecuencias de la recesión y el programa económico en el empleo.',
      quote:
        'Han cerrado más de 22 mil empresas desde el cambio de modelo económico.',
      expressionStyle: 'Uso de dato de cierre productivo para contrarrestar la baja inflacionaria',
      sourceUrl: 'https://chequeado.com',
    },
    {
      partyId: 'fuerza-patria',
      candidate: 'Axel Kicillof',
      media: 'Perfil / Declaraciones de gestión',
      program: 'Cobertura de conflicto fiscal con Nación',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Federalismo y recursos',
      questionContext:
        'Sobre la quita de fondos nacionales de seguridad y transferencias a la Provincia de Buenos Aires.',
      quote:
        'La economía está mucho peor desde que llegó Milei y hay una embestida contra la provincia de Buenos Aires.',
      expressionStyle: 'Tono confrontativo en defensa territorial de la gestión provincial',
      sourceUrl: 'https://www.perfil.com',
    },
    {
      partyId: 'pro',
      candidate: 'Mauricio Macri',
      media: 'Pódcast La Fábrica',
      program: 'Entrevista de formato largo',
      formatType: 'Pódcast / Entretenimiento',
      date: '2025–2026',
      topic: 'Pobreza, servicios e infraestructura',
      questionContext:
        'Conversación sobre la evolución histórica de las condiciones materiales de vida y la infraestructura urbana.',
      quote:
        'Un pobre de hoy vive igual o mejor que casi un rey de hace cien años, porque tiene cloaca, tiene agua corriente, tiene acceso al transporte público y a la educación pública. O sea, en los lugares donde las cosas funcionan.',
      expressionStyle: 'Comparación histórica coloquial que generó amplio debate público',
      sourceUrl: 'https://www.infobae.com',
    },
    {
      partyId: 'pro',
      candidate: 'Mauricio Macri',
      media: 'CNN / Cobertura empresarial',
      program: 'Entrevista sobre clima de negocios',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Cepo cambiario e inversiones',
      questionContext:
        'Al evaluar la necesidad de levantar restricciones cambiarias para destrabar inversiones extranjeras.',
      quote:
        'Ningún país del mundo recibe inversiones con cepo; el cepo es una trampa para el desarrollo.',
      expressionStyle: 'Sentencia empresarial directa sobre reglas de mercado',
      sourceUrl: 'https://cnnespanol.cnn.com',
    },
    {
      partyId: 'pro',
      candidate: 'Mauricio Macri',
      media: 'Pódcast La Fábrica / Infobae',
      program: 'Diálogo sobre crisis industrial',
      formatType: 'Pódcast / Entretenimiento',
      date: '2025–2026',
      topic: 'Industria y reconversión',
      questionContext:
        'Ante la consulta por dificultades en plantas fabriles tradicionales y la competencia externa.',
      quote:
        'No abandonen, pongan garra, reestructúrense.',
      expressionStyle: 'Exhortación pragmática a la competitividad privada',
      sourceUrl: 'https://www.infobae.com',
    },
    {
      partyId: 'fit-u',
      candidate: 'Myriam Bregman',
      media: 'Radio Delta',
      program: 'Entrevista matinal',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Reforma laboral',
      questionContext:
        'Consultada por el impacto de la reforma laboral sobre las jornadas, indemnizaciones y trabajadoras de plataformas.',
      quote:
        'Estamos yendo cien años atrás con una reforma brutal y regresiva; la reforma laboral es un ataque integral a los derechos de los trabajadores.',
      expressionStyle: 'Denuncia sindical categórica en defensa de derechos laborales',
      sourceUrl: 'https://www.laizquierdadiario.com',
    },
    {
      partyId: 'fit-u',
      candidate: 'Myriam Bregman',
      media: 'La Izquierda Diario / Congreso',
      program: 'Cobertura legislativa',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Conflicto social y Congreso',
      questionContext:
        'Durante las movilizaciones frente al Congreso en rechazo a proyectos de desregulación laboral.',
      quote:
        'Violencia es votar una reforma contra el pueblo.',
      expressionStyle: 'Consigna breve de réplica moral y política',
      sourceUrl: 'https://www.laizquierdadiario.com',
    },
    {
      partyId: 'fit-u',
      candidate: 'Myriam Bregman',
      media: 'Streaming y entrevistas audiovisuales',
      program: 'Debate sobre protestas',
      formatType: 'Pódcast / Entretenimiento',
      date: '2025–2026',
      topic: 'Derecho a la protesta',
      questionContext:
        'Ante la aplicación de protocolos de seguridad contra manifestaciones callejeras.',
      quote:
        'Tenemos que ser miles en las calles, tenemos derecho a la rebelión.',
      expressionStyle: 'Llamamiento directo a la movilización popular',
      sourceUrl: 'https://www.laizquierdadiario.com',
    },
    {
      partyId: 'ucr',
      candidate: 'Maximiliano Pullaro',
      media: 'La Nación',
      program: 'Entrevista federal',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Economía y costo de vida',
      questionContext:
        'Al analizar el impacto del programa económico nacional sobre la industria y el comercio santafesino.',
      quote:
        'Valoramos que se hayan corregido las variables macroeconómicas o se haya estabilizado la inflación y que haya equilibrio fiscal. Pero hoy a la gente le cuesta muchísimo tener un peso en el bolsillo. Estamos perdiendo empleo y recursos económicos; el modelo de Milei tiene que cambiar.',
      expressionStyle: 'Balance crítico: reconoce orden fiscal pero exige giro productivo',
      sourceUrl: 'https://www.lanacion.com.ar',
    },
    {
      partyId: 'ucr',
      candidate: 'Maximiliano Pullaro',
      media: 'Revista Puerto / Prensa Agro',
      program: 'Declaraciones sobre retenciones',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Campo y retenciones',
      questionContext:
        'Sobre las modificaciones temporales de derechos de exportación agropecuarios.',
      quote:
        'La semana pasada volvieron a estafar al campo.',
      expressionStyle: 'Crítica directa en defensa del sector agroexportador del interior',
      sourceUrl: 'https://revistapuerto.com.ar',
    },
    {
      partyId: 'provincias-unidas',
      candidate: 'Martín Llaryora',
      media: 'Coloquio IDEA / Canal Económico',
      program: 'Panel de gobernadores',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Federalismo y timba financiera',
      questionContext:
        'Consultado en foro empresario sobre cómo construir una agenda de crecimiento desde las provincias.',
      quote:
        'Argentina necesita ser un país federal, más justo. Tenemos que salir de la timba financiera y darle una oportunidad a todos los argentinos.',
      expressionStyle: 'Discurso desarrollista que contrapone producción real y finanzas',
      sourceUrl: 'https://www.cadena3.com',
    },
    {
      partyId: 'provincias-unidas',
      candidate: 'Juan Schiaretti',
      media: 'Cadena 3',
      program: 'Entrevista radial en Córdoba',
      formatType: 'Radio / TV Informativa',
      date: '2025–2026',
      topic: 'Jubilados, producción y diálogo',
      questionContext:
        'Al plantear el programa nacional de Provincias Unidas frente a la crisis social y el endeudamiento.',
      quote:
        'La solución no está en esperar que nos presten unos dólares del exterior; la solución está dentro de Argentina, con producción, trabajo, federalismo, diálogo y consenso.',
      expressionStyle: 'Tono sereno de experiencia de gestión provincial y apelación al consenso',
      sourceUrl: 'https://www.cadena3.com',
    },
    {
      partyId: 'provincias-unidas',
      candidate: 'Juan Schiaretti',
      media: 'Revista Puerto / Acto Federal',
      program: 'Encuentro productivo del interior',
      formatType: 'Prensa Escrita / Agencia',
      date: '2025–2026',
      topic: 'Economía real del interior',
      questionContext:
        'Contrastando la economía productiva de las provincias frente a los mercados financieros de Buenos Aires.',
      quote:
        'En el interior no sabemos de timba financiera ni tenemos la sobrevaloración del capital financiero.',
      expressionStyle: 'Contraste identitario entre el interior productivo y la capital',
      sourceUrl: 'https://revistapuerto.com.ar',
    },
    {
      partyId: 'ucr',
      candidate: 'Martín Lousteau',
      media: 'La Voz en Vivo',
      program: 'Streaming periodístico',
      formatType: 'Pódcast / Entretenimiento',
      date: '2025–2026',
      topic: 'Gestión provincial con superávit',
      questionContext:
        'Sobre la articulación de gobernadores como Schiaretti, Llaryora, Pullaro y Torres como alternativa de centro.',
      quote:
        'Saben gestionar y mantener superávit fiscal sin resignar obra pública ni políticas sociales... Ese es el camino: resolver problemas con capacidad de gestión, no rompiendo el Estado sino haciéndolo funcionar.',
      expressionStyle: 'Síntesis programática de centro reformista en formato streaming',
      sourceUrl: 'https://www.lavoz.com.ar',
    },
  ],

  quizQuestions: [
    {
      id: 'q1',
      axisId: 'economia',
      axisLabel: 'Inflación, Dólar y Estado',
      title: '¿Cómo estabilizar la economía y los precios?',
      scenario:
        'Tras años de alta inflación y restricción de divisas, el país debe decidir qué rol cumplen el Banco Central, el gasto público y el mercado cambiario. ¿Qué camino preferís?',
      options: [
        {
          text: 'Desconocer la deuda con el FMI, nacionalizar los bancos y el comercio exterior, y congelar precios de bienes básicos y tarifas bajo control estatal.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 62, ucr: 18, 'provincias-unidas': 12, pro: 5, lla: 2 },
        },
        {
          text: 'Administrar las divisas para proteger el mercado interno y la industria nacional, sostener la obra pública y compensar el gasto con impuestos progresivos a grandes rentas.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 64, 'fuerza-patria': 100, ucr: 54, 'provincias-unidas': 44, pro: 16, lla: 6 },
        },
        {
          text: 'Mantener equilibrio fiscal con orden en las cuentas, pero sin paralizar la obra pública productiva, y simplificar impuestos distorsivos con un Banco Central independiente.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 16, 'fuerza-patria': 50, ucr: 98, 'provincias-unidas': 98, pro: 66, lla: 38 },
        },
        {
          text: 'Garantizar déficit cero, levantar toda restricción cambiaria para atraer inversión privada, privatizar empresas deficitarias y bajar impuestos a la producción.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 5, 'fuerza-patria': 18, ucr: 62, 'provincias-unidas': 72, pro: 100, lla: 82 },
        },
        {
          text: 'Blindar el déficit cero constitucionalmente, avanzar hacia la competencia de monedas cerrando la emisión monetaria estatal y recortar el Estado al mínimo indispensable.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 32, 'provincias-unidas': 42, pro: 80, lla: 100 },
        },
      ],
    },
    {
      id: 'q2',
      axisId: 'empleo',
      axisLabel: 'Trabajo y Reforma Laboral',
      title: '¿Cómo reducir la informalidad y mejorar los salarios?',
      scenario:
        'Más de cuatro de cada diez trabajadores se desempeñan sin aportes formales y las pymes reclaman reglas claras mientras los sindicatos defienden derechos adquiridos. ¿Qué modelo laboral apoyás?',
      options: [
        {
          text: 'Reducir la jornada a 6 horas diarias sin bajar el sueldo para repartir el trabajo, prohibir despidos y fijar el salario mínimo al valor de la canasta familiar.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 68, ucr: 22, 'provincias-unidas': 14, pro: 5, lla: 2 },
        },
        {
          text: 'Mantener intactas las indemnizaciones y convenios colectivos, impulsar paritarias libres por encima de la inflación y dar crédito blando a pymes que tomen empleo formal.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 70, 'fuerza-patria': 100, ucr: 58, 'provincias-unidas': 46, pro: 18, lla: 8 },
        },
        {
          text: 'Crear un régimen laboral específico para micro y pequeñas empresas que baje cargas patronales y litigiosidad judicial sin recortar derechos en grandes compañías.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 18, 'fuerza-patria': 48, ucr: 98, 'provincias-unidas': 96, pro: 72, lla: 46 },
        },
        {
          text: 'Permitir convenios modernos por empresa o región, limitar multas judiciales laborales y habilitar fondos de cese laboral optativos para abaratar la contratación.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 6, 'fuerza-patria': 16, ucr: 64, 'provincias-unidas': 70, pro: 100, lla: 86 },
        },
        {
          text: 'Desregular profundamente el mercado laboral, eliminar aportes compulsivos sindicales, ampliar períodos de prueba y dejar que empleador y trabajador pacten condiciones.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 32, 'provincias-unidas': 40, pro: 82, lla: 100 },
        },
      ],
    },
    {
      id: 'q3',
      axisId: 'servicios',
      axisLabel: 'Universidad y Educación Pública',
      title: 'Financiamiento educativo y rol de las universidades nacionales',
      scenario:
        'Las universidades nacionales reclaman presupuesto por inflación mientras se discute la calidad educativa, las auditorías y la libertad de elección de las familias. ¿Qué postura elegís?',
      options: [
        {
          text: 'Triplicar el presupuesto educativo y científico estatal, eliminar subsidios a colegios privados y garantizar becas universales con ingreso irrestricto.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 76, ucr: 46, 'provincias-unidas': 34, pro: 10, lla: 4 },
        },
        {
          text: 'Blindar por ley la actualización automática por inflación del presupuesto universitario, las becas estudiantiles y la inversión nacional en ciencia y escuelas técnicas.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 78, 'fuerza-patria': 100, ucr: 82, 'provincias-unidas': 64, pro: 28, lla: 10 },
        },
        {
          text: 'Garantizar el financiamiento de la educación y universidad pública gratuita combinándolo con auditorías transparentes y pruebas censales periódicas de calidad escolar.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 38, 'fuerza-patria': 74, ucr: 100, 'provincias-unidas': 94, pro: 72, lla: 34 },
        },
        {
          text: 'Declarar la educación servicio esencial para evitar pérdida de clases, aplicar evaluaciones obligatorias a escuelas y priorizar el gasto eficiente sobre la expansión estatal.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 10, 'fuerza-patria': 26, ucr: 68, 'provincias-unidas': 70, pro: 100, lla: 78 },
        },
        {
          text: 'Avanzar hacia un sistema de vouchers o financiamiento directo a la demanda de las familias, arancelar a extranjeros no residentes y auditar estrictamente cada universidad.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 8, ucr: 26, 'provincias-unidas': 34, pro: 74, lla: 100 },
        },
      ],
    },
    {
      id: 'q4',
      axisId: 'servicios',
      axisLabel: 'Jubilaciones y Salud',
      title: 'Cómo sostener el sistema previsional y la salud pública',
      scenario:
        'Hay millones de jubilados con haberes mínimos ajustados y alta presión sobre hospitales públicos y obras sociales. ¿Qué reforma previsional y sanitaria priorizás?',
      options: [
        {
          text: 'Restituir el 82 % móvil inmediato sobre el salario activo, reponer moratorias sin límite y crear un sistema único estatal gratuito de salud sin gerenciadoras privadas.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 76, ucr: 28, 'provincias-unidas': 18, pro: 6, lla: 2 },
        },
        {
          text: 'Recomponer las jubilaciones por encima de la inflación, mantener medicamentos gratuitos en PAMI, sostener las moratorias previsionales y reforzar los hospitales públicos.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 78, 'fuerza-patria': 100, ucr: 64, 'provincias-unidas': 50, pro: 18, lla: 6 },
        },
        {
          text: 'Fijar por ley una fórmula previsional automática atada a inflación más crecimiento, eliminar jubilaciones de privilegio y coordinar hospitales públicos con compras conjuntas provinciales.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 26, 'fuerza-patria': 58, ucr: 98, 'provincias-unidas': 98, pro: 70, lla: 34 },
        },
        {
          text: 'Saneamiento actuarial del sistema previsional premiando los años reales aportados, fomentar el ahorro privado complementario e integrar historia clínica digital en salud.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 8, 'fuerza-patria': 20, ucr: 68, 'provincias-unidas': 70, pro: 100, lla: 82 },
        },
        {
          text: 'Alinear el gasto previsional al equilibrio fiscal estricto, desregular por completo las obras sociales para libre competencia privada y migrar hacia cuentas individuales voluntarias.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 28, 'provincias-unidas': 36, pro: 80, lla: 100 },
        },
      ],
    },
    {
      id: 'q5',
      axisId: 'vivienda',
      axisLabel: 'Alquileres y Obra Pública',
      title: 'Acceso al alquiler y futuro de la infraestructura pública',
      scenario:
        'Alquilar en las grandes ciudades absorbe gran parte del ingreso familiar mientras muchas rutas y viviendas públicas permanecen frenadas. ¿Qué solución elegís?',
      options: [
        {
          text: 'Aplicar fuertes impuestos a viviendas ociosas para volcarlas a alquiler social, regular topes por salario y lanzar un gran plan estatal de vivienda y obra pública.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 76, ucr: 28, 'provincias-unidas': 18, pro: 5, lla: 2 },
        },
        {
          text: 'Reactivar la obra pública nacional en rutas y viviendas, relanzar créditos hipotecarios estatales accesibles y fijar protecciones básicas en los contratos de alquiler en pesos.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 74, 'fuerza-patria': 100, ucr: 64, 'provincias-unidas': 54, pro: 16, lla: 6 },
        },
        {
          text: 'Mantener obra pública estratégica prioritaria con superávit y licitaciones transparentes, y lanzar créditos hipotecarios con tope salarial sin congelar la oferta de alquileres.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 22, 'fuerza-patria': 54, ucr: 96, 'provincias-unidas': 98, pro: 66, lla: 34 },
        },
        {
          text: 'Sostener libertad contractual plena en alquileres para multiplicar la oferta, impulsar créditos hipotecarios bancarios privados y concesionar la gran infraestructura.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 5, 'fuerza-patria': 16, ucr: 60, 'provincias-unidas': 66, pro: 100, lla: 86 },
        },
        {
          text: 'Eliminar toda regulación estatal en alquileres (plazo, moneda y ajuste) y suprimir por completo la obra pública financiada por el Estado en favor de iniciativa privada.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 4, ucr: 26, 'provincias-unidas': 32, pro: 84, lla: 100 },
        },
      ],
    },
    {
      id: 'q6',
      axisId: 'federalismo',
      axisLabel: 'Federalismo y Coparticipación',
      title: 'Relación fiscal entre Casa Rosada y las provincias',
      scenario:
        'Las provincias reclaman fondos retenidos y denuncian asimetrías en subsidios al transporte y energía respecto del AMBA, mientras Nación exige ajuste subnacional. ¿Qué diseño preferís?',
      options: [
        {
          text: 'Cortar pactos de ajuste entre Nación y gobernadores, financiar obras provinciales directamente dejando de pagar la deuda externa y eliminar exenciones a mineras.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 56, ucr: 22, 'provincias-unidas': 18, pro: 6, lla: 2 },
        },
        {
          text: 'Restituir de inmediato los fondos nacionales de transporte, incentivo docente y coparticipación recortados a las provincias y sostener tarifas federales solidarias.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 58, 'fuerza-patria': 100, ucr: 72, 'provincias-unidas': 70, pro: 22, lla: 6 },
        },
        {
          text: 'Aprobar una nueva Ley de Coparticipación automática sin giros discrecionales, igualar subsidios entre el interior y el AMBA y premiar las cuentas provinciales ordenadas.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 18, 'fuerza-patria': 56, ucr: 98, 'provincias-unidas': 100, pro: 64, lla: 34 },
        },
        {
          text: 'Condicionar acuerdos fiscales con gobernadores a recortes de gasto político local, eliminación de Ingresos Brutos distorsivos y equilibrio presupuestario provincial.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 6, 'fuerza-patria': 18, ucr: 62, 'provincias-unidas': 72, pro: 100, lla: 82 },
        },
        {
          text: 'Suprimir toda transferencia discrecional de Nación, forzar que cada provincia se autofinancie con sus propios impuestos y promover competencia fiscal entre distritos.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 28, 'provincias-unidas': 34, pro: 78, lla: 100 },
        },
      ],
    },
    {
      id: 'q7',
      axisId: 'produccion',
      axisLabel: 'Campo, Energía y Minería',
      title: 'Retenciones agropecuarias, Vaca Muerta y modelo productivo',
      scenario:
        'El país cuenta con enorme potencial en el agro, el gas de Vaca Muerta y el litio, pero se debate entre cobrar retenciones, exigir valor agregado local o desregular por completo. ¿Qué elegís?',
      options: [
        {
          text: 'Estatizar integralmente YPF, el litio y los puertos exportadores bajo control de trabajadores, realizar una reforma agraria y someter proyectos a veto ambiental local.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 56, ucr: 18, 'provincias-unidas': 10, pro: 4, lla: 2 },
        },
        {
          text: 'Consolidar una YPF de mayoría estatal que financie industrialización energética, proteger el entramado pyme manufacturero y segmentar retenciones según escala del productor.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 58, 'fuerza-patria': 100, ucr: 56, 'provincias-unidas': 44, pro: 18, lla: 6 },
        },
        {
          text: 'Fijar un sendero previsible hacia retenciones cero al campo, impulsar biocombustibles y agregar valor en origen en energía y minería con reglas ambientales claras.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 12, 'fuerza-patria': 42, ucr: 96, 'provincias-unidas': 100, pro: 78, lla: 52 },
        },
        {
          text: 'Eliminar las retenciones agropecuarias, asegurar estabilidad fiscal de largo plazo para grandes inversiones mineras y energéticas (RIGI) y abrir mercados externos.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 4, 'fuerza-patria': 16, ucr: 72, 'provincias-unidas': 80, pro: 100, lla: 90 },
        },
        {
          text: 'Desregular totalmente la exportación energética y minera a precios internacionales sin cupos ni intervención estatal y extinguir las retenciones apenas consolide el superávit.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 42, 'provincias-unidas': 54, pro: 88, lla: 100 },
        },
      ],
    },
    {
      id: 'q8',
      axisId: 'seguridad',
      axisLabel: 'Seguridad y Orden Público',
      title: 'Combate al narcotráfico, delito urbano y protesta social',
      scenario:
        'Ante el avance del narcotráfico en grandes ciudades, los reclamos de mayor firmeza policial y las tensiones en marchas callejeras, ¿qué política de seguridad respaldás?',
      options: [
        {
          text: 'Derogar los protocolos antipiquetes, prohibir la intervención militar en seguridad interna, disolver redes de inteligencia y ejercer control popular sobre fuerzas policiales.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 68, ucr: 24, 'provincias-unidas': 14, pro: 4, lla: 2 },
        },
        {
          text: 'Invertir en policías provinciales, tecnología y persecución federal del lavado narco, garantizando a la vez el derecho constitucional a la protesta sin represión.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 68, 'fuerza-patria': 100, ucr: 70, 'provincias-unidas': 58, pro: 22, lla: 10 },
        },
        {
          text: 'Implementar el sistema penal acusatorio federal, desplegar agencias antinarco coordinadas con provincias y profesionalizar fuerzas respetando garantías constitucionales.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 20, 'fuerza-patria': 62, ucr: 100, 'provincias-unidas': 98, pro: 70, lla: 42 },
        },
        {
          text: 'Endurecer penas al narcotráfico y delito violento, bajar la edad de imputabilidad, respaldar el accionar policial con tecnología y evitar cortes totales de calles.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 4, 'fuerza-patria': 18, ucr: 62, 'provincias-unidas': 68, pro: 100, lla: 90 },
        },
        {
          text: 'Aplicar sin concesiones la doctrina "el que las hace las paga", protocolo estricto contra piquetes, baja de imputabilidad y ampliación plena de legítima defensa.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 8, ucr: 36, 'provincias-unidas': 44, pro: 88, lla: 100 },
        },
      ],
    },
    {
      id: 'q9',
      axisId: 'seguridad',
      axisLabel: 'Inserción Internacional y Comercio',
      title: 'Política exterior, alianzas y apertura comercial',
      scenario:
        'El país debate si integrarse de lleno a tratados de libre comercio occidentales, mantener un equilibrio multipolar o priorizar el proteccionismo regional. ¿Qué rumbo elegís?',
      options: [
        {
          text: 'Romper con el FMI y las alianzas militares de Estados Unidos, rechazar tratados de libre comercio y promover una integración latinoamericana soberana.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 64, ucr: 18, 'provincias-unidas': 12, pro: 4, lla: 2 },
        },
        {
          text: 'Mantener relaciones multipolares con el Mercosur, China, Europa y BRICS ampliados, resguardando a la industria nacional frente a importaciones desleales.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 64, 'fuerza-patria': 100, ucr: 64, 'provincias-unidas': 58, pro: 22, lla: 8 },
        },
        {
          text: 'Impulsar una inserción internacional pragmática centrada en abrir mercados para exportaciones regionales (UE, Asia, América) con defensa de la democracia y el Mercosur.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 16, 'fuerza-patria': 54, ucr: 98, 'provincias-unidas': 98, pro: 78, lla: 48 },
        },
        {
          text: 'Acelerar el ingreso pleno a la OCDE, cerrar el acuerdo Mercosur-Unión Europea, bajar aranceles de importación y alinear la política exterior con democracias occidentales.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 4, 'fuerza-patria': 18, ucr: 72, 'provincias-unidas': 76, pro: 100, lla: 88 },
        },
        {
          text: 'Alineamiento geopolítico estratégico inequívoco con Estados Unidos e Israel, apertura comercial bilateral rápida y desregulación aduanera total.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 2, 'fuerza-patria': 6, ucr: 38, 'provincias-unidas': 44, pro: 84, lla: 100 },
        },
      ],
    },
    {
      id: 'q10',
      axisId: 'instituciones',
      axisLabel: 'Instituciones, Justicia y Derechos',
      title: 'Calidad institucional, poder presidencial y transparencia',
      scenario:
        'Tras discusiones sobre el uso de decretos presidenciales (DNU), la integración de la Corte Suprema y leyes de transparencia electoral, ¿qué reforma institucional priorizás?',
      options: [
        {
          text: 'Elegir jueces y fiscales por voto popular, fijar que todo funcionario cobre como una docente, mantener mandatos revocables y blindar derechos de género y aborto legal.',
          spectrumScore: 10,
          alignedParties: ['fit-u'],
          partyAlignment: { 'fit-u': 100, 'fuerza-patria': 56, ucr: 26, 'provincias-unidas': 16, pro: 8, lla: 6 },
        },
        {
          text: 'Reformar el Poder Judicial y ampliar federalmente la Corte Suprema, defender políticas de género y Memoria, Verdad y Justicia y sostener organismos públicos de control.',
          spectrumScore: 30,
          alignedParties: ['fuerza-patria'],
          partyAlignment: { 'fit-u': 58, 'fuerza-patria': 100, ucr: 52, 'provincias-unidas': 42, pro: 14, lla: 6 },
        },
        {
          text: 'Aprobar Ficha Limpia y Boleta Única, limitar estrictamente los DNU exigiendo Presupuesto votado por el Congreso y consensuar la Corte por amplia mayoría parlamentaria.',
          spectrumScore: 52,
          alignedParties: ['ucr', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 22, 'fuerza-patria': 42, ucr: 100, 'provincias-unidas': 98, pro: 82, lla: 38 },
        },
        {
          text: 'Sancionar Ficha Limpia, digitalizar toda contratación estatal en tiempo real, consolidar la Boleta Única y garantizar independencia estricta del Poder Judicial.',
          spectrumScore: 72,
          alignedParties: ['pro', 'provincias-unidas'],
          partyAlignment: { 'fit-u': 8, 'fuerza-patria': 16, ucr: 82, 'provincias-unidas': 80, pro: 100, lla: 76 },
        },
        {
          text: 'Achicar al máximo ministerios y organismos estatales, eliminar el financiamiento público y la pauta oficial a partidos y acelerar la desregulación ejecutiva.',
          spectrumScore: 92,
          alignedParties: ['lla'],
          partyAlignment: { 'fit-u': 6, 'fuerza-patria': 6, ucr: 34, 'provincias-unidas': 40, pro: 74, lla: 100 },
        },
      ],
    },
  ],

  faqItems: [
    {
      question: '¿Cuándo son las próximas elecciones presidenciales y legislativas en Argentina y qué se elige?',
      answer:
        'Según el Código Electoral Nacional (Ley 19.945), las elecciones generales nacionales están programadas para el domingo 24 de octubre de 2027 (con eventual segunda vuelta presidencial en noviembre si ninguna fórmula supera el 45 % o el 40 % con 10 puntos de ventaja). Se eligen Presidente y Vicepresidente (2027–2031), 130 diputados nacionales sobre un total de 257 bancas y 24 senadores sobre 72 bancas.',
    },
    {
      question: '¿Qué es la regla de mayoría y por qué importan los bloques provinciales en el Congreso argentino?',
      answer:
        'La Cámara de Diputados tiene 257 bancas y requiere 129 diputados para alcanzar quórum y mayoría absoluta simple. El Senado tiene 72 bancas (quórum en 37). Además, sostener o rechazar un veto presidencial requiere un tercio o dos tercios de los votos presentes. Por ello, los espacios federales como Provincias Unidas y los bloques provinciales (Córdoba, Misiones, Neuquén, Río Negro) actúan como árbitros legislativos indispensables.',
    },
    {
      question: '¿Qué proponen las principales fuerzas sobre inflación, dólar y equilibrio fiscal?',
      answer:
        'La Libertad Avanza defiende el déficit cero innegociable, la competencia de monedas y la reducción drástica del gasto y los impuestos. El PRO impulsa equilibrio fiscal, levantamiento total del cepo y baja tributaria. Provincias Unidas y la UCR proponen mantener superávit fiscal pero compatible con obra pública productiva, simplificación de impuestos distorsivos y Banco Central independiente. Fuerza Patria prioriza la administración de divisas para defender el mercado interno y la industria. El FIT-U plantea desconocer la deuda externa, romper con el FMI y nacionalizar la banca.',
    },
    {
      question: '¿Cuál es la postura de cada espacio respecto de la reforma laboral y los salarios?',
      answer:
        'LLA impulsa desregulación laboral profunda, fondos de cese voluntarios y fin de aportes sindicales obligatorios. El PRO propone modernizar convenios por empresa y reducir la litigiosidad. Provincias Unidas y la UCR sugieren regímenes específicos para pymes que bajen costos de contratación sin eliminar derechos básicos. Fuerza Patria defiende las paritarias libres y rechaza recortar indemnizaciones. El FIT-U reclama reducir la jornada a 6 horas sin rebaja salarial y prohibir despidos.',
    },
    {
      question: '¿Qué plantean sobre universidades públicas, salud y jubilaciones?',
      answer:
        'Fuerza Patria y la UCR defienden el blindaje presupuestario por ley para las universidades nacionales; el FIT-U exige triplicar el presupuesto educativo y restablecer el 82 % móvil en jubilaciones; Provincias Unidas prioriza el pago a cajas previsionales provinciales y compras conjuntas de medicamentos; el PRO impulsa evaluaciones educativas obligatorias y ahorro previsional complementario; LLA propone esquemas de vouchers educativos, auditoría universitaria y libre competencia en obras sociales.',
    },
    {
      question: '¿Qué proponen sobre retenciones agropecuarias, Vaca Muerta y el régimen RIGI?',
      answer:
        'LLA, PRO, Provincias Unidas y la UCR coinciden en eliminar o fijar un sendero hacia cero de las retenciones al campo, aunque Provincias Unidas y UCR enfatizan el valor agregado en origen y biocombustibles. LLA y PRO impulsan la expansión del RIGI y la libre exportación energética. Fuerza Patria defiende una YPF de mayoría estatal para industrializar gas y litio y propone segmentar retenciones para pymes rurales. El FIT-U exige la estatización integral de energía, litio y puertos bajo control obrero.',
    },
    {
      question: '¿Cómo se diferencian en seguridad, orden público y política exterior?',
      answer:
        'LLA y PRO aplican un protocolo estricto de orden público contra cortes callejeros, promueven bajar la edad de imputabilidad y alineamiento occidental (EE. UU. e Israel). Provincias Unidas y la UCR focalizan en implementar el sistema acusatorio federal contra el narcotráfico y abrir mercados exportadores de modo pragmático. Fuerza Patria enfatiza la inversión policial provincial sin criminalizar la protesta y la inserción multipolar. El FIT-U exige derogar protocolos represivos y romper acuerdos externos.',
    },
    {
      question: '¿Las elecciones primarias PASO de agosto de 2027 están confirmadas?',
      answer:
        'Por calendario legal tradicional, las Primarias Abiertas, Simultáneas y Obligatorias (PASO) corresponderían a agosto de 2027, pero su realización o eventual suspensión/eliminación depende del debate legislativo en el Congreso de la Nación. En nuestro Calendario Electoral indicamos este hito como sujeto a definición parlamentaria.',
    },
  ],
};

if (typeof window !== 'undefined') {
  window.ELECTION_DATA = ELECTION_DATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ELECTION_DATA;
}
