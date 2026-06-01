import { describe, expect, it } from 'vitest';
import {
  collectDuplicateMatches,
  isEditionOnlySuffix,
  namesAreExactlyEqual,
  namesAreLikelySameProduct,
  type DuplicateCandidate,
  type DuplicateDetectionValues,
} from './duplicate-detection';

const categoryId = 'cat-books';
const stationeryCategoryId = 'cat-stationery';

function baseValues(
  overrides: Partial<DuplicateDetectionValues> = {},
): DuplicateDetectionValues {
  return {
    name: 'La historia de Mo 2',
    categoryId,
    creatorOrAuthor: 'Autor Test',
    brandPublisherLabel: '',
    isbn: '',
    barcode: '',
    sku: '',
    ...overrides,
  };
}

function baseCandidate(
  overrides: Partial<DuplicateCandidate> = {},
): DuplicateCandidate {
  return {
    id: 'prod-1',
    name: 'La historia de Mo',
    creatorOrAuthor: 'Autor Test',
    brandPublisherLabel: '',
    categoryId,
    categoryName: 'Libros',
    condition: 'new',
    currentStock: 1,
    price: 10,
    barcode: '',
    sku: '',
    isbn: '',
    isActive: true,
    ...overrides,
  };
}

function stationeryValues(
  overrides: Partial<DuplicateDetectionValues> = {},
): DuplicateDetectionValues {
  return {
    name: "Traveler's Notebook Regular Cover Camel",
    categoryId: stationeryCategoryId,
    creatorOrAuthor: '',
    brandPublisherLabel: 'Midori',
    isbn: '',
    barcode: '',
    sku: '',
    ...overrides,
  };
}

function stationeryCandidate(
  overrides: Partial<DuplicateCandidate> = {},
): DuplicateCandidate {
  return {
    id: 'prod-tn-1',
    name: "Traveler's Notebook Passport Cover Olive",
    creatorOrAuthor: '',
    brandPublisherLabel: 'Midori',
    categoryId: stationeryCategoryId,
    categoryName: 'Papelería',
    condition: 'new',
    currentStock: 2,
    price: 45,
    barcode: '',
    sku: '',
    isbn: '',
    isActive: true,
    ...overrides,
  };
}

describe('isEditionOnlySuffix', () => {
  it('detects numeric volume suffix', () => {
    expect(
      isEditionOnlySuffix('la historia de mo 2', 'la historia de mo'),
    ).toBe(true);
  });

  it('detects vol and parte suffixes', () => {
    expect(isEditionOnlySuffix('titulo vol 2', 'titulo')).toBe(true);
    expect(isEditionOnlySuffix('titulo parte ii', 'titulo')).toBe(true);
  });

  it('rejects non-edition extra title text', () => {
    expect(
      isEditionOnlySuffix(
        'la historia de mo edicion especial',
        'la historia de mo',
      ),
    ).toBe(false);
  });
});

describe('namesAreExactlyEqual', () => {
  it('matches normalized titles regardless of case and accents', () => {
    expect(namesAreExactlyEqual('El Aleph', 'el áleph')).toBe(true);
  });
});

describe('namesAreLikelySameProduct', () => {
  it('flags likely duplicate when suffix is descriptive but not a variant', () => {
    expect(
      namesAreLikelySameProduct(
        'La historia de Mo edicion limitada',
        'La historia de Mo',
      ),
    ).toBe(true);
  });

  it('does not flag product-family prefixes with variant suffixes', () => {
    expect(
      namesAreLikelySameProduct(
        "Traveler's Notebook Regular Cover Camel",
        "Traveler's Notebook",
      ),
    ).toBe(false);
  });

  it('does not flag different traveler notebook variants', () => {
    expect(
      namesAreLikelySameProduct(
        "Traveler's Notebook Regular 031 Refill Sticker release paper",
        "Traveler's Notebook Regular 012 Refill sketch paper",
      ),
    ).toBe(false);
  });
});

