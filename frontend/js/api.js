const API_BASE_URL = "https://examhub-cytw.onrender.com/api";

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("examhub_token");

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    let data;

    try {
        data = await response.json();
    } catch {
        data = {
            success: false,
            message: "The server returned an invalid response."
        };
    }

    if (!response.ok) {
        const error = new Error(
            data.message || "Something went wrong."
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}


/* GET */
async function apiGet(endpoint) {
    return apiRequest(endpoint, {
        method: "GET"
    });
}


/* POST */
async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
    });
}


/* PATCH */
async function apiPatch(endpoint, body) {
    return apiRequest(endpoint, {
        method: "PATCH",
        body: JSON.stringify(body)
    });
}


/* DELETE */
async function apiDelete(endpoint) {
    return apiRequest(endpoint, {
        method: "DELETE"
    });
}