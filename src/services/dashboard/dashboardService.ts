import privateClient from '../api/privateClient';
import type { UpdateProfileRequest, User } from '../../types/auth.types';

const dashboardService = {
  getProfile: async (): Promise<User> => {
    const response = await privateClient.get<{ user: User }>('/user');
    return response.data.user;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await privateClient.patch<{ user: User }>('/user', {
      user: data,
    });
    return response.data.user;
  },
};

export default dashboardService;
