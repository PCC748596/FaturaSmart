// Taxonomy and hierarchical classification (Category -> Subcategory / Establishment)

export interface CategoryDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  commonEstablishments: string[];
}

export const MAIN_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'compras-internet',
    name: 'Compras Internet',
    icon: '🛍️',
    color: '#8B5CF6', // Purple/Violet
    description: 'Marketplaces online, e-commerce e eletrônicos',
    commonEstablishments: ['Amazon', 'Mercado Livre', 'Shopee', 'Shein', 'AliExpress', 'Privalia', 'Lojas Americanas', 'Magazine Luiza', 'Riachuelo', 'Koerich']
  },
  {
    id: 'alimentacao',
    name: 'Alimentação',
    icon: '🍽️',
    color: '#10B981', // Emerald
    description: 'Supermercados, feiras, padarias, restaurantes e delivery',
    commonEstablishments: ['Fort Atacadista', 'Giassi Supermercados', 'Mercado Compre Fácil', 'Supermercados Imperatriz', 'Angeloni', 'Brasil Atacadista', 'Sam\'s Club', 'Casa do Panificador', 'iFood', 'Bokas Restaurante', 'Fakas Restaurante', 'Zhou Sushi', 'Forneria do Porto', 'Starbom Picolés']
  },
  {
    id: 'transporte',
    name: 'Transporte',
    icon: '🚗',
    color: '#3B82F6', // Blue
    description: 'Aplicativos de mobilidade, combustível, estacionamentos e mecânicos',
    commonEstablishments: ['Uber', '99 App', 'Posto Shell', 'Posto Ipiranga', 'Petrobras', 'Sem Parar', 'Tokio Marine Auto', 'Juvicon Veículos']
  },
  {
    id: 'servicos-assinaturas',
    name: 'Serviços & Assinaturas',
    icon: '📱',
    color: '#6366F1', // Indigo
    description: 'Streaming de vídeo/música, planos de celular e serviços recorrentes',
    commonEstablishments: ['Netflix', 'Apple / iCloud', 'Amazon Prime', 'Spotify', 'Claro', 'Vivo', 'Tim', 'Acelerador de Pontos']
  },
  {
    id: 'saude-farmacia',
    name: 'Saúde & Farmácia',
    icon: '💊',
    color: '#F43F5E', // Rose
    description: 'Medicamentos, farmácias, planos de saúde e clínicas',
    commonEstablishments: ['Unimed', 'Centro Dinâmico', 'Panvel Farmácias', 'Raia Drogasil', 'Farmácia Preço Popular', 'Invest Farma', 'Principia Skin']
  },
  {
    id: 'moradia-contas',
    name: 'Moradia & Contas',
    icon: '🏠',
    color: '#14B8A6', // Teal
    description: 'Materiais de construção, tarifas bancárias, energia, água e reformas',
    commonEstablishments: ['Cassol Materiais', 'MadeiraMadeira', 'Juros / Encargos', 'IOF Pagamentos', 'Condomínio', 'Energia Elétrica']
  },
  {
    id: 'educacao-tecnologia',
    name: 'Educação & Tecnologia',
    icon: '🎓',
    color: '#A855F7', // Purple
    description: 'Escolas, faculdades, cursos de idiomas e softwares',
    commonEstablishments: ['Ibeu Idiomas', 'Assesc Sociedade Ed', 'Duolingo / Google Play']
  },
  {
    id: 'lazer-viagem',
    name: 'Lazer & Viagem',
    icon: '✈️',
    color: '#06B6D4', // Cyan
    description: 'Passagens, hotéis, hospedagens, cinemas e passeios',
    commonEstablishments: ['Airbnb', 'Booking.com', 'Decolar', 'Gol', 'Latam', 'Azul', 'Cinema']
  },
  {
    id: 'outros',
    name: 'Outros',
    icon: '📋',
    color: '#64748B', // Slate
    description: 'Despesas diversas não classificadas anteriormente',
    commonEstablishments: ['Diversos']
  }
];

/**
 * Normalizes any raw category or description into our canonical Main Category list
 */
