// Création d'une image de dos de carte par défaut
const canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 280;
const ctx = canvas.getContext('2d');

// Fond bleu
ctx.fillStyle = '#003366';
ctx.fillRect(0, 0, 200, 280);

// Bordure dorée
ctx.strokeStyle = '#FFD700';
ctx.lineWidth = 8;
ctx.strokeRect(4, 4, 192, 272);

// Motif central
ctx.fillStyle = '#FFD700';
ctx.fillRect(40, 60, 120, 160);

// Motif en croix
ctx.fillStyle = '#003366';
ctx.fillRect(90, 60, 20, 160);
ctx.fillRect(40, 130, 120, 20);

// Coins décoratifs
for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? 20 : 160;
    const y = i < 2 ? 30 : 230;
    
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#003366';
    ctx.fill();
}

// Convertir en data URL et sauvegarder
const dataURL = canvas.toDataURL('image/png');
console.log('Image de dos de carte créée');
