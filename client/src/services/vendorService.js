import axios from "axios";

const API_URL =
    "http://localhost:5000/api/vendors";

export const getVendorById = async (id) => {

    const response = await axios.get(

        `${API_URL}/${id}`

    );

    return response.data;

};