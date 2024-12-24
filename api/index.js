const express = require('express');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const compression = require("compression");
const cors = require('cors');
const exec = require("child_process").exec;

const UglifyJS = require("uglify-js");
const prettyugly = require('prettyugly');

app.use(express.static(path.join(__dirname,"..", 'public')));
app.use(express.json());  // Middleware para interpretar o JSON no corpo das requisições
app.use(bodyParser.json()); //Handles JSON requests
app.use(bodyParser.urlencoded({ extended: false })); //Handles normal post requests
app.use(compression({ filter: () => false })); // Desativa compressão

function minifyHTML(html) {
    // Remove HTML comments (except for conditional comments)
    html = html.replace(/<!--(?!\[if).*?-->/gs, '');

    // Remove spaces between tags
    html = html.replace(/>\s+</g, '><');

    // Remove leading and trailing whitespaces
    html = html.trim();

    // Collapse multiple spaces into one
    html = html.replace(/\s{2,}/g, ' ');

    return html;
}


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

app.post("/api/minify", (req, res) => {
    const { content, type } = req.body;

    if (content == null)
        return res.status(400).json({success: false, error : "Conteúdo Inválido"});

    if (type != "javascript" && type != "json" && type != "html" && type != "css"){
        return res.status(400).json({success : false, error : "Tipo de documento inválido"});
    }


    switch (type){
        case "javascript":
            const result = UglifyJS.minify(content)
            if (result.error != undefined)
                return res.status(400).json({success : false, error : result.error});
            return res.status(200).json({success : true, output : result.code});
            break;
            
        case "html":
            const htmlresult = minifyHTML(content)
            return res.status(200).json({success: true, output : htmlresult});
            break;

        case "css":
            const cssresult = prettyugly.ugly(content);
            return res.status(200).json({success : true, output : cssresult});
            break;

    }


})

module.exports = app;