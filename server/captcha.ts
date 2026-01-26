import { createCanvas } from "canvas";

const ONION_URL = "hiynu3jeowprbbp2haydjrakwmyjrf2ltqebplixdbgew7l33hfsjbad.onion";

interface CaptchaResult {
  imageBase64: string;
  indices: number[];
  sessionId: string;
}

export function generateCaptchaImage(storage: any): CaptchaResult {
  // Pick 6 random unique indices from the URL
  const indices: number[] = [];
  while (indices.length < 6) {
    const idx = Math.floor(Math.random() * ONION_URL.length);
    if (!indices.includes(idx)) {
      indices.push(idx);
    }
  }
  indices.sort((a, b) => a - b);

  // Store the session
  const sessionId = storage.storeCaptchaSession(indices);

  // Create canvas for the captcha image
  const width = 800;
  const height = 200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Dark background with noise
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, width, height);

  // Add noise dots
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(0, ${Math.random() * 100 + 50}, 0, ${Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      Math.random() * 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  // Add random lines for distortion
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(0, ${Math.random() * 150 + 100}, 0, ${Math.random() * 0.3 + 0.1})`;
    ctx.lineWidth = Math.random() * 2 + 1;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height
    );
    ctx.stroke();
  }

  // Draw the URL with distortion
  const fontSize = 22;
  const charWidth = 14;
  const startX = (width - ONION_URL.length * charWidth) / 2;
  const baseY = height / 2;

  for (let i = 0; i < ONION_URL.length; i++) {
    const char = ONION_URL[i];
    const isMissing = indices.includes(i);
    
    // Random position offset for distortion
    const offsetY = (Math.random() - 0.5) * 15;
    const offsetX = (Math.random() - 0.5) * 3;
    const rotation = (Math.random() - 0.5) * 0.3;
    
    ctx.save();
    ctx.translate(startX + i * charWidth + offsetX, baseY + offsetY);
    ctx.rotate(rotation);
    
    if (isMissing) {
      // Draw underscores or question marks for missing chars
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff0000";
      ctx.shadowBlur = 5;
      ctx.fillText("?", -charWidth / 4, fontSize / 3);
      
      // Draw the index number above
      ctx.font = `10px monospace`;
      ctx.fillStyle = "#ffff00";
      ctx.shadowBlur = 0;
      const indexInArray = indices.indexOf(i) + 1;
      ctx.fillText(`[${indexInArray}]`, -charWidth / 4, -fontSize / 2);
    } else {
      // Draw the actual character with varying opacity and distortion
      ctx.font = `bold ${fontSize + (Math.random() - 0.5) * 6}px monospace`;
      const greenIntensity = Math.floor(Math.random() * 100 + 100);
      ctx.fillStyle = `rgb(0, ${greenIntensity}, 0)`;
      ctx.shadowColor = "#00ff00";
      ctx.shadowBlur = Math.random() * 3;
      ctx.fillText(char, -charWidth / 4, fontSize / 3);
    }
    
    ctx.restore();
  }

  // Add more distortion: wave effect overlay
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Simple wave distortion simulation (shift some pixels)
  for (let y = 0; y < height; y++) {
    const shift = Math.floor(Math.sin(y * 0.05) * 3);
    if (shift !== 0) {
      for (let x = 0; x < width - Math.abs(shift); x++) {
        const srcIdx = (y * width + x) * 4;
        const destIdx = (y * width + x + shift) * 4;
        if (destIdx >= 0 && destIdx < data.length - 4) {
          // Swap pixels slightly for blur effect
          const temp = data[srcIdx + 1]; // Green channel
          data[srcIdx + 1] = Math.min(255, data[srcIdx + 1] + Math.random() * 20);
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);

  // Add scanlines effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1);
  }

  // Add instruction text at bottom
  ctx.font = "14px monospace";
  ctx.fillStyle = "#00aa00";
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.fillText("Enter the 6 missing characters marked with [1]-[6]", width / 2, height - 20);

  // Convert to base64
  const imageBase64 = canvas.toDataURL("image/png");

  return {
    imageBase64,
    indices,
    sessionId
  };
}

export function verifyCaptcha(storage: any, sessionId: string, characters: string[]): boolean {
  const indices = storage.getCaptchaSession(sessionId);
  
  if (!indices || indices.length !== characters.length) {
    return false;
  }

  // Check each character matches the correct position in the URL
  for (let i = 0; i < indices.length; i++) {
    const expectedChar = ONION_URL[indices[i]].toLowerCase();
    const submittedChar = (characters[i] || "").toLowerCase();
    
    if (expectedChar !== submittedChar) {
      return false;
    }
  }

  // Remove the session after successful verification
  storage.removeCaptchaSession(sessionId);
  return true;
}
