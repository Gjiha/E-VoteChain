document.addEventListener("DOMContentLoaded", () => {
	// 1. Inizializziamo il profilo utente e il TOKEN
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

	// 2. Controllo Lato Client (Il backend farà comunque il suo)
	const isCEO =
		userRole === "CEO" ||
		userRole.includes("ADMIN") ||
		userRole.includes("AMMINISTRATORE");

	if (!isCEO) {
		alert("Accesso negato: Solo il CEO può visualizzare questa pagina.");
		window.location.href = "member_dashboard.html";
		return;
	}

	// Popolamento Header
	const userNameEl = document.getElementById("userNameHeader");
	const userInitialsEl = document.getElementById("userInitials");
	if (userNameEl) userNameEl.innerText = `${user.nome} ${user.cognome}`;
	if (userInitialsEl)
		userInitialsEl.innerText = (
			user.nome[0] + user.cognome[0]
		).toUpperCase();

	// 3. Avvia il recupero degli utenti
	fetchAllUsers(token);
});

async function fetchAllUsers(token) {
	const tableBody = document.getElementById("usersTableBody");
	const countBadge = document.getElementById("totalUsersCount");
	const SERVER_URL = "http://localhost:30000";

	try {
		// Chiamata alla rotta protetta dal doppio middleware (verifyToken + isCeoOrAdmin)
		const response = await fetch(`${SERVER_URL}/api/v1/all-users`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (response.status === 401 || response.status === 403) {
			alert("Sessione scaduta o permessi insufficienti.");
			window.location.href = "login.html";
			return;
		}

		if (!response.ok) {
			throw new Error(`Errore recupero dati: ${response.status}`);
		}

		const responseJson = await response.json();
		let users = responseJson.data || [];

		// Ordiniamo alfabeticamente per cognome
		users.sort((a, b) => (a.cognome || "").localeCompare(b.cognome || ""));

		countBadge.innerText = `${users.length} Utenti Registrati`;
		tableBody.innerHTML = "";

		if (users.length === 0) {
			tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nessun utente trovato nel sistema.</td></tr>`;
			return;
		}

		users.forEach((u) => {
			const nomeCompleto = `${u.nome || "N/A"} ${u.cognome || ""}`;
			const email = u.email || "Nessuna email";
			const wallet = u.id_wallet || "Sconosciuto";

			// Gestione Badge Ruolo
			const ruoloRaw = String(
				u.classe || u.ruolo || "MEMBRO",
			).toUpperCase();
			let roleClass = "role-member";
			if (ruoloRaw.includes("CEO")) roleClass = "role-ceo";
			else if (ruoloRaw.includes("ADMIN")) roleClass = "role-admin";

			const tr = document.createElement("tr");

			tr.innerHTML = `
                <td style="font-weight: 500;">${nomeCompleto}</td>
                <td>${email}</td>
                <td><span class="wallet-id">${wallet}</span></td>
                <td><span class="role-badge ${roleClass}">${ruoloRaw}</span></td>
                <td><span style="color: var(--tv-green); font-weight:bold;">Attivo</span></td>
            `;

			tableBody.appendChild(tr);
		});
	} catch (error) {
		console.error("Errore durante il caricamento degli utenti:", error);
		tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Impossibile connettersi al database utenti.</td></tr>`;
		countBadge.innerText = "Errore";
	}
}
