from flask import Flask, request, jsonify, render_template
import sqlite3
from flask_cors import CORS
from datetime import datetime, timedelta, date

app = Flask(__name__)
CORS(app)

# Connessione al database
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT NOT NULL,
                    due_date TEXT,
                    time TEXT,
                    date_type TEXT,
                    priority TEXT,
                    recurrence TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )''')
    conn.commit()
    conn.close()

init_db()

def generate_recurrence_dates(start_date, recurrence_type, num_events=10):
    """
    Genera una lista di date ricorrenti in base al tipo di ricorrenza.
    :param start_date: La data iniziale (stringa in formato 'YYYY-MM-DD') o None.
    :param recurrence_type: Tipo di ricorrenza ('giornaliera', 'settimanale', 'mensile').
    :param num_events: Numero massimo di eventi da generare.
    :return: Lista di date ricorrenti.
    """
    if not start_date:
        return []  # Nessuna ricorrenza se la data iniziale non è specificata

    dates = []
    current_date = datetime.strptime(start_date, "%Y-%m-%d")
    delta = timedelta(days=0)

    if recurrence_type == "giornaliera":
        delta = timedelta(days=1)
    elif recurrence_type == "settimanale":
        delta = timedelta(weeks=1)
    elif recurrence_type == "mensile":
        delta = timedelta(weeks=4)

    for _ in range(num_events):
        dates.append(current_date.strftime("%Y-%m-%d"))
        current_date += delta

    return dates


# Aggiungi un nuovo promemoria
@app.route("/api/reminders", methods=["POST"])
def add_reminder():
    """
    Aggiunge un nuovo promemoria al database.
    Normalizza il testo (in minuscolo e senza spazi extra) prima di salvarlo.
    """
    data = request.json
    text = data.get("text", "").strip()
    due_date = data.get("due_date")  # Può essere vuoto
    time = data.get("time")  # Ora facoltativa
    date_type = data.get("date_type")  # "esatta" o "entro-giorno"
    priority = data.get("priority")
    recurrence = data.get("recurrence", "nessuna")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    if recurrence != "nessuna" and due_date:
        # Genera le date ricorrenti
        recurrence_dates = generate_recurrence_dates(due_date, recurrence)
        for date in recurrence_dates:
            c.execute(
                "INSERT INTO reminders (text, due_date, time, date_type, priority, recurrence) VALUES (?, ?, ?, ?, ?, ?)",
                (text, date, time, date_type, priority, recurrence),
            )
    else:
        # Aggiungi un singolo promemoria
        c.execute(
            "INSERT INTO reminders (text, due_date, time, date_type, priority, recurrence) VALUES (?, ?, ?, ?, ?, ?)",
            (text, due_date, time, date_type, priority, recurrence),
        )

    conn.commit()
    conn.close()

    return jsonify({"message": "Promemoria aggiunto con successo"})




# Ottieni tutti i promemoria
@app.route("/api/reminders", methods=["GET"])
def get_reminders():
    """
    Ottieni tutti i promemoria o filtra per intervallo di date.
    """
    start_date = request.args.get("start_date")  # Data di inizio
    end_date = request.args.get("end_date")  # Data di fine

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    if start_date and end_date:
        # Filtra per intervallo di date
        query = """
            SELECT id, text, due_date, time, date_type, priority, recurrence, created_at
            FROM reminders
            WHERE due_date BETWEEN ? AND ?
            ORDER BY due_date ASC
        """
        print(f"Eseguendo query: {query} con parametri: {start_date}, {end_date}")
        c.execute(query, (start_date, end_date))
    else:
        # Ottieni tutti i promemoria ordinati per data
        query = """
            SELECT id, text, due_date, time, date_type, priority, recurrence, created_at
            FROM reminders
            ORDER BY 
                CASE WHEN due_date IS NULL THEN 1 ELSE 0 END, 
                due_date ASC
        """
        print(f"Eseguendo query: {query}")
        c.execute(query)

    reminders = c.fetchall()
    conn.close()

    return jsonify([
        {
            "id": r[0],
            "text": r[1],
            "due_date": r[2] or "Senza data",
            "time": r[3],
            "date_type": r[4],
            "priority": r[5],
            "recurrence": r[6],
            "created_at": r[7]
        } for r in reminders
    ])



# Cancella tutti i promemoria
@app.route("/api/reminders", methods=["DELETE"])
def delete_all_reminders():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()
    c.execute("DELETE FROM reminders")
    conn.commit()
    conn.close()
    return jsonify({"message": "Tutti i promemoria sono stati eliminati"})

@app.route("/api/reminders/name/<string:text>", methods=["DELETE"])
def delete_reminders_by_name(text):
    """
    Cancella tutti i promemoria che condividono lo stesso nome (text).
    """
    try:
        print(f"Parametro ricevuto dal frontend: {text}")  # Log per debug

        # Raddoppia gli apostrofi per il confronto
        text_escaped = text.replace("'", "''").lower()
        print(f"Parametro dopo escape: {text_escaped}")

        conn = sqlite3.connect("database.db")
        c = conn.cursor()

        # Esegui la query usando il testo escapato
        query = f"DELETE FROM reminders WHERE LOWER(text) = LOWER('{text_escaped}')"
        print(f"Eseguendo query: {query}")
        c.execute(query)
        conn.commit()

        print(f"Numero di record eliminati: {c.rowcount}")  # Log per debug
        if c.rowcount == 0:
            return jsonify({"error": f"Nessun promemoria trovato con nome '{text}'"}), 404

        conn.close()
        return jsonify({"message": f"Tutti i promemoria con nome '{text}' sono stati eliminati"})
    except Exception as e:
        print(f"Errore durante l'eliminazione: {e}")  # Log dell'errore
        return jsonify({"error": str(e)}), 500


    
@app.route("/api/reminders/<int:id>", methods=["DELETE"])
def delete_reminder(id):
    """
    Cancella un singolo promemoria identificato dall'ID.
    """
    try:
        print(f"Tentativo di eliminare il promemoria con ID: {id}")  # Log per debug
        conn = sqlite3.connect("database.db")
        c = conn.cursor()
        c.execute("DELETE FROM reminders WHERE id = ?", (id,))
        if c.rowcount == 0:  # Controlla se è stato cancellato un record
            print(f"Nessun promemoria trovato con ID: {id}")
            return jsonify({"error": f"Nessun promemoria trovato con ID {id}"}), 404
        conn.commit()
        conn.close()
        print(f"Promemoria con ID {id} eliminato con successo")  # Log per debug
        return jsonify({"message": f"Promemoria con ID {id} eliminato"})
    except Exception as e:
        print(f"Errore durante l'eliminazione: {e}")  # Log dell'errore
        return jsonify({"error": str(e)}), 500
    

@app.route("/api/reminders/grouped", methods=["GET"])
def get_reminders_grouped():
    """
    Ottieni i promemoria raggruppati per giorno.
    """
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    query = """
        SELECT due_date, GROUP_CONCAT(text || ' (' || COALESCE(time, 'Nessuna ora') || ')') AS reminders
        FROM reminders
        WHERE due_date IS NOT NULL
        GROUP BY due_date
        ORDER BY due_date ASC
    """
    c.execute(query)
    reminders_grouped = c.fetchall()
    conn.close()

    return jsonify([
        {
            "due_date": r[0],
            "reminders": r[1].split(",") if r[1] else []
        } for r in reminders_grouped
    ])


@app.route("/api/reminders/week", methods=["GET"])
def get_reminders_week():
    """
    Ottieni i promemoria per una settimana specifica.
    """
    start_date_param = request.args.get("start_date")  # Data di inizio della settimana
    if start_date_param:
        start_of_week = datetime.strptime(start_date_param, "%Y-%m-%d").date()
    else:
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())  # Lunedì della settimana corrente

    end_of_week = start_of_week + timedelta(days=6)  # Domenica della settimana

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    query = """
        SELECT id, due_date, text, time, priority
        FROM reminders
        WHERE due_date BETWEEN ? AND ?
        ORDER BY due_date ASC, time ASC
    """
    c.execute(query, (str(start_of_week), str(end_of_week)))
    reminders = c.fetchall()
    conn.close()

    # Organizza i task per giorno
    reminders_by_day = {str(start_of_week + timedelta(days=i)): [] for i in range(7)}
    for r in reminders:
        due_date = str(r[1]) if isinstance(r[1], date) else r[1]
        reminders_by_day[due_date].append({
            "id": r[0],  # Aggiungi ID
            "text": r[2],
            "time": r[3],
            "priority": r[4]
        })

    return jsonify({
        "start_of_week": str(start_of_week),
        "end_of_week": str(end_of_week),
        "reminders": reminders_by_day
    })





# Servi la pagina HTML
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/list-view")
def list_view():
    """
    Mostra la pagina con l'elenco giornaliero dei promemoria.
    """
    return render_template("list_view.html")


@app.route("/weekly-view")
def weekly_view():
    """
    Mostra la vista settimanale dei promemoria.
    """
    return render_template("weekly_view.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
