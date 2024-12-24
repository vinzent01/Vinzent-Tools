const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const compression = require("compression");
const cors = require('cors');
const exec = require("child_process").exec;

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());  // Middleware para interpretar o JSON no corpo das requisições
app.use(bodyParser.json()); //Handles JSON requests
app.use(bodyParser.urlencoded({ extended: false })); //Handles normal post requests
app.use(compression({ filter: () => false })); // Desativa compressão


app.get('/', (req, res) => {
    const template = fs.readFileSync("public/template.html").toString();
    const page = fs.readFileSync("public/pages/home.html").toString();
    const result = template.replace("{{ page }}", page);

    res.send(result);
});

app.get('/*', (req, res) => {
    const template = fs.readFileSync("public/template.html").toString();
    const page = fs.readFileSync(path.join("public/pages", req.url + ".html")).toString();
    const result = template.replace("{{ page }}", page);
    res.send(result);
})

app.post("/api/ping", (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ success: false, error: "Endereço não fornecido." });
    }

    // Valida e sanitiza o endereço
    const sanitizedAddress = address.trim().toLowerCase();

    // Permite apenas domínios válidos e endereços IP (IPv4/IPv6)
    const validAddressPattern = /^(([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}|(\d{1,3}\.){3}\d{1,3}|(\[[a-fA-F0-9:]+\]))$/;
    if (!validAddressPattern.test(sanitizedAddress)) {
        return res.status(400).json({ success: false, error: "Endereço inválido." });
    }
    
    // Executa o comando `ping` no sistema operacional
    const command = `ping -c 4 ${address}`; // -c 4 para 4 pacotes (Linux/Mac). Use -n 4 no Windows.
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(stderr);
            return res.status(500).json({ success: false, error: "Falha ao executar o comando ping." });
        }
        res.json({ success: true, output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});