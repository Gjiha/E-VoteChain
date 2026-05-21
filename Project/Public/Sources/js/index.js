// Aspettiamo che tutto l'HTML sia caricato prima di cercare il bottone
document.addEventListener("DOMContentLoaded", () => {
	const loginBtn = document.getElementById("loginBtn");

	// Controlliamo che il bottone esista davvero nella pagina
	if (loginBtn) {
		loginBtn.addEventListener("click", async function (e) {
			// 1. Fermiamo IMMEDIATAMENTE il link (evita che il browser vada su login.html da solo)
			e.preventDefault();

			const token = localStorage.getItem("token");
			const userDataString = localStorage.getItem("user");

			// 2. Se l'utente non ha un token, lo mandiamo noi alla pagina di login manuale
			if (!token || !userDataString) {
				window.location.href = "./login.html";
				return;
			}

			// 3. Se invece ha il token, interroghiamo il server
			try {
				// (Opzionale) Cambiamo il testo del bottone per far capire all'utente che sta caricando
				const originalText = loginBtn.innerText;
				loginBtn.innerText = "Accesso in corso...";

				const user = JSON.parse(userDataString);

				const response = await fetch(
					"http://10.172.10.74:30000/api/v1/loginCheck",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${token}`,
						},
						body: JSON.stringify({
							id_wallet: user.id_wallet,
						}),
					},
				);

				if (response.ok) {
					// Token valido: mandiamo l'utente alla dashboard corretta
					const ruolo = user.classe.toLowerCase();
					window.location.href =
						ruolo === "ceo"
							? "ceo_dashboard.html"
							: "member_dashboard.html";
				} else {
					// Token scaduto/non valido: puliamo il localStorage e andiamo al login
					console.warn("Token non valido. Pulizia sessione...");
					localStorage.clear();
					window.location.href = "./login.html";
				}
			} catch (error) {
				// Se il server è spento o c'è un errore di rete
				console.error("Errore durante la verifica:", error);
				localStorage.clear();
				window.location.href = "./login.html";
			}
		});
	} else {
		console.error(
			"Errore: Impossibile trovare il bottone con ID 'loginBtn' nell'HTML.",
		);
	}
});
