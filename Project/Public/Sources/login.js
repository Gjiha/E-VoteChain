function handleLogin(e) {
	e.preventDefault();

	//QUI BISOGNA RICHIAMARE LE API DI ARCIERI

	const walletInput = document.getElementById("walletId").value.toLowerCase();
	const btn = document.getElementById("submitBtn");
	const btnText = document.getElementById("btnText");
	const msg = document.getElementById("login-message");

	// Reset UI
	msg.classList.remove("error-msg");
	btn.disabled = true;
	btnText.innerText = "Verifica Blockchain in corso...";

	// Simulazione Log
	msg.innerText = "> Hashing SHA-256...";

	setTimeout(() => {
		msg.innerText = "> Verifica Smart Contract...";
	}, 1000);

	setTimeout(() => {
		// LOGICA DI REINDIRIZZAMENTO
		if (walletInput.includes("admin")) {
			msg.innerText = "> Ruolo identificato: CEO/ADMIN";
			window.location.href = "ceo_dashboard.html"; // Assicurati di salvare la pagina CEO con questo nome
		} else if (
			walletInput.includes("member") ||
			walletInput.includes("socio")
		) {
			msg.innerText = "> Ruolo identificato: SOCIO/MEMBRO";
			window.location.href = "member_dashboard.html"; // Link alla nuova pagina membro
		} else {
			msg.innerText =
				"> Errore: Credenziali non riconosciute nel Ledger.";
			msg.classList.add("error-msg");
			btn.disabled = false;
			btnText.innerText = "Accedi";
		}
	}, 2500);
}
