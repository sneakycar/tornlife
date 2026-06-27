import { CALIBRATION_TAG_MAP, FEEDBACK_TAG_MAP } from "./constants";

function unique(tags: string[]): string[] {
  return [...new Set(tags)];
}

export function applyCalibrationTags(
  blocked: string[],
  preferred: string[],
  correction: string,
): { blocked: string[]; preferred: string[] } {
  const map = CALIBRATION_TAG_MAP[correction];
  if (!map) return { blocked, preferred };
  return {
    blocked: unique([...blocked, ...(map.block ?? [])]),
    preferred: unique([...preferred, ...(map.prefer ?? [])]),
  };
}

export function applyFeedbackTags(
  blocked: string[],
  preferred: string[],
  feedbackType: string,
  entryTags: string[],
): { blocked: string[]; preferred: string[] } {
  const map = FEEDBACK_TAG_MAP[feedbackType];
  let nextBlocked = [...blocked];
  let nextPreferred = [...preferred];

  if (map?.block) nextBlocked = unique([...nextBlocked, ...map.block]);
  if (map?.prefer) nextPreferred = unique([...nextPreferred, ...map.prefer]);

  if (feedbackType === "More like this") {
    nextPreferred = unique([...nextPreferred, ...entryTags]);
  } else if (feedbackType === "Less like this") {
    nextBlocked = unique([...nextBlocked, ...entryTags]);
  } else if (feedbackType === "Never reference this again") {
    nextBlocked = unique([...nextBlocked, ...entryTags]);
  }

  return { blocked: nextBlocked, preferred: nextPreferred };
}

export function extractCanonTags(text: string, toneTags: string[]): string[] {
  const tags = [...toneTags];
  const lower = text.toLowerCase();
  if (lower.includes("bourbon")) tags.push("bourbon");
  if (lower.includes("dog")) tags.push("dog");
  if (lower.includes("jacket")) tags.push("bad_jackets");
  if (lower.includes("hospital")) tags.push("hospital_avoidance");
  if (lower.includes("phone")) tags.push("phone_avoidance");
  if (lower.includes("night") && lower.includes("driv")) tags.push("night_driving");
  if (lower.includes("cash")) tags.push("cash");
  if (lower.includes("motel")) tags.push("motel");
  if (lower.includes("apartment")) tags.push("apartment");
  return unique(tags);
}
