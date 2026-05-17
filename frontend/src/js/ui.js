import { handleUpload } from './upload.js';
import { pollStatus } from './status.js';
import * as api from './api.js';

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const statusCard = document.getElementById('status-card');
const resultsCard = document.getElementById('results-card');

let selectedFile = null;

dropZone.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
    selectedFile = e.target.files[0];
    if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (re) => {
            document.getElementById('image-preview').src = re.target.result;
            document.getElementById('preview-container').classList.remove('hidden');
            uploadBtn.disabled = false;
        };
        reader.readAsDataURL(selectedFile);
    }
};

uploadBtn.onclick = async () => {
    try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';
        document.getElementById('error-container').classList.add('hidden');
        
        const id = await handleUpload(selectedFile);
        statusCard.classList.remove('hidden');
        pollStatus(id, updateStatusUI, showResults);
    } catch (err) {
        showError(err.message);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Start Analysis';
    }
};

const showError = (msg) => {
    const errContainer = document.getElementById('error-container');
    errContainer.textContent = msg;
    errContainer.classList.remove('hidden');
};

export const updateStatusUI = (status) => {
    document.getElementById('status-text').textContent = status;
};

const showResults = async (id, status) => {
    if (status === 'COMPLETED') {
        const resData = await api.getResult(id);
        const results = resData.data;
        resultsCard.classList.remove('hidden');
        
        const grid = document.getElementById('results-grid');
        grid.innerHTML = `
            <div class="result-item">
                <span class="result-label">Verdict</span>
                <span class="badge ${results.overallVerdict}">${results.overallVerdict}</span>
            </div>
            <div class="result-item">
                <span class="result-label">OCR Text</span>
                <span class="result-value">${results.ocrText || 'N/A'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Confidence</span>
                <span class="result-value">${(results.ocrConfidence * 100).toFixed(1)}%</span>
            </div>
            <div class="result-item">
                <span class="result-label">Quality (Blur)</span>
                <span class="result-value">${results.blurScore.toFixed(2)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Brightness</span>
                <span class="result-value">${results.brightnessCategory}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Duplicate</span>
                <span class="result-value">${results.isDuplicate ? 'Yes ⚠️' : 'No ✅'}</span>
            </div>
        `;
        
        uploadBtn.textContent = 'Analyze Another';
        uploadBtn.disabled = false;
    } else if (status === 'FAILED') {
        showError('The processing failed. Please try a clearer image.');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Start Analysis';
    }
};
