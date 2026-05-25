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

function getSignificantWords(value: string) {
  return normalizeText(value)
    .split(' ')
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function firstSignificantWordsMatch(left: string, right: string) {
  const leftWords = getSignificantWords(left);
  const rightWords = getSignificantWords(right);
  if (leftWords.length === 0 || rightWords.length === 0) {
    return false;
  }

  const wordsToCheck = Math.min(2, leftWords.length, rightWords.length);
  for (let index = 0; index < wordsToCheck; index += 1) {
    if (leftWords[index] !== rightWords[index]) {
      return false;
    }
  }

  return true;
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

function namesIncludeSimilar(inputName: string, candidateName: string) {
  if (inputName.length === 0 || candidateName.length === 0) {
    return false;
  }

  if (inputName === candidateName) {
    return false;
  }

  if (inputName.includes(candidateName)) {
    if (
      inputName.length > candidateName.length &&
      isEditionOnlySuffix(inputName, candidateName)
    ) {
      return false;
    }
    return true;
  }

  if (candidateName.includes(inputName)) {
    if (
      candidateName.length > inputName.length &&
      isEditionOnlySuffix(candidateName, inputName)
    ) {
      return false;
    }
    return true;
  }

  return false;
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

  const inputName = normalizeText(values.name);
  const candidateName = normalizeText(candidate.name);
  const editionVariant =
    inputName.length > 0 &&
    candidateName.length > 0 &&
    (isEditionOnlySuffix(inputName, candidateName) ||
      isEditionOnlySuffix(candidateName, inputName));
  const namesEqual = inputName.length > 0 && inputName === candidateName;
  const namesInclude = namesIncludeSimilar(inputName, candidateName);
  const namesFirstWordsMatch =
    !editionVariant &&
    firstSignificantWordsMatch(values.name, candidate.name);
  const nameLooksSimilar =
    !editionVariant &&
    (namesEqual || namesInclude || namesFirstWordsMatch);

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

  const textDuplicateInSameCategory =
    sameCategory &&
    (namesEqual || (nameLooksSimilar && (sameCreator || sameBrand)));

  if (textDuplicateInSameCategory) {
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

  if (strength !== 'strong' && !textDuplicateInSameCategory) {
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
