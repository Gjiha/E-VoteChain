let globalUsers = []; // Variabile globale per memorizzare gli utenti scaricati

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inizializziamo il profilo utente e il TOKEN
    const userString = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!userString || !token) {
        window.location.href = "login.html";
        return;
    }

    const user = JSON.parse(userString);
    const userRole = String(user.classe || user.ruolo || "").toUpperCase().trim();

    // 2. Controllo Lato Client
    const isCEO = userRole === "CEO" || userRole.includes("ADMIN") || userRole.includes("AMMINISTRATORE");

    if (!isCEO) {
        alert("Accesso negato: Solo il CEO può visualizzare questa pagina.");
        window.location.href = "member_dashboard.html";
        return;
    }

    // Popolamento Header
    const userNameEl = document.getElementById("userNameHeader");
    const userInitialsEl = document.getElementById("userInitials");
    if (userNameEl) userNameEl.innerText = `${user.nome} ${user.cognome}`;
    if (userInitialsEl) userInitialsEl.innerText = (user.nome[0] + user.cognome[0]).toUpperCase();

    // Event Listener per l'ordinamento
    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            sortUsers(e.target.value);
        });
    }

    // 3. Avvia il recupero degli utenti
    fetchAllUsers(token);
});

async function fetchAllUsers(token) {
    const SERVER_URL = "http://localhost:30000";

    try {
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
        
        // Salviamo i dati nella variabile globale
        globalUsers = responseJson.data || [];

        // Eseguiamo un ordinamento iniziale di default (es. per cognome)
        sortUsers("cognome");

    } catch (error) {
        console.error("Errore durante il caricamento degli utenti:", error);
        document.getElementById("usersTableBody").innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">Impossibile connettersi al database utenti.</td></tr>`;
        document.getElementById("totalUsersCount").innerText = "Errore";
    }
}

// Funzione dedicata per ordinare l'array
function sortUsers(criteria) {
    globalUsers.sort((a, b) => {
        
        // --- NUOVO: Gestione numerica specifica per il Wallet ID ---
        if (criteria === 'wallet') {
            // Convertiamo in intero. Se vuoto o non valido, assegniamo 0 di default
            const numA = parseInt(a.id_wallet, 10) || 0;
            const numB = parseInt(b.id_wallet, 10) || 0;
            
            return numA - numB; // Ordinamento numerico crescente
        }

        // --- Ordinamento alfabetico per tutti gli altri campi ---
        let valA = "", valB = "";
        
        switch(criteria) {
            case 'nome':
                valA = (a.nome || "").toLowerCase();
                valB = (b.nome || "").toLowerCase();
                break;
            case 'cognome':
                valA = (a.cognome || "").toLowerCase();
                valB = (b.cognome || "").toLowerCase();
                break;
            case 'email':
                valA = (a.email || "").toLowerCase();
                valB = (b.email || "").toLowerCase();
                break;
            case 'ruolo':
                valA = String(a.classe || a.ruolo || "").toLowerCase();
                valB = String(b.classe || b.ruolo || "").toLowerCase();
                break;
        }
        
        return valA.localeCompare(valB);
    });

    // Dopo aver ordinato l'array, ridisegniamo la tabella
    renderTable(globalUsers);
}
// Funzione dedicata al rendering della tabella
function renderTable(users) {
    const tableBody = document.getElementById("usersTableBody");
    const countBadge = document.getElementById("totalUsersCount");
    
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

        const ruoloRaw = String(u.classe || u.ruolo || "MEMBRO").toUpperCase();
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
}