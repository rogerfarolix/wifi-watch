/**
 * Wifi-Watch - Exécution de commandes système Windows
 * Point d'entrée unique : sortie décodée en UTF-8 (chcp 65001), aucun shell pour les arguments dynamiques.
 */

const { execFile } = require('child_process');

/**
 * Exécute une commande Windows STATIQUE (jamais de valeur utilisateur dans la chaîne).
 * La page de code est forcée en UTF-8 pour que les libellés accentués de netsh/ipconfig soient lisibles.
 * Retourne la sortie standard, ou '' en cas d'erreur.
 */
function runStatic(commandLine, timeout = 7000) {
    return new Promise((resolve) => {
        execFile('cmd.exe', ['/d', '/s', '/c', `chcp 65001>nul&${commandLine}`],
            { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
            (err, stdout) => resolve(err ? '' : stdout.toString('utf8')));
    });
}

/**
 * Exécute un programme avec une liste d'arguments (sans shell : pas d'injection possible).
 * Résout toujours { ok, stdout, stderr } ; ok est false si le code de sortie est non nul.
 */
function runFile(file, args = [], timeout = 7000) {
    return new Promise((resolve) => {
        execFile(file, args, { timeout, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
            (err, stdout, stderr) => resolve({ ok: !err, stdout: String(stdout || ''), stderr: String(stderr || '') }));
    });
}

module.exports = { runStatic, runFile };
