// Aspettiamo che tutto l'HTML sia caricato prima di attivare il codice
document.addEventListener("DOMContentLoaded", function () {
	const meetingForm = document.getElementById("meetingForm");

	if (meetingForm) {
		meetingForm.addEventListener("submit", async function (e) {
			// Blocca il ricaricamento di default della pagina
			e.preventDefault();

			const status = document.getElementById("status");
			const btn = document.getElementById("deployBtn");
			btn.disabled = true;
			btn.innerText = "Creazione in corso...";
			status.style.color = "var(--gray-text)";
			status.innerText = "Upload verbale in corso (Step 1/2)...";

			// Creiamo un controller per sbloccare la fetch se il server si incanta (Timeout 10s)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			try {
				// 1️⃣ Upload PDF
				const file = document.getElementById("verbaleFile").files[0];
				const formData = new FormData();
				formData.append("verbale", file);

				const uploadRes = await fetch(
					"http://localhost:30000/api/v1/uploadVerbale",
					{
						method: "POST",
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

				// 2️⃣ Creazione dati riunione
				const meetingKey = "reunion_" + Date.now();

				const partecipantiRaw =
					document.getElementById("partecipanti").value;
				const partecipantiArray = partecipantiRaw
					.split(",")
					.map((p) => p.trim())
					.filter((p) => p !== "");

				const meetingData = {
					titolo: document.getElementById("titolo").value,
					partecipanti: partecipantiArray,
					dataInizio: document.getElementById("dataInizio").value,
					dataFine: document.getElementById("dataFine").value,
					verbale: filePath,
				};

				// 3️⃣ Salvataggio nel KV
				const addRes = await fetch(
					"http://localhost:30000/api/v1/addKv",
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						signal: controller.signal,
						body: JSON.stringify({
							class: "Reunion",
							key: meetingKey,
							value: JSON.stringify(meetingData),
						}),
					},
				);

				if (!addRes.ok) {
					const addData = await addRes.json().catch(() => ({}));
					throw new Error(
						addData.message ||
							`Errore HTTP durante il salvataggio: ${addRes.status}`,
					);
				}

				clearTimeout(timeoutId); // Disattiviamo il timer se è andato tutto bene

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

				// Gestione degli errori specifica
				if (err.name === "AbortError") {
					status.innerText =
						"Errore: Il server ci sta mettendo troppo tempo (Timeout). Il database blockchain potrebbe essere bloccato.";
				} else if (err.message.includes("Failed to fetch")) {
					status.innerText =
						"Errore: Impossibile contattare il server. Verifica che sia acceso e che non si sia riavviato (Nodemon).";
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

document.addEventListener("DOMContentLoaded", () => {
	const userString = localStorage.getItem("user");

	if (userString) {
		const user = JSON.parse(userString);

		// Popolamento Header
		document.getElementById("userNameHeader").innerText =
			user.nome + " " + user.cognome;
		document.getElementById("userInitials").innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();
	} else {
		window.location.href = "login.html";
	}
});

function handleLogout() {
	localStorage.clear();
	window.location.href = "login.html";
}
