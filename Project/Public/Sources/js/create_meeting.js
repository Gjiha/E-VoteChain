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
			status.innerText = "Upload verbale in corso (Step 1/2)...";

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			try {
				// Creazione della chiave univoca
				const meetingKey = "reunion_" + Date.now();

				// Upload PDF
				const file = document.getElementById("verbaleFile").files[0];
				const fileExtension = file.name.split(".").pop();

				const formData = new FormData();
				formData.append(
					"verbale",
					file,
					`${meetingKey}.${fileExtension}`,
				);

				// Consigliato: Inviare il token anche per l'upload del file (se hai protetto la rotta)
				const uploadRes = await fetch(
					"http://localhost:30000/api/v1/uploadVerbale",
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${token}`,
						},
						body: formData,
						signal: controller.signal,
					},
				);

				if (!uploadRes.ok) {
					const uploadData = await uploadRes.json().catch(() => ({}));
					throw new Error(
						uploadData.message ||
							`Errore HTTP durante l'upload: ${uploadRes.status}`,
					);
				}

				const uploadData = await uploadRes.json();
				const filePath = uploadData.path;

				status.innerText =
					"Salvataggio dati riunione nel database (Step 2/2)...";

				// Preparazione Dati riunione
				const partecipantiRaw =
					document.getElementById("partecipanti").value;
				const partecipantiArray = partecipantiRaw
					.split(",")
					.map((p) => p.trim())
					.filter((p) => p !== "");

				const meetingData = {
					titolo: document.getElementById("titolo").value,
					numeroVotazioni: parseInt(
						document.getElementById("numeroVotazioni").value,
						10,
					),
					partecipanti: partecipantiArray,
					dataInizio: document.getElementById("dataInizio").value,
					dataFine: document.getElementById("dataFine").value,
					verbale: filePath,
				};

				// --- MODIFICA CRUCIALE: Chiamata alla nuova rotta protetta ---
				const addRes = await fetch(
					"http://localhost:30000/api/v1/create-meeting",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`, // <--- VERIFICA CHI SEI
						},
						signal: controller.signal,
						body: JSON.stringify({
							meetingKey: meetingKey,
							meetingData: meetingData,
						}),
					},
				);

				// Gestione specifica degli errori di permessi (401/403)
				if (addRes.status === 401 || addRes.status === 403) {
					throw new Error(
						"Accesso Negato: Solo l'amministratore (CEO) può creare nuove riunioni.",
					);
				}

				if (!addRes.ok) {
					const addData = await addRes.json().catch(() => ({}));
					throw new Error(
						addData.message ||
							`Errore HTTP durante il salvataggio: ${addRes.status}`,
					);
				}

				clearTimeout(timeoutId);

				// --- SUCCESSO ---
				status.style.color = "#2e7d32";
				status.innerText =
					"Riunione creata con successo! Reindirizzamento...";
				btn.innerText = "Completato ✔";
				btn.style.background = "#2e7d32";

				window.location.href = "ceo_dashboard.html";
			} catch (err) {
				clearTimeout(timeoutId);
				console.error("Errore di creazione:", err);
				status.style.color = "red";

				if (err.name === "AbortError") {
					status.innerText =
						"Errore: Il server ci sta mettendo troppo tempo (Timeout). Il database potrebbe essere bloccato.";
				} else if (err.message.includes("Failed to fetch")) {
					status.innerText =
						"Errore: Impossibile contattare il server. Verifica che sia acceso.";
				} else {
					status.innerText = "Errore: " + err.message;
				}

				btn.disabled = false;
				btn.innerText = "Riprova Creazione";
				btn.style.background = "var(--tv-green)";
			}
		});
	} else {
		console.error("Errore: Form 'meetingForm' non trovato nella pagina!");
	}
});

function handleLogout() {
	localStorage.clear();
	window.location.href = "login.html";
}
