document.addEventListener("DOMContentLoaded", () => {
	// 1. Validazione sessione e ruolo (Identica a manage_users.js)
	const userString = localStorage.getItem("user");
	const token = localStorage.getItem("token");

	if (!userString || !token) {
		window.location.href = "login.html";
		return;
	}

	const user = JSON.parse(userString);
	const userRole = String(user.classe || user.ruolo || "")
		.toUpperCase()
		.trim();

	const isCEO =
		userRole === "CEO" ||
		userRole.includes("ADMIN") ||
		userRole.includes("AMMINISTRATORE");

	if (!isCEO) {
		alert("Accesso negato: Solo il CEO può aggiungere utenti.");
		window.location.href = "member_dashboard.html";
		return;
	}

	// Popolamento Header
	document.getElementById("userNameHeader").innerText =
		`${user.nome} ${user.cognome}`;
	document.getElementById("userInitials").innerText = (
		user.nome[0] + user.cognome[0]
	).toUpperCase();

	// 2. Gestione Submit Form
	const form = document.getElementById("addUserForm");
	const statusDiv = document.getElementById("status");
	const submitBtn = document.getElementById("deployUserBtn");

	form.addEventListener("submit", async (e) => {
		e.preventDefault();

		// Raccogliamo i dati
		const newUser = {
			nome: document.getElementById("nome").value.trim(),
			cognome: document.getElementById("cognome").value.trim(),
			email: document.getElementById("email").value.trim().toLowerCase(),
			id_wallet: document.getElementById("id_wallet").value.trim(),
			quota: parseFloat(document.getElementById("quota").value),
			classe: document.getElementById("classe").value,
			psw: document.getElementById("psw").value, // Inviata in chiaro
		};

		// UI feedback
		submitBtn.innerText = "Registrazione in corso...";
		submitBtn.disabled = true;
		statusDiv.style.display = "block";
		statusDiv.style.backgroundColor = "#e2e3e5";
		statusDiv.style.color = "#383d41";
		statusDiv.innerText = "Salvataggio sulla Blockchain...";

		try {
			const response = await fetch(
				"http://localhost:30000/api/v1/addUser",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${token}`,
					},
					body: JSON.stringify(newUser),
				},
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || "Errore sconosciuto");
			}

			// Successo
			statusDiv.style.backgroundColor = "#d4edda";
			statusDiv.style.color = "#155724";
			statusDiv.innerText = "✅ Utente registrato con successo!";
			form.reset();

			// Torna alla lista utenti dopo 2 secondi
			setTimeout(() => {
				window.location.href = "manage_user.html";
			}, 2000);
		} catch (error) {
			console.error("Errore aggiunta utente:", error);
			statusDiv.style.backgroundColor = "#f8d7da";
			statusDiv.style.color = "#721c24";
			statusDiv.innerText = "❌ Errore: " + error.message;
			submitBtn.innerText = "Riprova Registrazione";
			submitBtn.disabled = false;
		}
	});
});
