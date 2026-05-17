import * as api from './api.js';

export const pollStatus = async (id, onUpdate, onComplete) => {
    const interval = setInterval(async () => {
        const data = await api.getStatus(id);
        const status = data.data.status;
        onUpdate(status);
        if (status === 'COMPLETED' || status === 'FAILED') {
            clearInterval(interval);
            onComplete(id, status);
        }
    }, 2000);
};
