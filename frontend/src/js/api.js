const BASE_URL = '/api';

export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: formData });
    return res.json();
};

export const getStatus = async (id) => {
    const res = await fetch(`${BASE_URL}/upload/${id}`);
    return res.json();
};

export const getResult = async (id) => {
    const res = await fetch(`${BASE_URL}/result/${id}`);
    return res.json();
};

export const getAnalytics = async () => {
    const res = await fetch(`${BASE_URL}/result/analytics`);
    return res.json();
};

export const getRecent = async () => {
    const res = await fetch(`${BASE_URL}/result/recent`);
    return res.json();
};

export const getHealth = async () => {
    const res = await fetch(`/health`);
    return res.json();
};
