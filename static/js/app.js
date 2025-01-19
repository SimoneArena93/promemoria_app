const form = document.getElementById("addForm");
const list = document.getElementById("remindersList");
const filterDateInput = document.getElementById("filterDate");

// Funzione per cancellare tutti i promemoria
async function deleteAllReminders() {
    if (confirm("Sei sicuro di voler cancellare tutti i promemoria?")) {
        const res = await fetch("/api/reminders", { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            fetchReminders();
        } else {
            alert(`Errore: ${data.error}`);
        }
    }
}

// Funzione per cancellare tutti i task con lo stesso nome
async function deleteTasksByName(name) {
    const encodedName = encodeURIComponent(name); // Codifica l'apostrofo e altri caratteri speciali
    console.log(`Nome originale: ${name}`);
    console.log(`Nome codificato: ${encodedName}`);
    if (confirm(`Sei sicuro di voler cancellare tutti i task con nome '${name}'?`)) {
        const res = await fetch(`/api/reminders/name/${encodedName}`, { method: "DELETE" });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            fetchReminders();
        } else {
            alert(`Errore: ${data.error}`);
        }
    }
}



// Funzione per cancellare un task specifico
async function deleteReminder(id) {
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
        alert(data.message);
        fetchReminders();
    } else {
        alert(`Errore: ${data.error}`);
    }
}

// Funzione per recuperare tutti i promemoria, con filtro opzionale per data
async function fetchReminders(filterDate = null) {
    const url = filterDate ? `/api/reminders?date=${filterDate}` : "/api/reminders";
    const res = await fetch(url);
    const reminders = await res.json();
    list.innerHTML = ""; // Pulisce la lista prima di aggiungere nuovi elementi

    reminders.forEach((reminder) => {
        const li = document.createElement("li");
        const priorityColor = getPriorityColor(reminder.priority);
        const dayOfWeek = reminder.due_date
            ? new Date(reminder.due_date).toLocaleDateString("it-IT", { weekday: "long" })
            : "Senza data";

        // Formatta il testo con la prima lettera maiuscola
        const formattedText = reminder.text.charAt(0).toUpperCase() + reminder.text.slice(1);

        li.style.borderLeft = `5px solid ${priorityColor}`;
        li.innerHTML = `
        <div class="note">
            <p><strong>${formattedText}</strong></p>
            <p>
                ${
                    reminder.date_type === "entro-giorno"
                        ? `Scadenza: ${reminder.due_date || "Nessuna"} (${dayOfWeek})`
                        : `Data esatta: ${reminder.due_date || "Nessuna"} (${dayOfWeek})`
                }
            </p>
            ${reminder.time ? `<p>Ora: ${reminder.time}</p>` : ""}
            ${reminder.recurrence !== "nessuna" ? `<p>Ricorrenza: ${reminder.recurrence}</p>` : ""}
            <p>Priorità: <span style="color: ${priorityColor}">${reminder.priority}</span></p>
            ${reminder.recurrence !== "nessuna" 
                ? `<button onclick="deleteTasksByName('${reminder.text.replace(/'/g, "\\'")}')">Elimina Tutti</button>` 
                : ""}
            <button onclick="deleteReminder(${reminder.id})">Elimina</button>
        </div>
        `;

        list.appendChild(li);
    });
}



// Funzione per aggiungere un nuovo promemoria
form.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evita il refresh della pagina
    const text = document.getElementById("text").value;
    const dueDate = document.getElementById("dueDate").value || null; // Data opzionale
    const time = document.getElementById("time").value || null; // Ora opzionale
    const dateType = document.getElementById("dateType").value;
    const priority = document.getElementById("priority").value;
    const recurrence = document.getElementById("recurrence").value;

    const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, due_date: dueDate, time, date_type: dateType, priority, recurrence }),
    });
    const data = await res.json();
    if (res.ok) {
        alert(data.message);
        fetchReminders();
    } else {
        alert(`Errore: ${data.error}`);
    }

    form.reset(); // Resetta il modulo
});

// Funzione per filtrare i promemoria per data
function filterReminders() {
    const filterDate = filterDateInput.value;
    fetchReminders(filterDate);
}

// Funzione per ottenere il colore in base alla priorità
function getPriorityColor(priority) {
    switch (priority) {
        case "Alta":
            return "red";
        case "Media":
            return "orange";
        case "Bassa":
            return "green";
        default:
            return "gray";
    }
}

async function filterRemindersByDate() {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    // Controlla che entrambe le date siano fornite
    if (!startDate || !endDate) {
        alert("Inserisci entrambe le date per filtrare.");
        return;
    }

    // Costruisci l'URL con i parametri
    const url = `/api/reminders?start_date=${startDate}&end_date=${endDate}`;
    console.log(`Eseguendo richiesta a: ${url}`); // Log per debug

    // Fai la richiesta al backend
    const res = await fetch(url);
    const reminders = await res.json();

    // Aggiorna la lista dei promemoria
    list.innerHTML = ""; // Pulisce la lista prima di aggiungere nuovi elementi
    reminders.forEach((reminder) => {
        const li = document.createElement("li");
        const priorityColor = getPriorityColor(reminder.priority);
        const dayOfWeek = reminder.due_date
            ? new Date(reminder.due_date).toLocaleDateString("it-IT", { weekday: "long" })
            : "Senza data";

        const formattedText = reminder.text.charAt(0).toUpperCase() + reminder.text.slice(1);

        li.style.borderLeft = `5px solid ${priorityColor}`;
        li.innerHTML = `
            <div class="note">
                <p><strong>${formattedText}</strong></p>
                <p>Scadenza: ${reminder.due_date || "Nessuna"} (${dayOfWeek})</p>
                ${reminder.time ? `<p>Ora: ${reminder.time}</p>` : ""}
                ${reminder.recurrence !== "nessuna" ? `<p>Ricorrenza: ${reminder.recurrence}</p>` : ""}
                <p>Priorità: <span style="color: ${priorityColor}">${reminder.priority}</span></p>
                <button onclick="deleteReminder(${reminder.id})">Elimina</button>
            </div>
        `;
        list.appendChild(li);
    });
}


// Carica i promemoria al caricamento della pagina
fetchReminders();