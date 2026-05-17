import { handleUpload } from './upload.js';
import { pollStatus } from './status.js';
import * as api from './api.js';

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const statusCard = document.getElementById('status-card');
const resultsCard = document.getElementById('results-card');
const previewStrip = document.getElementById('file-preview-strip');
const imagePreview = document.getElementById('image-preview');
const fileNameDisplay = document.getElementById('file-name');
const fileSizeDisplay = document.getElementById('file-size');
const errorContainer = document.getElementById('error-container');

let selectedFile = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) window.lucide.createIcons();
    refreshDashboard();
});

async function refreshDashboard() {
    try {
        const [analyticsRes, recentRes, healthRes] = await Promise.all([
            api.getAnalytics(),
            api.getRecent(),
            api.getHealth()
        ]);
        
        if (analyticsRes.status === 'success') renderAnalytics(analyticsRes.data);
        if (recentRes.status === 'success') renderRecent(recentRes.data);
        if (healthRes.systems) updateHealthIndicators(healthRes.systems);
    } catch (err) {
        console.error('Failed to refresh dashboard:', err);
    }
}

function updateHealthIndicators(systems) {
    Object.entries(systems).forEach(([key, val]) => {
        const el = document.getElementById(`status-${key}`);
        if (el) {
            el.className = `status-indicator ${val === 'online' ? 'online' : 'offline'}`;
        }
    });
}

function renderAnalytics(data) {
    document.getElementById('stat-total').textContent = data.total;
    const successRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
    document.getElementById('stat-success').textContent = `${successRate}%`;
    document.getElementById('stat-confidence').textContent = `${Math.round(data.avgConfidence * 100)}%`;
}

function renderRecent(data) {
    const tbody = document.getElementById('recent-body');
    tbody.innerHTML = data.map(item => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:0.5rem">
                    <img src="${item.filePath.replace(/^.*uploads/, '/uploads')}" style="width:24px; height:24px; border-radius:4px; object-fit:cover;">
                    <span style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${item.originalName}</span>
                </div>
            </td>
            <td><span class="status-tag status-${item.status}">${item.status}</span></td>
            <td><span class="badge ${item.analysisResult?.overallVerdict || ''}">${item.analysisResult?.overallVerdict || '-'}</span></td>
            <td>${new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
        </tr>
    `).join('');
}

// Drag and Drop
dropZone.onclick = () => fileInput.click();

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.add('active');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
    }, false);
});

dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files[0]);
}, false);

fileInput.onchange = (e) => handleFiles(e.target.files[0]);

function handleFiles(file) {
    if (!file) return;
    selectedFile = file;
    
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewStrip.classList.remove('hidden');
        uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

uploadBtn.onclick = async () => {
    try {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Processing...';
        if (window.lucide) window.lucide.createIcons();
        errorContainer.classList.add('hidden');
        
        const id = await handleUpload(selectedFile);
        statusCard.classList.remove('hidden');
        resetTimeline();
        updateTimeline('step-uploaded', 'completed');
        updateTimeline('step-queued', 'active');
        
        pollStatus(id, updateStatusUI, showResults);
    } catch (err) {
        showError(err.message);
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i data-lucide="play"></i> Start Analysis';
        if (window.lucide) window.lucide.createIcons();
    }
};

function updateTimeline(stepId, state) {
    const step = document.getElementById(stepId);
    if (!step) return;
    step.classList.remove('active', 'completed');
    if (state) step.classList.add(state);
    
    const icon = step.querySelector('.step-icon');
    if (state === 'completed') {
        icon.innerHTML = '<i data-lucide="check"></i>';
    } else if (state === 'active') {
        icon.innerHTML = '<div class="spinner-small"></div>';
    }
    if (window.lucide) window.lucide.createIcons();
}

function resetTimeline() {
    ['step-uploaded', 'step-queued', 'step-processing', 'step-ocr', 'step-completed'].forEach(id => {
        const step = document.getElementById(id);
        step.classList.remove('active', 'completed');
        step.querySelector('.step-icon').innerHTML = '';
    });
}

export const updateStatusUI = (status) => {
    if (status === 'PROCESSING') {
        updateTimeline('step-queued', 'completed');
        updateTimeline('step-processing', 'active');
        // Simulate OCR step halfway through processing
        setTimeout(() => updateTimeline('step-ocr', 'active'), 2000);
    }
};

const showResults = async (id, status) => {
    if (status === 'COMPLETED') {
        updateTimeline('step-processing', 'completed');
        updateTimeline('step-ocr', 'completed');
        updateTimeline('step-completed', 'completed');
        
        const resData = await api.getResult(id);
        const results = resData.data;
        resultsCard.classList.remove('hidden');
        
        const verdictVal = document.getElementById('resVerdict');
        verdictVal.textContent = results.overallVerdict;
        verdictVal.className = `verdict-value ${results.overallVerdict}`;

        const grid = document.getElementById('results-grid');
        grid.innerHTML = `
            <div class="result-card">
                <span class="res-label">OCR Content</span>
                <span class="res-value">${results.ocrText || 'N/A'}</span>
            </div>
            <div class="result-card">
                <span class="res-label">OCR Confidence</span>
                <span class="res-value">${(results.ocrConfidence * 100).toFixed(1)}%</span>
            </div>
            <div class="result-card">
                <span class="res-label">Blur Score</span>
                <span class="res-value">${results.blurScore.toFixed(3)}</span>
            </div>
            <div class="result-card">
                <span class="res-label">Brightness</span>
                <span class="res-value">${results.brightnessCategory} (${Math.round(results.brightnessValue)})</span>
            </div>
            <div class="result-card">
                <span class="res-label">Pattern Match</span>
                <span class="res-value">${results.patternValid ? 'Verified' : 'Invalid'}</span>
            </div>
            <div class="result-card">
                <span class="res-label">Duplicate Check</span>
                <span class="res-value">${results.isDuplicate ? 'Match Found' : 'Unique'}</span>
            </div>
        `;
        
        uploadBtn.innerHTML = '<i data-lucide="refresh-cw"></i> New Analysis';
        uploadBtn.disabled = false;
        if (window.lucide) window.lucide.createIcons();
        refreshDashboard();
    } else if (status === 'FAILED') {
        showError('Analysis failed. The image might be corrupted or unsupported.');
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = '<i data-lucide="play"></i> Start Analysis';
        if (window.lucide) window.lucide.createIcons();
    }
};

function showError(msg) {
    errorContainer.textContent = msg;
    errorContainer.classList.remove('hidden');
}
