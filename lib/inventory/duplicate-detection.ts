import type {
  DuplicateProductMatch,
  DuplicateProductMatchStrength,
} from '@/app/(protected)/inventory/product-form-state';

export type DuplicateDetectionValues = {
  name: string;
  categoryId: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  isbn: string;
  barcode: string;
  sku: string;
};

export type DuplicateCandidate = {
  id: string;
  name: string;
  creatorOrAuthor: string;
  brandPublisherLabel: string;
  categoryId: string | null;
  categoryName: string;
  condition: string | null;
  currentStock: number;
  price: number;
  barcode: string;
  sku: string;
  isbn: string;
  isActive: boolean;
};

const EDITION_SUFFIX_PATTERN =
  /^(?:#\s*)?(?:(?:vol|volumen|parte|tomo|tom)\.?\s*)?(?:\d{1,3}|[ivxlc]+)$/iu;

const PRODUCT_DIFFERENTIATOR_WORDS = new Set([
  'regular',
  'passport',
  'cover',
  'refill',
  'sticker',
  'sketch',
  'watercolor',
  'cream',
  'pocket',
  'mini',
  'large',
  'small',
  'medium',
  'camel',
  'olive',
  'black',
  'white',
  'red',
  'blue',
  'green',
  'brown',
  'grey',
  'gray',
  'pink',
  'yellow',
  'orange',
  'purple',
  'md',
  'grid',
  'lined',
  'blank',
  'dot',
  'release',
]);

const PRODUCT_CODE_PATTERN = /\b\d{2,4}\b/u;

function removeAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeText(value: string) {
  return removeAccents(value)
    .toLocaleLowerCase('es')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeIdentifier(value: string) {
  return removeAccents(value)
    .toLocaleLowerCase('es')
    .trim()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/** True when longer is shorter + only an edition/volume suffix (e.g. "… Mo 2"). */
export function isEditionOnlySuffix(longer: string, shorter: string) {
  if (longer.length <= shorter.length || !longer.startsWith(shorter)) {
    return false;
  }

  const suffix = longer.slice(shorter.length).trim();
  if (!suffix) {
    return false;
  }

  return EDITION_SUFFIX_PATTERN.test(suffix);
}

function suffixHasProductDifferentiators(suffix: string) {
  if (PRODUCT_CODE_PATTERN.test(suffix)) {
    return true;
  }

  const words = normalizeText(suffix).split(' ').filter((word) => word.length > 0);
  return words.some((word) => PRODUCT_DIFFERENTIATOR_WORDS.has(word));
}

export function namesAreExactlyEqual(left: string, right: string) {
  const leftName = normalizeText(left);
  const rightName = normalizeText(right);
  return leftName.length > 0 && leftName === rightName;
}

export function namesAreLikelySameProduct(left: string, right: string) {
  const leftName = normalizeText(left);
  const rightName = normalizeText(right);

  if (leftName.length === 0 || rightName.length === 0 || leftName === rightName) {
    return false;
  }

  const [shorter, longer] =
    leftName.length <= rightName.length
      ? [leftName, rightName]
      : [rightName, leftName];

  if (!longer.startsWith(shorter)) {
    return false;
  }

  if (isEditionOnlySuffix(longer, shorter)) {
    return false;
  }

  const suffix = longer.slice(shorter.length).trim();
  if (!suffix) {
    return false;
  }

  return !suffixHasProductDifferentiators(suffix);
}

function buildDuplicateMatch(input: {
  values: DuplicateDetectionValues;
  candidate: DuplicateCandidate;
}): DuplicateProductMatch | null {
  const { values, candidate } = input;
  const reasons: string[] = [];
  let strength: DuplicateProductMatchStrength = 'possible';

  const inputIsbn = normalizeIdentifier(values.isbn);
  const candidateIsbn = normalizeIdentifier(candidate.isbn);
  const inputBarcode = normalizeIdentifier(values.barcode);
  const candidateBarcode = normalizeIdentifier(candidate.barcode);
  const inputSku = normalizeIdentifier(values.sku);
  const candidateSku = normalizeIdentifier(candidate.sku);

  if (inputIsbn && candidateIsbn && inputIsbn === candidateIsbn) {
    reasons.push('ISBN idéntico');
    strength = 'strong';
  }

  if (inputBarcode && candidateBarcode && inputBarcode === candidateBarcode) {
    reasons.push('Código de barras idéntico');
    strength = 'strong';
  }

  if (inputSku && candidateSku && inputSku === candidateSku) {
    reasons.push('SKU idéntico');
    strength = 'strong';
  }

  const sameCategory =
    values.categoryId.length > 0 &&
    candidate.categoryId !== null &&
    candidate.categoryId.length > 0 &&
    values.categoryId === candidate.categoryId;

  const namesEqual = namesAreExactlyEqual(values.name, candidate.name);
  const namesLikelySame = namesAreLikelySameProduct(values.name, candidate.name);

  const inputCreator = normalizeText(values.creatorOrAuthor);
  const candidateCreator = normalizeText(candidate.creatorOrAuthor);
  const sameCreator =
    inputCreator.length > 0 &&
    candidateCreator.length > 0 &&
    inputCreator === candidateCreator;

  const inputBrand = normalizeText(values.brandPublisherLabel);
  const candidateBrand = normalizeText(candidate.brandPublisherLabel);
  const sameBrand =
    inputBrand.length > 0 &&
    candidateBrand.length > 0 &&
    inputBrand === candidateBrand;

  const exactNameDuplicate =
    namesEqual && (sameCategory || sameCreator || sameBrand);
  const similarNameDuplicate =
    namesLikelySame && sameCategory && (sameCreator || sameBrand);

  if (exactNameDuplicate || similarNameDuplicate) {
    if (namesEqual) {
      reasons.push('Nombre o título idéntico');
    } else {
      reasons.push('Nombre o título parecido');
    }

    if (sameCreator) {
      reasons.push('Mismo creador o autor');
    }

    if (sameBrand) {
      reasons.push('Misma editorial, marca o sello');
    }
  }

  if (strength !== 'strong' && !exactNameDuplicate && !similarNameDuplicate) {
    return null;
  }

  if (reasons.length === 0) {
    return null;
  }

  return {
    productId: candidate.id,
    strength,
    reasons,
    isArchived: candidate.isActive !== true,
    name: candidate.name,
    creatorOrAuthor: candidate.creatorOrAuthor,
    brandPublisherLabel: candidate.brandPublisherLabel,
    categoryName: candidate.categoryName,
    condition: candidate.condition,
    currentStock: candidate.currentStock,
    price: candidate.price,
    barcode: candidate.barcode,
    sku: candidate.sku,
    isbn: candidate.isbn,
  };
}

function sortDuplicateMatches(matches: DuplicateProductMatch[]) {
  return matches.sort((left, right) => {
    if (left.strength !== right.strength) {
      return left.strength === 'strong' ? -1 : 1;
    }

    if (left.isArchived !== right.isArchived) {
      return left.isArchived ? 1 : -1;
    }

    return left.name.localeCompare(right.name, 'es');
  });
}

export function collectDuplicateMatches(
  values: DuplicateDetectionValues,
  candidates: DuplicateCandidate[],
) {
  const matches = candidates
    .map((candidate) => buildDuplicateMatch({ values, candidate }))
    .filter((match): match is DuplicateProductMatch => match !== null)
    .filter((match) => {
      if (!match.isArchived) {
        return true;
      }

      return match.strength === 'strong';
    });

  const uniqueByProduct = new Map<string, DuplicateProductMatch>();
  for (const match of sortDuplicateMatches(matches)) {
    if (!uniqueByProduct.has(match.productId)) {
      uniqueByProduct.set(match.productId, match);
    }
  }

  return Array.from(uniqueByProduct.values());
}
