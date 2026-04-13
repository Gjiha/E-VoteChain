document.addEventListener("DOMContentLoaded", function () {
	// 1. INIZIALIZZAZIONE E RECUPERO TOKEN
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token");

	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);

	// Popolamento Header
	const userNameHeader = document.getElementById("userNameHeader");
	const userInitials = document.getElementById("userInitials");
	if (userNameHeader)
		userNameHeader.innerText = user.nome + " " + user.cognome;
	if (userInitials)
		userInitials.innerText = (user.nome[0] + user.cognome[0]).toUpperCase();

	// 2. LOGICA DEL FORM DI CREAZIONE
	const meetingForm = document.getElementById("meetingForm");

	if (meetingForm) {
		meetingForm.addEventListener("submit", async function (e) {
			e.preventDefault();

			const status = document.getElementById("status");
			const btn = document.getElementById("deployBtn");
			btn.disabled = true;
			btn.innerText = "Creazione in corso...";
			status.style.color = "var(--gray-text)";
			status.innerText = "Upload verbale su Blockchain (Step 1/2)...";

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 15000);

			try {
				// Creazione della chiave univoca che servirà da ID Riunione e Chiave Blockchain
				const meetingKey = "reunion_" + Date.now();

				// Preparazione FormData per l'upload
				const fileInput = document.getElementById("verbaleFile");
				if (!fileInput.files.length)
					throw new Error("Seleziona un file PDF.");

				const file = fileInput.files[0];
				if (file.type !== "application/pdf") {
					throw new Error(
						"Formato non valido. Seleziona esclusivamente un file .pdf.",
					);
				}

				const maxSizeInBytes = 50 * 1024 * 1024; // 50 MegaBytes
				if (file.size > maxSizeInBytes) {
					throw new Error(
						"Il file è troppo grande. La dimensione massima consentita è di 50MB.",
					);
				}

				const formData = new FormData();
				formData.append("verbale", file); // Il file PDF
				formData.append("meetingId", meetingKey); // L'ID usato come chiave su Blockchain

				// Step 1: Upload e salvataggio su Blockchain
				const uploadRes = await fetch(
					"http://localhost:30000/api/v1/uploadVerbale",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
							// Nota: Non impostare Content-Type con FormData, lo fa il browser
						},
						body: formData,
						signal: controller.signal,
					},
				);

				if (!uploadRes.ok) {
					const uploadData = await uploadRes.json().catch(() => ({}));
					throw new Error(
						uploadData.message ||
							`Errore durante l'upload: ${uploadRes.status}`,
					);
				}

				status.innerText = "Salvataggio dati riunione (Step 2/2)...";

				// Preparazione Dati riunione
				const partecipantiRaw =
					document.getElementById("partecipanti").value;
				const partecipantiArray = partecipantiRaw
					.split(",")
					.map((p) => p.trim())
					.filter((p) => p !== "");

				// Rimosso il campo 'verbale' (filePath) come richiesto
				const meetingData = {
					titolo: document.getElementById("titolo").value,
					numeroVotazioni: parseInt(
						document.getElementById("numeroVotazioni").value,
						10,
					),
					partecipanti: partecipantiArray,
					dataInizio: document.getElementById("dataInizio").value,
					dataFine: document.getElementById("dataFine").value,
				};

				// Step 2: Creazione record riunione
				const addRes = await fetch(
					"http://localhost:30000/api/v1/create-meeting",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						signal: controller.signal,
						body: JSON.stringify({
							meetingKey: meetingKey,
							meetingData: meetingData,
						}),
					},
				);

				if (addRes.status === 401 || addRes.status === 403) {
					throw new Error(
						"Accesso Negato: Solo l'amministratore può creare riunioni.",
					);
				}

				if (!addRes.ok) {
					const addData = await addRes.json().catch(() => ({}));
					throw new Error(
						addData.message ||
							`Errore durante il salvataggio: ${addRes.status}`,
					);
				}

				clearTimeout(timeoutId);

				// --- SUCCESSO ---
				status.style.color = "#2e7d32";
				status.innerText = "Riunione e Verbale creati con successo!";
				btn.innerText = "Completato ✔";
				btn.style.background = "#2e7d32";

				setTimeout(() => {
					window.location.href = "ceo_dashboard.html";
				}, 1500);
			} catch (err) {
				clearTimeout(timeoutId);
				console.error("Errore di creazione:", err);
				status.style.color = "red";

				if (err.name === "AbortError") {
					status.innerText = "Errore: Timeout del server.";
				} else {
					status.innerText = "Errore: " + err.message;
				}

				btn.disabled = false;
				btn.innerText = "Riprova Creazione";
				btn.style.background = "var(--tv-green)";
			}
		});
	}
});

function handleLogout() {
	localStorage.clear();
	window.location.href = "login.html";
}
