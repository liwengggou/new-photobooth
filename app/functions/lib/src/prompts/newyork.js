"use strict";
// New York Vintage Photo Booth Style Prompts
// Based on vertex-test/prompts/newyork_photobooth_v2.md
Object.defineProperty(exports, "__esModule", { value: true });
exports.newyorkBackgroundColor = exports.newyorkMatchPrompt = exports.newyorkMasterPrompt = exports.newyorkSystemInstruction = void 0;
exports.newyorkSystemInstruction = ""; // Not currently used
exports.newyorkMasterPrompt = `Transform this photo into an authentic vintage American photo booth portrait.

Format: Black and white only. Single high-resolution output.

Tonal quality: Faded, aged print aesthetic. Lifted blacks (no pure black—washed, milky shadows). Dulled whites (no pure white except flash hotspots). Low-to-medium contrast with compressed tonal range. Should look like a photograph that sat in a shoebox for 40 years.

Flash: Direct frontal camera-mounted flash. Bright glow on center of face (forehead, nose, cheeks). Soft halation bleeding from bright areas. Small specular highlights on skin (forehead, nose tip, cheekbones). Visible dark shadow cast on background behind subject.

Film texture: Visible silver halide film grain throughout entire image, most prominent in midtones. Authentic analog texture, not digital noise.

Sharpness: Vintage lens softness. Face reasonably sharp but not crisp. Slight edge falloff. Not modern digital sharpness.

Background: Plain medium-gray photo booth curtain/backdrop. Subject's flash shadow visible.

Preserve exactly: All facial features, expression, pose, clothing, hair, accessories. No beautification or reshaping. Skin texture more visible under flash.

Avoid: Color, high contrast, pure blacks/whites, modern sharpness, HDR look, face modification, digital noise patterns.`;
// Not currently used - for future chat-based multi-photo approach
exports.newyorkMatchPrompt = "";
exports.newyorkBackgroundColor = { r: 96, g: 96, b: 96 }; // Medium-dark gray #606060
//# sourceMappingURL=newyork.js.map