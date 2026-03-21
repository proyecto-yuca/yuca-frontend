import privateClient from '../api/privateClient';
import type { User } from '../../types/auth.types';

const dashboardService = {
  getProfile: async (): Promise<User> => {
    const response = await privateClient.get<User>('/users/me');
    return response.data;
  },
};

export default dashboardService;
