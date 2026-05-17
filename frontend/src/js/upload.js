import * as api from './api.js';
import { updateStatusUI } from './ui.js';

export const handleUpload = async (file) => {
    const data = await api.uploadImage(file);
    if (data.status === 'success') {
        return data.data.id;
    }
    throw new Error(data.message);
};
