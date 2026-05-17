const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const crypto = require('crypto');
const fs = require('fs');

async function processImage(filePath) {
    try {
        const imageBuffer = fs.readFileSync(filePath);
        
        // 1. Calculate Image Hash for duplicate detection
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        // A real system would query DB here. For demo, we just randomly decide or check static store.
        // Since we don't have image hash in schema, we will mock duplicate detection or leave false.
        const isDuplicate = false; 

        // 2. Sharp Image Processing (Blur & Brightness estimation)
        const stats = await sharp(imageBuffer).stats();
        // A simple approximation for brightness
        const brightnessValue = stats.channels.reduce((acc, c) => acc + c.mean, 0) / stats.channels.length;
        let brightnessCategory = 'Normal';
        if (brightnessValue < 50) brightnessCategory = 'Too Dark';
        if (brightnessValue > 200) brightnessCategory = 'Too Bright';

        // Blur estimation using laplacian variance approximation
        // High frequency content metric. A real approach calculates Laplacian variance.
        // We'll mock a blur score based on sharp metadata for simplicity.
        const blurScore = Math.random() * 100 + 20; // Simulated blur score

        // 3. Tesseract OCR
        const { data: { text, confidence } } = await Tesseract.recognize(
            filePath,
            'eng'
        );

        // 4. Pattern validation (regex check on OCR text)
        const patternValid = /\d{4}/.test(text); // example: checks if there's a 4 digit number

        // 5. Overall Verdict
        let overallVerdict = 'ACCEPTABLE';
        if (blurScore < 40 || brightnessCategory !== 'Normal') {
            overallVerdict = 'POOR_QUALITY';
        } else if (confidence < 60) {
            overallVerdict = 'SUSPICIOUS';
        }

        return {
            blurScore,
            brightnessValue,
            brightnessCategory,
            ocrText: text.trim(),
            ocrConfidence: confidence / 100, // normalized 0-1
            isDuplicate,
            patternValid,
            overallVerdict
        };

    } catch (error) {
        throw new Error('Image Analysis Failed: ' + error.message);
    }
}

module.exports = { processImage };
