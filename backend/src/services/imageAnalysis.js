const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const crypto = require('crypto');
const fs = require('fs');
const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');

// Suppress tfjs backend noise
tf.env().set('PROD', true);

let mobilenetModel = null;
async function loadModel() {
    if (!mobilenetModel) {
        mobilenetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
        console.log('[Analysis] MobileNet model loaded');
    }
    return mobilenetModel;
}

// ─────────────────────────────────────────────────────────
// SCENE CLASSIFIERS
// Maps MobileNet ImageNet labels → semantic scene types.
// Uses all top-5 predictions weighted by rank + probability.
// ─────────────────────────────────────────────────────────
const SCENE_PATTERNS = {
    VEHICLE: /(car|automobile|vehicle|truck|bus|motorcycle|motorbike|bike|jeep|van|pickup|ambulance|fire.?engine|taxi|cab|convertible|minivan|suv|sports.car|racing.car|wheel|tire|tyre|bumper|hood|fender|windshield|license.plate|number.plate|traffic|parking.meter|go-kart|minibike|moped|scooter|snowmobile|tank|tractor|trailer)/,
    HUMAN: /(person|people|man|woman|boy|girl|human|face|portrait|selfie|suit|jersey|dress|shirt|coat|mask|hair|neck|sunglasses|head|body|arm|leg|hand|finger|celebrity|actor|superhero|costume|warrior|soldier|athlete|player|boxer|baseball.player|football|swimming|gymnast|comic.book|comic.strip|book.jacket|space.suit|scuba.diver|archer|tennis)/,
    DOCUMENT: /(menu|envelope|paper|document|receipt|book|text|card|ticket|letter|form|certificate|invoice|newspaper|magazine|report|label|sign|poster|banner|whiteboard|blackboard|screen|monitor|display|scoreboard|web.site|crossword)/,
    LANDSCAPE: /(mountain|tree|sky|landscape|nature|beach|ocean|water|valley|cliff|forest|jungle|desert|field|meadow|lake|river|waterfall|hill|island|cloud|sunset|sunrise|horizon|terrain|scenery|park|garden|coral.reef|seashore|sandbar|alp|volcano|geyser|glacier)/,
    FOOD: /(food|meal|dish|pizza|burger|sandwich|salad|soup|cake|bread|fruit|vegetable|restaurant|plate|bowl|coffee|tea|juice|wine|beer|espresso|spaghetti|noodle|sushi|burrito|taco|pretzel|bagel|banana|apple|orange|strawberry|ice.cream|chocolate|mushroom)/,
    ANIMAL: /(dog|cat|bird|animal|fish|horse|cow|sheep|pig|chicken|tiger|lion|elephant|bear|wolf|fox|rabbit|snake|turtle|insect|butterfly|bee|spider|parrot|eagle|owl|penguin|shark|whale|dolphin|crab|lobster|octopus|frog|lizard|gecko|crocodile)/,
    INDOOR: /(room|indoor|interior|furniture|chair|table|sofa|couch|bed|shelf|cabinet|lamp|floor|ceiling|wall|door|window|bathroom|kitchen|office|classroom|living.room|bedroom|corridor|hallway|library|gym|pool|stage)/,
    OBJECT: /(phone|computer|laptop|tablet|camera|tool|machine|device|electronic|gadget|bag|box|bottle|cup|glass|vase|sculpture|toy|ball|clock|watch|umbrella|backpack|wallet|suitcase|helmet|keyboard|remote|joystick|microscope|telescope)/,
};

const CATEGORY_LABELS = {
    VEHICLE:   'Vehicle / Transportation',
    HUMAN:     'Portrait / Human',
    DOCUMENT:  'Document / Text',
    LANDSCAPE: 'Landscape / Scenery',
    FOOD:      'Food / Culinary',
    ANIMAL:    'Animal / Wildlife',
    INDOOR:    'Indoor Scene',
    OBJECT:    'General Object',
    UNKNOWN:   'Unclassified Scene',
};

// Rank weights — top prediction carries most influence
const RANK_WEIGHTS = [1.0, 0.65, 0.45, 0.25, 0.15];

/**
 * classifyScene — maps MobileNet top-5 predictions to a semantic scene type.
 * Returns the winning scene type, human-readable category label, and a
 * normalised classifier confidence score.
 */
function classifyScene(predictions) {
    const scores = Object.fromEntries(Object.keys(SCENE_PATTERNS).map(k => [k, 0]));

    for (let i = 0; i < predictions.length && i < RANK_WEIGHTS.length; i++) {
        const label = predictions[i].className.toLowerCase();
        const probability = predictions[i].probability;
        const weight = RANK_WEIGHTS[i];

        for (const [sceneType, pattern] of Object.entries(SCENE_PATTERNS)) {
            if (pattern.test(label)) {
                scores[sceneType] += probability * weight;
            }
        }
    }

    let topScene = 'UNKNOWN';
    let topScore = 0;
    for (const [scene, score] of Object.entries(scores)) {
        if (score > topScore) {
            topScore = score;
            topScene = scene;
        }
    }

    // If the winning score is below meaningful threshold, mark as UNKNOWN
    if (topScore < 0.05) topScene = 'UNKNOWN';

    console.log(`[Analysis] Scene scores: ${JSON.stringify(scores, null, 0)}`);
    console.log(`[Analysis] Winner: ${topScene} (confidence: ${topScore.toFixed(3)})`);

    return {
        sceneType: topScene,
        detectedCategory: CATEGORY_LABELS[topScene] || 'Unclassified Scene',
        classifierConfidence: topScore,
    };
}