export function normalizeMainCategory(category?: string, description?: string): string {
  if (!category && !description) return 'Outros';

  const catLower = (category || '').toLowerCase();
  const descLower = (description || '').toLowerCase();

  // E-commerce & Marketplaces -> Compras Internet
  if (
    catLower.includes('mercado livre') ||
    catLower.includes('amazon') ||
    catLower.includes('shopee') ||
    catLower.includes('shein') ||
    catLower.includes('compras internet') ||
    catLower.includes('compras & eletrônicos') ||
    catLower.includes('compras') ||
    /mercado\s*livre|mercadolivre|mercadopago|ebazar|melimais|amazon|amzn|shopee|shein|aliexpress|privalia|americanas|magalu|fast\s*shop/i.test(descLower)
  ) {
    return 'Compras Internet';
  }

  if (catLower.includes('aliment') || /supermercado|atacad|fort|compre\s*facil|giassi|angeloni|panific|restaurante|sushi|pizza|ifood|\bmercado\b/i.test(descLower)) {
    return 'Alimentação';
  }

  if (catLower.includes('transp') || /uber|99|posto|combustivel|gasolina|pedagio|veiculo|tokio\s*marine/i.test(descLower)) {
    return 'Transporte';
  }

  if (catLower.includes('serviço') || catLower.includes('assinat') || /netflix|spotify|apple|google|amazon\s*prime|disney|hbo|deezer|claro|vivo|tim|acelerador/i.test(descLower)) {
    return 'Serviços & Assinaturas';
  }

  if (catLower.includes('saúde') || catLower.includes('farm') || /farmacia|drogaria|panvel|raia|drogasil|unimed|centro\s*dinamico|medico/i.test(descLower)) {
    return 'Saúde & Farmácia';
  }

  if (catLower.includes('morad') || catLower.includes('conta') || /cassol|madeiramad|condominio|luz|agua|aluguel|juros|iof/i.test(descLower)) {
    return 'Moradia & Contas';
  }

  if (catLower.includes('educ') || catLower.includes('tecno') || /ibeu|assesc|duolin|curso|faculdade|escola/i.test(descLower)) {
    return 'Educação & Tecnologia';
  }

  if (catLower.includes('lazer') || catLower.includes('viag') || /hotel|airbnb|booking|passagem|gol|latam|azul|cinema/i.test(descLower)) {
    return 'Lazer & Viagem';
  }

  return category || 'Outros';
}

/**
 * Extracts a normalized, clean Establishment / Subcategory name from the raw statement description
 */
