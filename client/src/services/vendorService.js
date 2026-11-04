import axios from "axios";
import { API_BASE_URL } from "../config";

const API_URL = `${API_BASE_URL}/vendors`;

export const getVendorById = async (id) => {

    const response = await axios.get(

        `${API_URL}/${id}`

    );

    return response.data;

};