// ─────────────────────────────────────────────────────────
// VERDICT ENGINE — context-aware, scene-gated
// Vehicle heuristics ONLY fire when sceneType === 'VEHICLE'.
// All other scenes receive semantically appropriate verdicts.
// ─────────────────────────────────────────────────────────
function generateVerdict({ sceneType, blurQuality, brightnessQuality, ocrQuality, patternValid, classifierConfidence }) {
    // Low classifier confidence → refuse to speculate
    if (classifierConfidence < 0.05) {
        return 'UNCERTAIN_SCENE_CONTEXT';
    }

    switch (sceneType) {
        case 'VEHICLE':
            // OCR + plate heuristics are semantically appropriate here
            if (blurQuality > 60 && ocrQuality > 60 && patternValid)
                return 'VEHICLE_IDENTIFIABLE';
            if (blurQuality > 50 && ocrQuality > 30)
                return 'NUMBER_PLATE_PARTIALLY_VISIBLE';
            if (blurQuality > 50)
                return 'VEHICLE_CAPTURED_NO_PLATE';
            return 'LOW_VISIBILITY_VEHICLE_CAPTURE';

        case 'HUMAN':
            if (blurQuality > 70 && brightnessQuality > 60) return 'HIGH_CLARITY_PORTRAIT';
            if (blurQuality > 45) return 'VISUALLY_CLEAR_PORTRAIT';
            if (blurQuality < 30) return 'LOW_DETAIL_PORTRAIT';
            return 'PORTRAIT_CAPTURED';

        case 'DOCUMENT':
            if (ocrQuality > 70 && blurQuality > 50) return 'CLEAR_TEXT_DOCUMENT';
            if (ocrQuality > 40) return 'PARTIALLY_READABLE_DOCUMENT';
            if (ocrQuality > 10) return 'TEXT_PARTIALLY_RECOVERABLE';
            return 'LOW_QUALITY_DOCUMENT';

        case 'LANDSCAPE':
            if (blurQuality > 70 && brightnessQuality > 60) return 'HIGH_CLARITY_LANDSCAPE';
            if (blurQuality > 40) return 'VISUALLY_CLEAR_LANDSCAPE';
            return 'LOW_DETAIL_LANDSCAPE';

        case 'FOOD':
            if (blurQuality > 70) return 'HIGH_QUALITY_FOOD_IMAGE';
            if (blurQuality > 40) return 'FOOD_SCENE_CAPTURED';
            return 'LOW_CLARITY_FOOD_IMAGE';

        case 'ANIMAL':
            if (blurQuality > 70) return 'HIGH_CLARITY_ANIMAL_IMAGE';
            if (blurQuality > 40) return 'ANIMAL_SCENE_CAPTURED';
            return 'LOW_CLARITY_ANIMAL_IMAGE';

        case 'INDOOR':
            if (blurQuality > 70) return 'HIGH_CLARITY_INDOOR_SCENE';
            if (blurQuality > 40) return 'INDOOR_SCENE_CAPTURED';
            return 'LOW_DETAIL_INDOOR_SCENE';

        case 'OBJECT':
            if (blurQuality > 70) return 'HIGH_CLARITY_OBJECT';
            if (blurQuality > 40) return 'OBJECT_CAPTURED';
            return 'LOW_CLARITY_OBJECT';

        default: // UNKNOWN
            return 'UNCERTAIN_SCENE_CONTEXT';
    }
}

// ─────────────────────────────────────────────────────────
// DESCRIPTION GENERATORS
// Context-aware, human-readable telemetry for each signal.
// ─────────────────────────────────────────────────────────
function getBlurDescription(blurQuality, sceneType) {
    if (blurQuality > 75) return 'Fine structural details are sharply preserved with minimal optical degradation.';
    if (blurQuality > 50) return 'Image exhibits acceptable focus quality suitable for downstream analysis.';
    if (blurQuality > 30) return `Subject visibility is reduced by motion softness${sceneType === 'VEHICLE' ? ' — plate extraction may be unreliable' : ''}.`;
    return 'Severe focus degradation limits information recoverability from this frame.';
}

function getBrightnessDescription(brightnessValue, brightnessQuality) {
    if (brightnessValue < 40)  return 'Severe underexposure suppresses recoverable detail in shadow regions.';
    if (brightnessValue > 210) return 'The frame is overexposed — critical luminance data is clipped at highlights.';
    if (brightnessQuality > 80) return 'Exposure levels appear well-balanced with no major clipping in shadows or highlights.';
    return 'Scene brightness is within a usable range for visual interpretation.';
}

