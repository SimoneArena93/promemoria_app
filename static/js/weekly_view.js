let currentStartDate = null;

async function fetchWeeklyReminders(action = null) {
    try {
        let startDate = currentStartDate;

        // Calcola la nuova data di inizio della settimana
        if (action === "previous") {
            startDate = adjustDate(startDate, -7);
        } else if (action === "next") {
            startDate = adjustDate(startDate, 7);
        }

        const url = startDate
            ? `/api/reminders/week?start_date=${startDate}`
            : "/api/reminders/week";

        const res = await fetch(url);
        const weeklyData = await res.json();

        console.log("Dati ricevuti dal backend:", weeklyData);

        // Aggiorna la data corrente
        currentStartDate = weeklyData.start_of_week;

        // Aggiorna il range della settimana
        const weekRange = document.getElementById("weekRange");
        weekRange.textContent = `Settimana: ${formatDate(weeklyData.start_of_week)} - ${formatDate(weeklyData.end_of_week)}`;

        // Pulisci e aggiorna la vista settimanale
        const weeklyView = document.getElementById("weeklyView");
        weeklyView.innerHTML = "";

        if (weeklyData && weeklyData.reminders) {
            Object.keys(weeklyData.reminders).forEach((day) => {
                const dayDiv = document.createElement("div");
                dayDiv.className = "day";

                const tasks = weeklyData.reminders[day];
                dayDiv.innerHTML = `
                    <h3>${formatDate(day)}</h3>
                    <ul>
                        ${tasks.length > 0
                            ? tasks.map(task => {
                                // Trasforma la prima lettera della descrizione in maiuscolo
                                const taskText = task.text.charAt(0).toUpperCase() + task.text.slice(1);
                            
                                return `
                                    <li class="priority-${task.priority.toLowerCase()} task" data-task-id="${task.id}">
                                        ${taskText} ${task.time ? `(${task.time})` : ""}
                                        <span class="priority-label">${task.priority}</span>
                                        <button class="delete-button">Elimina</button>
                                    </li>
                                `;
                            }).join("")                            
                            : "<li>Nessun task</li>"}
                    </ul>
                `;
                weeklyView.appendChild(dayDiv);
            });

            // Aggiungi event listener per i pulsanti "Elimina"
            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', (event) => {
                    const taskElement = event.target.closest('.task');
                    const taskId = taskElement.getAttribute('data-task-id');

                    if (taskId) {
                        fetch(`/api/reminders/${taskId}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })
                        .then(response => {
                            if (response.ok) {
                                return response.json();
                            } else {
                                throw new Error(`Errore HTTP: ${response.status}`);
                            }
                        })
                        .then(data => {
                            if (data.message) {
                                console.log(data.message);
                                taskElement.remove(); // Rimuovi il task dal DOM
                            } else if (data.error) {
                                console.error(data.error);
                            }
                        })
                        .catch(err => console.error('Errore nella richiesta:', err));
                    }
                });
            });
        } else {
            console.warn("Nessun dato trovato per la settimana.");
        }
    } catch (error) {
        console.error("Errore durante il caricamento dei promemoria settimanali:", error);
    }
}

function adjustDate(dateString, days) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
}

function formatDate(dateString) {
    if (!dateString) return "Data non valida";
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("it-IT", options);
}

// Carica la settimana corrente al caricamento della pagina
fetchWeeklyReminders();
