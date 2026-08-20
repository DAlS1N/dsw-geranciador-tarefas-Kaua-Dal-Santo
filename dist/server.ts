// Express is provided at runtime; suppress the error when its type declarations
// are not available in the current TypeScript setup.
// @ts-ignore
import express from 'express';
import Database from "better-sqlite3";
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;
const db = new Database('tarefas.db');
db.exec(`
CREATE TABLE IF NOT EXISTS tarefas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,  
    descricao TEXT NOT NULL,
    estado TEXT default 'Pendente'
);
`);
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL
);
`);
const usuariosExistentes = db.prepare("SELECT count(*) AS count FROM usuarios").get() as { count: number };
if (usuariosExistentes.count === 0) {
    const stmt = db.prepare("INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)");
    stmt.run("Admin", "admin@example.com", "admin123");
}
// ----- Rotas -----
app.get("/api/tasks", (req, res) => {
    const { search } = req.query;
    try {
        if (search) {
            const sql = "SELECT * FROM tarefas WHERE titulo LIKE ?";
            const tarefas = db.prepare(sql).all(`%${String(search)}%`);
            res.json(tarefas);
        }
        else {
            const tarefas = db.prepare("SELECT * FROM tarefas").all();
            res.json(tarefas);
        }
    }
    catch (erro) {
        // Exibir o erro real ajuda a compreender a quebra de sintaxe gerada pelo ataque
        res.status(500).json({ error: erro instanceof Error ? erro.message : "Erro desconhecido" });
    }
});
app.post("/api/tasks", (req, res) => {
    const { titulo, descricao, estado } = req.body;
    if (!titulo || !descricao) {
        res.status(400).json({ message: "titulo e descricao são obrigatórios." });
        return;
    }
    const resultado = db.prepare("INSERT INTO tarefas (titulo, descricao, estado) VALUES (?, ?, ?)").run(titulo, descricao, estado || "Pendente");
    const novaTarefa = db
        .prepare("SELECT * FROM tarefas WHERE id = ?")
        .get(resultado.lastInsertRowid);
    res.status(201).json(novaTarefa);
});

app.delete("/api/tasks/:id", (req, res) => {
    const idParaDeletar = parseInt(req.params.id, 10);
    if (Number.isNaN(idParaDeletar)) {
        res.status(400).json({ message: "O ID da tarefa deve ser um número." });
        return;
    }
    const tarefaExiste = db
        .prepare("SELECT id FROM tarefas WHERE id = ?")
        .get(idParaDeletar);
    if (!tarefaExiste) {
        res.status(404).json({ message: "Tarefa não encontrada." });
        return;
    }
    db.prepare("DELETE FROM tarefas WHERE id = ?").run(idParaDeletar);
    res.json({ message: "Tarefa removida com sucesso!" });
});
// ----- Inicialização do servidor -----
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
