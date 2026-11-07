/** All brands, products, provenance and stock are fictitious academic fixtures. */
export const sampleProducts: unknown = [
  {
    id: 'base-ligera',
    name: 'Base ligera',
    brand: 'Aurora Studio',
    description: 'Base ficticia de acabado natural y cobertura ligera.',
    priceCop: 48000,
    provenance: 'Proveedor ficticio Aurora Studio. Datos creados para la simulación académica.',
    variants: [
      { id: 'claro', name: 'Claro', stock: 8 },
      { id: 'medio', name: 'Medio', stock: 6 },
      { id: 'profundo', name: 'Profundo', stock: 0 },
    ],
  },
  {
    id: 'labial-cremoso',
    name: 'Labial cremoso',
    brand: 'Luna Color',
    description: 'Labial ficticio de textura cremosa para uso diario.',
    priceCop: 28000,
    provenance: 'Proveedor ficticio Luna Color. Datos creados para la simulación académica.',
    variants: [
      { id: 'rosa', name: 'Rosa', stock: 10 },
      { id: 'terracota', name: 'Terracota', stock: 7 },
      { id: 'ciruela', name: 'Ciruela', stock: 0 },
    ],
  },
  {
    id: 'rubor-compacto',
    name: 'Rubor compacto',
    brand: 'Brisa Beauty',
    description: 'Rubor ficticio de color modulable para las mejillas.',
    priceCop: 35000,
    provenance: 'Proveedor ficticio Brisa Beauty. Datos creados para la simulación académica.',
    variants: [
      { id: 'durazno', name: 'Durazno', stock: 9 },
      { id: 'rosa', name: 'Rosa', stock: 5 },
      { id: 'malva', name: 'Malva', stock: 0 },
    ],
  },
];
