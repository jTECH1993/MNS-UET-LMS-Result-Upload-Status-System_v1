const API_BASE = '/api';

export const apiClient = {
  async get(path: string) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'API Error');
    }
    return res.json();
  },
  async post(path: string, body: any) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      const error: any = new Error(err.error || 'API Error');
      if (err.lockoutUntil) error.lockoutUntil = err.lockoutUntil;
      throw error;
    }
    return res.json();
  },
  async delete(path: string) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'API Error');
    }
    return res.json();
  }
};