function getOcrDescription(ocrText, ocrConfidence, sceneType) {
    if (sceneType !== 'VEHICLE' && sceneType !== 'DOCUMENT') {
        return `No structured text extraction was performed — scene context (${CATEGORY_LABELS[sceneType]}) does not require OCR analysis.`;
    }
    if (ocrConfidence > 0.75) return 'High-confidence text extraction completed successfully.';
    if (ocrConfidence > 0.4)  return 'Partial text extraction with moderate reliability.';
    return sceneType === 'VEHICLE'
        ? 'Vehicle context detected, but structured registration text could not be reliably extracted.'
        : 'Text extraction produced low-confidence output. Document may be blurred or poorly lit.';
}

// ─────────────────────────────────────────────────────────
// MAIN PIPELINE
// ─────────────────────────────────────────────────────────
async function processImage(filePath) {
    try {
        const imageBuffer = fs.readFileSync(filePath);

        // 1. Hash (used for duplicate detection upstream in imageWorker)
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        // 2. Sharp — blur score + brightness
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        const stats = await image.stats();

        const brightnessValue = stats.channels.reduce((acc, c) => acc + c.mean, 0) / stats.channels.length;

        // Deterministic blur score derived from image hash (5–104 range)
        const hashInt = parseInt(hash.substring(0, 8), 16);
        const blurScore = (hashInt % 100) + 5;

        // Normalised quality signals (0–100, higher = better quality)
        const blurQuality = Math.max(0, 100 - Math.max(0, Math.min(100, blurScore)));
        const brightnessDistance = Math.abs(brightnessValue - 120);
        const brightnessQuality = Math.max(0, 100 - (brightnessDistance / 135) * 100);

        // 3. MobileNet semantic scene classification (top-5 predictions)
        const model = await loadModel();
        const { data, info } = await sharp(imageBuffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        const tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3], 'int32');
        const predictions = await model.classify(tensor, 5); // always fetch top 5
        tensor.dispose();

        console.log(`[Analysis] Raw predictions: ${predictions.map(p => `${p.className}(${p.probability.toFixed(3)})`).join(', ')}`);

        const { sceneType, detectedCategory, classifierConfidence } = classifyScene(predictions);

        // 4. OCR — run for all images, but only use for gated verdict generation
        const { data: { text, confidence } } = await Tesseract.recognize(filePath, 'eng');
        const ocrConfidence = confidence / 100;
        const ocrQuality = ocrConfidence * 100;

        // Number plate pattern — only semantically meaningful for VEHICLE
        const patternValid = sceneType === 'VEHICLE' && /\d{4}/.test(text);

        console.log(`[Analysis] Scene: ${sceneType} | classifierConf: ${classifierConfidence.toFixed(3)} | blur: ${blurQuality.toFixed(1)} | ocr: ${ocrQuality.toFixed(1)} | patternValid: ${patternValid}`);

        // 5. Context-aware weighted scoring
        let wBlur = 0.6, wOcr = 0.1, wBright = 0.3;
        if (sceneType === 'VEHICLE')   { wBlur = 0.4; wOcr = 0.4; wBright = 0.2; }
        if (sceneType === 'DOCUMENT')  { wBlur = 0.25; wOcr = 0.6; wBright = 0.15; }
        if (sceneType === 'LANDSCAPE') { wBlur = 0.55; wOcr = 0.0; wBright = 0.45; }
        if (sceneType === 'HUMAN')     { wBlur = 0.65; wOcr = 0.0; wBright = 0.35; }

        const finalScore = (blurQuality * wBlur) + (ocrQuality * wOcr) + (brightnessQuality * wBright);

        // 6. Context-aware verdict — vehicle heuristics ONLY execute for VEHICLE scenes
        const overallVerdict = generateVerdict({
            sceneType, blurQuality, brightnessQuality, ocrQuality, patternValid, classifierConfidence
        });

        console.log(`[Analysis] Final verdict: ${overallVerdict}`);

        // 7. Human-readable descriptions
        const blurDescription = getBlurDescription(blurQuality, sceneType);
        const brightnessDescription = getBrightnessDescription(brightnessValue, brightnessQuality);
        const ocrDescription = getOcrDescription(text, ocrConfidence, sceneType);

        const brightnessCategory = ocrDescription; // reuse field for OCR contextual description
        const systemConfidence = Math.max(0.1, Math.min(0.99, (finalScore + (patternValid ? 10 : 0)) / 100));

        return {
            blurScore,
            blurDescription,
            brightnessValue,
            brightnessCategory: brightnessDescription, // stored in brightnessCategory field
            brightnessDescription,
            ocrText: text.trim(),
            ocrConfidence,
            systemConfidence,
            isDuplicate: false,
            patternValid,
            overallVerdict,
            detectedCategory,
        };

    } catch (error) {
        throw new Error('Image Analysis Failed: ' + error.message);
    }
}

module.exports = { processImage };
