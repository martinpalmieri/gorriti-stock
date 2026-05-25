import { describe, expect, it } from 'vitest';
import {
  collectDuplicateMatches,
  isEditionOnlySuffix,
  type DuplicateCandidate,
  type DuplicateDetectionValues,
} from './duplicate-detection';

const categoryId = 'cat-books';

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

  it('flags strong match on identical ISBN regardless of title', () => {
    const matches = collectDuplicateMatches(
      baseValues({ name: 'Otro título', isbn: '9781234567890' }),
      [baseCandidate({ isbn: '978-1234567890' })],
    );
    expect(matches).toHaveLength(1);
    expect(matches[0]?.strength).toBe('strong');
    expect(matches[0]?.reasons).toContain('ISBN idéntico');
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
});