describe('collectDuplicateMatches', () => {
  it('does not flag numbered title variant with same author and category', () => {
    const matches = collectDuplicateMatches(baseValues(), [baseCandidate()]);
    expect(matches).toHaveLength(0);
  });

  it('flags identical title in same category with same author', () => {
    const matches = collectDuplicateMatches(
      baseValues({ name: 'La historia de Mo' }),
      [baseCandidate()],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reasons).toContain('Nombre o título idéntico');
  });

  it('flags identical title with same creator across categories', () => {
    const matches = collectDuplicateMatches(
      baseValues({ name: 'La historia de Mo', categoryId: 'cat-other' }),
      [baseCandidate()],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reasons).toContain('Nombre o título idéntico');
    expect(matches[0]?.reasons).toContain('Mismo creador o autor');
  });

  it('flags strong match on identical ISBN regardless of title', () => {
    const matches = collectDuplicateMatches(
      baseValues({ name: 'Otro título', isbn: '9781234567890' }),
      [baseCandidate({ isbn: '978-1234567890' })],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.strength).toBe('strong');
    expect(matches[0]?.reasons).toContain('ISBN idéntico');
  });

  it('flags strong match on identical barcode', () => {
    const matches = collectDuplicateMatches(
      baseValues({ barcode: '1234567890123' }),
      [baseCandidate({ barcode: '1234-5678-90123' })],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.strength).toBe('strong');
    expect(matches[0]?.reasons).toContain('Código de barras idéntico');
  });

  it('flags strong match on identical SKU', () => {
    const matches = collectDuplicateMatches(
      baseValues({ sku: 'SKU-001' }),
      [baseCandidate({ sku: 'sku001' })],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.strength).toBe('strong');
    expect(matches[0]?.reasons).toContain('SKU idéntico');
  });

  it('flags similar title with extra non-edition words', () => {
    const matches = collectDuplicateMatches(
      baseValues({ name: 'La historia de Mo edicion limitada' }),
      [baseCandidate()],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reasons).toContain('Nombre o título parecido');
  });

  it('does not cross-match different categories for similar titles', () => {
    const matches = collectDuplicateMatches(baseValues(), [
      baseCandidate({ categoryId: 'cat-vinyl' }),
    ]);
    expect(matches).toHaveLength(0);
  });

  it('does not flag traveler notebook variants that share brand and prefix', () => {
    const matches = collectDuplicateMatches(stationeryValues(), [
      stationeryCandidate(),
    ]);
    expect(matches).toHaveLength(0);
  });

  it('does not flag traveler notebook refill variants with shared prefix', () => {
    const matches = collectDuplicateMatches(
      stationeryValues({
        name: "Traveler's Notebook Regular 031 Refill Sticker release paper",
      }),
      [
        stationeryCandidate({
          name: "Traveler's Notebook Regular 012 Refill sketch paper",
        }),
      ],
    );
    expect(matches).toHaveLength(0);
  });

  it('does not flag traveler notebook paper variants with shared prefix', () => {
    const matches = collectDuplicateMatches(
      stationeryValues({
        name: "Traveler's Notebook Regular 027 Refill Watercolor paper",
      }),
      [
        stationeryCandidate({
          name: "Traveler's Notebook Regular 025 Refill MD paper cream",
        }),
      ],
    );
    expect(matches).toHaveLength(0);
  });

  it('flags exact same stationery name in same category', () => {
    const matches = collectDuplicateMatches(
      stationeryValues(),
      [
        stationeryCandidate({
          name: "Traveler's Notebook Regular Cover Camel",
        }),
      ],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reasons).toContain('Nombre o título idéntico');
  });

  it('flags exact same name with same brand even in different category', () => {
    const matches = collectDuplicateMatches(
      stationeryValues({ categoryId: 'cat-other' }),
      [
        stationeryCandidate({
          name: "Traveler's Notebook Regular Cover Camel",
        }),
      ],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.reasons).toContain('Nombre o título idéntico');
    expect(matches[0]?.reasons).toContain('Misma editorial, marca o sello');
  });

  it('only shows archived products for strong identifier matches', () => {
    const matches = collectDuplicateMatches(
      stationeryValues(),
      [
        stationeryCandidate({
          name: "Traveler's Notebook Regular Cover Camel",
          isActive: false,
        }),
      ],
    );
    expect(matches).toHaveLength(0);
  });

  it('shows archived products for strong barcode matches', () => {
    const matches = collectDuplicateMatches(
      stationeryValues({ barcode: '999888777' }),
      [
        stationeryCandidate({
          barcode: '999888777',
          isActive: false,
        }),
      ],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.isArchived).toBe(true);
    expect(matches[0]?.strength).toBe('strong');
  });
});