export function extractEstablishment(desc: string, category?: string): string {
  const d = desc.toLowerCase().trim();

  // 1. Compras Internet / E-Commerce
  if (/mercado\s*livre|mercadolivre|mercadopago|mercado\s*pago|ebazar|meli\s*\*|melimais/i.test(d)) {
    return 'Mercado Livre';
  }
  if (/amazon|amzn|amz\s*mkt/i.test(d)) {
    return 'Amazon';
  }
  if (/shopee/i.test(d)) {
    return 'Shopee';
  }
  if (/shein/i.test(d)) {
    return 'Shein';
  }
  if (/aliexpress|alip/i.test(d)) {
    return 'AliExpress';
  }
  if (/privalia/i.test(d)) {
    return 'Privalia';
  }
  if (/riachuelo/i.test(d)) {
    return 'Riachuelo';
  }
  if (/americanas/i.test(d)) {
    return 'Lojas Americanas';
  }
  if (/koerich/i.test(d)) {
    return 'Koerich';
  }
  if (/jam\s*bazar/i.test(d)) {
    return 'JAM Bazar Papelaria';
  }
  if (/iphone\s*pra\s*sempre/i.test(d)) {
    return 'iPhone Pra Sempre';
  }

  // 2. Alimentação
  if (/giassi/i.test(d)) {
    return 'Giassi Supermercados';
  }
  if (/fort\s*atacadista/i.test(d)) {
    return 'Fort Atacadista';
  }
  if (/compre\s*facil/i.test(d)) {
    return 'Mercado Compre Fácil';
  }
  if (/supermercado\s*forte/i.test(d)) {
    return 'Supermercado Forte';
  }
  if (/imperatr/i.test(d)) {
    return 'Supermercados Imperatriz';
  }
  if (/brasil\s*atacadista/i.test(d)) {
    return 'Brasil Atacadista';
  }
  if (/angeloni/i.test(d)) {
    return 'Angeloni';
  }
  if (/sams\s*club/i.test(d)) {
    return 'Sam\'s Club';
  }
  if (/panificador/i.test(d)) {
    return 'Casa do Panificador';
  }
  if (/congelados/i.test(d)) {
    return 'Ingleses Congelados';
  }
  if (/bokas/i.test(d)) {
    return 'Bokas Restaurante';
  }
  if (/fakas/i.test(d)) {
    return 'Fakas Restaurante';
  }
  if (/zhou\s*sushi/i.test(d)) {
    return 'Zhou Sushi';
  }
  if (/forneria/i.test(d)) {
    return 'Forneria do Porto';
  }
  if (/starbom/i.test(d)) {
    return 'Starbom Picolés';
  }
  if (/mario\s*martins/i.test(d)) {
    return 'Mário Martins';
  }
  if (/ifood/i.test(d)) {
    return 'iFood';
  }

  // 3. Transporte
  if (/uber/i.test(d)) {
    return 'Uber';
  }
  if (/99/i.test(d)) {
    return '99 App';
  }
  if (/tokio\s*marine/i.test(d)) {
    return 'Tokio Marine Auto';
  }
  if (/juvicon/i.test(d)) {
    return 'Juvicon Veículos';
  }

  // 4. Serviços & Assinaturas
  if (/netflix/i.test(d)) {
    return 'Netflix';
  }
  if (/apple|icloud/i.test(d)) {
    return 'Apple / iCloud';
  }
  if (/amazonprime/i.test(d)) {
    return 'Amazon Prime';
  }
  if (/acelerador/i.test(d)) {
    return 'Acelerador de Pontos';
  }
  if (/lindamir/i.test(d)) {
    return 'Lindamir Branco';
  }

  // 5. Saúde & Farmácia
  if (/unimed/i.test(d)) {
    return 'Unimed';
  }
  if (/centro\s*dinamico/i.test(d)) {
    return 'Centro Dinâmico';
  }
  if (/panvel/i.test(d)) {
    return 'Panvel Farmácias';
  }
  if (/raia|drogasil/i.test(d)) {
    return 'Raia Drogasil';
  }
  if (/preco\s*pop/i.test(d)) {
    return 'Farmácia Preço Popular';
  }
  if (/invest\s*farma/i.test(d)) {
    return 'Invest Farma';
  }
  if (/principia/i.test(d)) {
    return 'Principia Skin';
  }

  // 6. Educação & Tecnologia
  if (/assesc/i.test(d)) {
    return 'Assesc Sociedade Ed';
  }
  if (/ibeu/i.test(d)) {
    return 'Ibeu Idiomas';
  }
  if (/duolin/i.test(d)) {
    return 'Duolingo';
  }

  // 7. Moradia & Contas
  if (/cassol/i.test(d)) {
    return 'Cassol Materiais';
  }
  if (/juros/i.test(d)) {
    return 'Juros / Encargos';
  }
  if (/iof/i.test(d)) {
    return 'IOF Pagamento Contas';
  }
  if (/dinamica\s*ambien/i.test(d)) {
    return 'Dinâmica Ambiental';
  }

  // Fallback: Clean up raw description
  let cleaned = desc
    .replace(/^(ZP\*|MP\*|DL\*|PGCONTA\s*|PG\*\s*)/i, '')
    .replace(/\s*\d{1,2}\/\d{1,2}.*$/, '') // Remove installment suffixes like 05/12
    .replace(/\s+(FLORIPA|FLORIANOPOLIS|SÃO PAULO|SAO PAULO|SC|BR|MATRIZ).*$/i, '')
    .trim();

  if (cleaned.length > 25) {
    cleaned = cleaned.substring(0, 25).trim() + '...';
  }

  return cleaned || 'Outros Estabelecimentos';
}
