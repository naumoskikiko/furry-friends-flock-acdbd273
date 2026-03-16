/**
 * PetMatch Compatibility Algorithm
 * Calculates a match score between two pets based on multiple factors.
 */

interface PetForMatch {
  animal_type: string;
  breed: string | null;
  gender: string | null;
  age: string | null;
  neutered: boolean | null;
  vaccinated: boolean | null;
  weight: string | null;
}

interface MatchResult {
  score: number; // 0-100
  label: string;
  color: string;
  factors: { name: string; score: number; icon: string }[];
}

// Known breed compatibility groups (simplified)
const BREED_GROUPS: Record<string, string[]> = {
  retriever: ["golden retriever", "labrador retriever", "labrador", "golden"],
  shepherd: ["german shepherd", "australian shepherd", "belgian shepherd", "dutch shepherd"],
  terrier: ["yorkshire terrier", "bull terrier", "jack russell", "fox terrier", "cairn terrier"],
  spaniel: ["cocker spaniel", "springer spaniel", "cavalier king charles", "english springer spaniel"],
  bulldog: ["english bulldog", "french bulldog", "american bulldog"],
  poodle: ["poodle", "toy poodle", "miniature poodle", "standard poodle"],
  husky: ["siberian husky", "alaskan malamute", "samoyed"],
  persian: ["persian", "himalayan", "exotic shorthair"],
  siamese: ["siamese", "burmese", "tonkinese", "oriental shorthair"],
  tabby: ["tabby", "american shorthair", "british shorthair", "scottish fold"],
};

function getBreedGroup(breed: string): string | null {
  const lower = breed.toLowerCase();
  for (const [group, breeds] of Object.entries(BREED_GROUPS)) {
    if (breeds.some((b) => lower.includes(b) || b.includes(lower))) return group;
  }
  return null;
}

function parseAge(age: string | null): number | null {
  if (!age) return null;
  const match = age.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export function calculateCompatibility(myPet: PetForMatch, otherPet: PetForMatch): MatchResult {
  const factors: { name: string; score: number; icon: string }[] = [];

  // 1. Species match (must match)
  if (myPet.animal_type !== otherPet.animal_type) {
    return { score: 0, label: "Incompatible", color: "text-destructive", factors: [{ name: "Species", score: 0, icon: "🚫" }] };
  }

  // 2. Gender compatibility (opposite preferred for breeding)
  let genderScore = 50;
  if (myPet.gender && otherPet.gender) {
    if (myPet.gender !== otherPet.gender) genderScore = 100;
    else genderScore = 20;
  }
  factors.push({ name: "Gender", score: genderScore, icon: "⚧" });

  // 3. Breed compatibility
  let breedScore = 60;
  if (myPet.breed && otherPet.breed) {
    const myBreedLower = myPet.breed.toLowerCase();
    const otherBreedLower = otherPet.breed.toLowerCase();
    if (myBreedLower === otherBreedLower) {
      breedScore = 100;
    } else {
      const myGroup = getBreedGroup(myPet.breed);
      const otherGroup = getBreedGroup(otherPet.breed);
      if (myGroup && otherGroup && myGroup === otherGroup) breedScore = 85;
      else breedScore = 45;
    }
  }
  factors.push({ name: "Breed", score: breedScore, icon: "🧬" });

  // 4. Age compatibility (ideal: 2-5 years, compatible within 2 years)
  let ageScore = 60;
  const myAge = parseAge(myPet.age);
  const otherAge = parseAge(otherPet.age);
  if (myAge !== null && otherAge !== null) {
    const ageDiff = Math.abs(myAge - otherAge);
    const avgAge = (myAge + otherAge) / 2;
    // Ideal breeding age 2-6
    const ageBonus = avgAge >= 2 && avgAge <= 6 ? 20 : avgAge >= 1 && avgAge <= 8 ? 10 : 0;
    if (ageDiff <= 1) ageScore = 90 + (ageBonus > 10 ? 10 : ageBonus);
    else if (ageDiff <= 2) ageScore = 75 + (ageBonus > 15 ? 15 : ageBonus);
    else if (ageDiff <= 3) ageScore = 55;
    else ageScore = 35;
  }
  factors.push({ name: "Age", score: Math.min(100, ageScore), icon: "📅" });

  // 5. Health readiness
  let healthScore = 50;
  if (otherPet.vaccinated === true) healthScore += 25;
  if (otherPet.neutered === false) healthScore += 25; // not neutered = can breed
  else if (otherPet.neutered === true) healthScore = 10; // neutered = can't breed
  factors.push({ name: "Health", score: Math.min(100, healthScore), icon: "💉" });

  // Weighted average
  const weights = { Gender: 0.2, Breed: 0.3, Age: 0.2, Health: 0.3 };
  const totalScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * (weights[f.name as keyof typeof weights] || 0.25), 0)
  );

  let label: string;
  let color: string;
  if (totalScore >= 85) { label = "Excellent Match"; color = "text-green-600"; }
  else if (totalScore >= 70) { label = "Great Match"; color = "text-green-500"; }
  else if (totalScore >= 55) { label = "Good Match"; color = "text-amber-500"; }
  else if (totalScore >= 40) { label = "Fair Match"; color = "text-orange-500"; }
  else { label = "Low Compatibility"; color = "text-muted-foreground"; }

  return { score: totalScore, label, color, factors };
}

export function getBreederTrustScore(listing: {
  breed_document_url: string | null;
  status: string;
  profile?: { full_name: string } | null;
}): { score: number; badges: string[] } {
  let score = 3.0;
  const badges: string[] = [];

  if (listing.breed_document_url) { score += 0.8; badges.push("Verified Breed"); }
  if (listing.status === "approved") { score += 0.5; badges.push("Approved Listing"); }
  if (listing.profile) { score += 0.5; badges.push("Verified Owner"); }

  return { score: Math.min(5, Math.round(score * 10) / 10), badges };
}

export function getMinBreedingAge(animalType: string): number {
  switch (animalType) {
    case "dog": return 2;
    case "cat": return 1;
    default: return 1;
  }
}

export function isSafeForBreeding(pet: PetForMatch): { safe: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (pet.neutered === true) warnings.push("Pet is neutered/spayed");

  const age = parseAge(pet.age);
  const minAge = getMinBreedingAge(pet.animal_type);
  if (age !== null && age < minAge) warnings.push(`Below minimum breeding age (${minAge}+ years)`);
  if (age !== null && age > 8) warnings.push("Advanced age for breeding");

  if (pet.vaccinated !== true) warnings.push("Vaccination status not confirmed");

  return { safe: warnings.length === 0, warnings };
}
