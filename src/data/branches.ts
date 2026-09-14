import { Branch } from '../types.js';

/**
 * Generates a secure, randomized password semantically derived from the branch name,
 * but distinctly DIFFERENT from the branch name itself.
 *
 * Example generated patterns:
 * - "Petworld Clinic" (B01)            -> "PWC#742@Vet"
 * - "Riddhipetzone" (B02)              -> "RPZ$581#Paw"
 * - "Petworld Hospet" (B03)            -> "PWH*499@Hub"
 * - "Ballari Wholesale Pet Shop" (B04) -> "BWP#060$Bulk"
 * - "Pet Bazaar" (B05)                 -> "PBZ@805*Mkt"
 * - "Gandhinagar Pet Centre" (B06)     -> "GPC#810@Hub"
 */
export function generateBranchPassword(branchName: string, branchCode?: string): string {
  const cleanName = branchName.replace(/[^a-zA-Z0-9\s]/g, ' ');
  const words = cleanName.split(/\s+/).filter(Boolean);
  
  // Acronym from capital letters or first letters of words
  let acronym = words.map((w) => w[0].toUpperCase()).join('');
  if (acronym.length < 2) {
    acronym = (branchCode ? branchCode.replace(/[^a-zA-Z0-9]/g, '') : 'PW').toUpperCase();
  } else if (acronym.length > 4) {
    acronym = acronym.slice(0, 4);
  }

  // Pick semantic domain keyword related to the branch's distinct focus
  const nameLower = branchName.toLowerCase();
  let candidateKeywords: string[] = ['Store', 'Counter', 'Desk', 'Point'];
  if (nameLower.includes('clinic')) {
    candidateKeywords = ['Vet', 'Care', 'Med', 'Rx', 'Heal'];
  } else if (nameLower.includes('zone') || nameLower.includes('riddhi')) {
    candidateKeywords = ['Paw', 'Zone', 'Bark', 'Pack', 'Tail'];
  } else if (nameLower.includes('hospet')) {
    candidateKeywords = ['Hub', 'Dock', 'Gate', 'Post', 'Deck'];
  } else if (nameLower.includes('wholesale')) {
    candidateKeywords = ['Bulk', 'Supply', 'Mart', 'Trade', 'Depot'];
  } else if (nameLower.includes('bazaar')) {
    candidateKeywords = ['Mkt', 'Trade', 'Kart', 'Shop', 'Bazaar'];
  } else if (nameLower.includes('gandhinagar') || nameLower.includes('centre')) {
    candidateKeywords = ['Hub', 'Centre', 'Cross', 'Nest', 'Base'];
  }

  const keyword = candidateKeywords[Math.floor(Math.random() * candidateKeywords.length)];
  const randomNum = Math.floor(100 + Math.random() * 900);
  const symbols = ['#', '@', '$', '!', '*', '&'];
  const sym1 = symbols[Math.floor(Math.random() * symbols.length)];
  const sym2 = symbols[Math.floor(Math.random() * symbols.length)];

  return `${acronym}${sym1}${randomNum}${sym2}${keyword}`;
}

