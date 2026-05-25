document.addEventListener("DOMContentLoaded", () => {
	const loginBtn = document.getElementById("loginBtn");

	if (loginBtn) {
		loginBtn.addEventListener("click", async function (e) {
			e.preventDefault();

			const userDataString = localStorage.getItem("user");

			// Controlliamo solo i dati utente, il token è nel cookie e invisibile a JS
			if (!userDataString) {
				window.location.href = "./login.html";
				return;
			}

			try {
				const originalText = loginBtn.innerText;
				loginBtn.innerText = "Accesso in corso...";

				const user = JSON.parse(userDataString);

				const response = await fetch("/api/v1/loginCheck", {
					method: "POST",
					credentials: "include", // Invia il cookie al server
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_wallet: user.id_wallet,
					}),
				});

				if (response.ok) {
					const ruolo = user.classe.toLowerCase();
					window.location.href =
						ruolo === "ceo"
							? "ceo_dashboard.html"
							: "member_dashboard.html";
				} else {
					console.warn("Sessione non valida. Pulizia...");
					localStorage.clear();
					window.location.href = "./login.html";
				}
			} catch (error) {
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
