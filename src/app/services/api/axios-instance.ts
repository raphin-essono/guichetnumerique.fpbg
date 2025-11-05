import axios from 'axios';
import { environment } from '../../../environments/environment';

const instance = axios.create({
  baseURL: environment.urlServer,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default instance;
