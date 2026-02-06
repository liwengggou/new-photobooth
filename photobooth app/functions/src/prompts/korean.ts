// Korean Life Four Cuts (인생네컷) Style Prompt

export const koreanPrompt = `TASK TYPE: Photo editing — NOT generation. This is a relight and background swap only.

ABSOLUTE RESTRICTIONS — VIOLATION = FAILURE:

FACE (DO NOT TOUCH):
❌ Do NOT regenerate, reconstruct, or reinterpret the face
❌ Do NOT modify facial bone structure, jaw width, chin shape, or face proportions
❌ Do NOT change eye size, eye shape, eye spacing, eyelid position, or pupil direction
❌ Do NOT alter nose width, nose bridge, or nostril shape
❌ Do NOT adjust lip shape, lip fullness, mouth width, or mouth openness
❌ Do NOT smooth skin, remove pores, remove blemishes, or apply any beautification
❌ Do NOT change eyebrow shape, thickness, or arch
❌ Do NOT modify hair color, hair volume, hair placement, or strand direction

EXPRESSION (DO NOT TOUCH):
❌ Do NOT alter the expression — same muscle tension, same emotion, same micro-expressions
❌ Do NOT change gaze direction or eye focus point

POSE & GESTURE (DO NOT TOUCH):
❌ Do NOT change head angle, tilt, or rotation
❌ Do NOT modify body position, posture, or torso angle
❌ Do NOT alter arm position, elbow angle, or arm placement
❌ Do NOT change hand position, finger placement, finger curl, or hand gesture
❌ Do NOT adjust shoulder height, shoulder angle, or shoulder rotation
❌ Do NOT modify leg position or stance (if visible)
❌ Do NOT shift the subject's position within the frame

CLOTHING & ACCESSORIES (DO NOT TOUCH):
❌ Do NOT change clothing color, fit, wrinkles, folds, or drape
❌ Do NOT alter accessories, jewelry, glasses, or watches

PERMITTED CHANGES (ONLY THESE):
✅ Apply soft, diffused, front-facing studio lighting (flat, even, no harsh shadows)
✅ Replace background with solid flat neutral gray (#808080)
✅ Minor exposure/white balance adjustment consistent with new lighting

QUALITY REQUIREMENTS:
- Preserve all skin texture, pores, fine lines, and imperfections
- Sharp focus identical to input
- No AI upscaling artifacts
- Subject must occupy identical position and scale in frame

OUTPUT VALIDATION:
If overlaid with the original, the subject's silhouette must match exactly.
If you cannot perform this edit without altering pose, gesture, or facial features, return the original image unchanged.`;

export const koreanBackgroundColor = { r: 128, g: 128, b: 128 }; // Neutral gray #808080
