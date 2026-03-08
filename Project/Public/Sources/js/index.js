document
	.getElementById("loginBtn")
	.addEventListener("click", async function (e) {
		const token = localStorage.getItem("token");
		const userDataString = localStorage.getItem("user");

		// Se mancano i dati nel localStorage, non facciamo nulla.
		// Il browser seguirà il link verso "./login.html" naturalmente.
		if (!token || !userDataString) return;

		// Se abbiamo i dati, FERMIAMO il link e interroghiamo il server
		e.preventDefault();

		try {
			// FIX: Dobbiamo prima convertire la stringa in oggetto!
			const user = JSON.parse(userDataString);

			const response = await fetch(
				"http://localhost:30000/api/v1/loginCheck",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id_wallet: user.id_wallet,
						token: token,
					}),
				},
			);

			// FIX: Controlliamo se il server ha detto che il token è valido (status 200)
			if (response.ok) {
				const ruolo = user.classe.toLowerCase();
				if (ruolo === "ceo") {
					window.location.href = "ceo_dashboard.html";
				} else {
					window.location.href = "member_dashboard.html";
				}
			} else {
				// Il server ha rifiutato il token (scaduto o errato)
				console.warn("Token non valido. Pulizia sessione...");
				localStorage.clear();
				window.location.href = "./login.html";
			}
		} catch (error) {
			console.error("Errore durante la verifica:", error);
			localStorage.clear();
			window.location.href = "./login.html";
		}
	});
