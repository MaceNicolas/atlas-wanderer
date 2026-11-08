// Affiche le lien « Test » (orange) dans le menu uniquement en local (localhost, 127.0.0.1 ou fichier ouvert directement).
if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:') document.querySelectorAll('.nav-test').forEach(function (a) { a.hidden = false; });