export const FIXED_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    code: 'B01',
    name: 'Petworld Clinic',
    address: '#45,WARD NO 23,AZZEZA COMPOUND, near SECOND RAILWAY GATE, Radio Park Cowl Bazar,Ballari, Karnataka 583102',
    city: 'Ballari',
    phone: '+919886387925',
    email: 'clinic@petworld.co.in',
    managerName: 'Vinay Kumar',
    status: 'ACTIVE',
    openingDate: '2021-03-15',
    taxRate: 18,
    gstin: '29AABCP1924M1Z5',
    accessPassword: 'pwc@927',
  },
  {
    id: 'branch-2',
    code: 'B02',
    name: 'Riddhipetzone',
    address: 'Anathapur Road, near Basava Rajeshwari School and college opposite Auto Gass Bunk, Patel Nagar, Ballari, Karnataka 583101',
    city: 'Ballari',
    phone: '9731308581',
    email: 'riddhipetzone@petworld.co.in',
    managerName: 'Swarna Gowri',
    status: 'ACTIVE',
    openingDate: '2021-09-10',
    taxRate: 18,
    gstin: '29AABCR4450E1Z1',
    accessPassword: 'rpz#634',
  },
  {
    id: 'branch-3',
    code: 'B03',
    name: 'Petworld Hospet',
    address: 'Opposite to government veterinary hospital swagi Market Hospet - 583201',
    city: 'Hospet',
    phone: '9742198499',
    email: 'hospet@petworld.co.in',
    managerName: 'Sushmitha',
    status: 'ACTIVE',
    openingDate: '2022-04-01',
    taxRate: 18,
    gstin: '29AACCM2918K1ZX',
    accessPassword: 'pwh$815',
  },
  {
    id: 'branch-4',
    code: 'B04',
    name: 'Ballari Wholesale Pet Shop',
    address: 'Opposite to Shanti shishu vihar Government school, Thalur Road, Ballari - 583101.',
    city: 'Ballari',
    phone: '+919632719060',
    email: 'wholesale@petworld.co.in',
    managerName: 'Kusuma',
    status: 'ACTIVE',
    openingDate: '2022-11-20',
    taxRate: 18,
    gstin: '29AABCD6710F1Z4',
    accessPassword: 'bwps!472',
  },
  {
    id: 'branch-5',
    code: 'B05',
    name: 'Pet Bazaar',
    address: 'RVR Complex, Mothi Circle, Veterinary Hospital, U/G No 10, opposite Government, Main Bazar, Cowl Bazaar, Ballari, Karnataka',
    city: 'Ballari',
    phone: '+918050229099',
    email: 'petbazaar@petworld.co.in',
    managerName: 'Aishu',
    status: 'ACTIVE',
    openingDate: '2023-06-12',
    taxRate: 18,
    gstin: '29AAECP1144Q1Z8',
    accessPassword: 'pb*293',
  },
  {
    id: 'branch-6',
    code: 'B06',
    name: 'Gandhinagar Pet Centre',
    address: 'Gandhinagar 1st Cross, Sanganakal Rd, opposite to Dr.BKS house, Ballari, Karnataka 583101',
    city: 'Ballari',
    phone: '+918105879796',
    email: 'gandhinagar@petworld.co.in',
    managerName: 'James',
    status: 'ACTIVE',
    openingDate: '2024-01-18',
    taxRate: 18,
    gstin: '29AAGFA9812M1Z2',
    accessPassword: 'gpc@568',
  },
];

export const OWNER_LOGIN_PASSWORD = 'PetWorld90';

export interface BranchCredential {
  branchId: string;
  branchCode: string;
  branchName: string;
  primaryPassword: string;
  acceptedPasswords: string[];
}

export const BRANCH_CREDENTIALS: Record<string, BranchCredential> = {
  'branch-1': {
    branchId: 'branch-1',
    branchCode: 'B01',
    branchName: 'Petworld Clinic',
    primaryPassword: 'pwc@927',
    acceptedPasswords: ['pwc@927'],
  },
  'branch-2': {
    branchId: 'branch-2',
    branchCode: 'B02',
    branchName: 'Riddhipetzone',
    primaryPassword: 'rpz#634',
    acceptedPasswords: ['rpz#634'],
  },
  'branch-3': {
    branchId: 'branch-3',
    branchCode: 'B03',
    branchName: 'Petworld Hospet',
    primaryPassword: 'pwh$815',
    acceptedPasswords: ['pwh$815'],
  },
  'branch-4': {
    branchId: 'branch-4',
    branchCode: 'B04',
    branchName: 'Ballari Wholesale Pet Shop',
    primaryPassword: 'bwps!472',
    acceptedPasswords: ['bwps!472'],
  },
  'branch-5': {
    branchId: 'branch-5',
    branchCode: 'B05',
    branchName: 'Pet Bazaar',
    primaryPassword: 'pb*293',
    acceptedPasswords: ['pb*293'],
  },
  'branch-6': {
    branchId: 'branch-6',
    branchCode: 'B06',
    branchName: 'Gandhinagar Pet Centre',
    primaryPassword: 'gpc@568',
    acceptedPasswords: ['gpc@568'],
  },
};

export function verifyPassword(scope: string, inputPassword: string, branch?: Branch): boolean {
  if (!inputPassword) return false;
  const clean = inputPassword.trim().toLowerCase();
  
  if (scope === 'OWNER') {
    return clean === OWNER_LOGIN_PASSWORD.toLowerCase();
  }

  // If a branch object with an updated accessPassword is provided
  if (branch && branch.accessPassword) {
    const branchPassClean = branch.accessPassword.trim().toLowerCase();
    if (clean === branchPassClean) {
      return true;
    }
    // Also accept simplified alphanumeric version (no special symbols)
    const simpleInput = clean.replace(/[^a-z0-9]/g, '');
    const simpleBranchPass = branchPassClean.replace(/[^a-z0-9]/g, '');
    if (simpleInput && simpleBranchPass && simpleInput === simpleBranchPass) {
      return true;
    }
  }

  const cred = BRANCH_CREDENTIALS[scope];
  if (cred) {
    return cred.acceptedPasswords.some((p) => p.toLowerCase() === clean);
  }

  return false;
}
