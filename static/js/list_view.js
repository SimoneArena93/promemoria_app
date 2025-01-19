async function fetchGroupedReminders() {
    try {
        const res = await fetch("/api/reminders/grouped");
        const groupedReminders = await res.json();
        console.log("Dati giornalieri ricevuti:", groupedReminders); // Log per debug

        const list = document.getElementById("groupedRemindersList");
        list.innerHTML = ""; // Pulisce la lista prima di aggiungere nuovi elementi

        groupedReminders.forEach((group) => {
            const li = document.createElement("li");
            li.className = "grouped-reminder";
            li.innerHTML = `
                <h3>${formatDate(group.due_date)}</h3>
                <ul>
                    ${group.reminders
                        .map(task => `<li>${task}</li>`)
                        .join("")}
                </ul>
            `;
            list.appendChild(li);
        });
    } catch (error) {
        console.error("Errore durante il caricamento dei promemoria giornalieri:", error);
    }
}

// Funzione per formattare la data
function formatDate(dateString) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("it-IT", options);
}

// Carica i promemoria giornalieri al caricamento della pagina
fetchGroupedReminders();
