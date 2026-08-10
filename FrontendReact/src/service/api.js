import axios from "axios";

const api = axios.create({
    baseURL: "/api",
    timeout: 45000
});

export default api;
