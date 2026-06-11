const API_KEY = "AIzaSyBp9LPzM04VrmFoHM9qwEKRmjdGuLtTurk";

async function checkModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    console.log("Fetching models from:", url);

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", data.error);
        } else if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
        } else {
            console.log("No models returned. Response:", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

checkModels();
