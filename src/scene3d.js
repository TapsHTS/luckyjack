import * as THREE from 'three';
import { gsap } from 'gsap';

export class Scene3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        
        this.cardMeshes = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.cardTextures = new Map();
        
        this.init();
    }
    
    init() {
        // Configuration du renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Configuration de la scène
        this.scene.background = null; // Transparent pour voir le gradient CSS
        
        // Caméra - Position optimisée pour voir les cartes
        this.camera.position.set(0, 12, 15);
        this.camera.lookAt(0, 0, 0);
        
        // Éclairage
        this.setupLighting();
        
        // Table de jeu
        this.setupTable();
        
        // Gestionnaire de redimensionnement
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    setupLighting() {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle principale
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
        
        // Lumière de point pour l'ambiance
        const pointLight = new THREE.PointLight(0xffd700, 0.5, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
    }
    
    setupTable() {
        // Table principale
        const tableGeometry = new THREE.CylinderGeometry(8, 8, 0.2, 32);
        const tableMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x0d5016,
            transparent: true,
            opacity: 0.9
        });
        const table = new THREE.Mesh(tableGeometry, tableMaterial);
        table.position.y = -0.1;
        table.receiveShadow = true;
        this.scene.add(table);
        
        // Bordure dorée
        const borderGeometry = new THREE.TorusGeometry(8, 0.1, 8, 32);
        const borderMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.y = 0;
        border.rotation.x = Math.PI / 2;
        this.scene.add(border);
        
        // Zone du croupier
        const dealerZoneGeometry = new THREE.PlaneGeometry(6, 1);
        const dealerZoneMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x1a1a1a, 
            transparent: true, 
            opacity: 0.3 
        });
        const dealerZone = new THREE.Mesh(dealerZoneGeometry, dealerZoneMaterial);
        dealerZone.position.set(0, 0.01, -3);
        dealerZone.rotation.x = -Math.PI / 2;
        this.scene.add(dealerZone);
        
        // Zone du joueur
        const playerZone = dealerZone.clone();
        playerZone.position.set(0, 0.01, 3);
        this.scene.add(playerZone);
    }
    
    async loadCardTexture(imagePath) {
        if (this.cardTextures.has(imagePath)) {
            return this.cardTextures.get(imagePath);
        }
        
        console.log('Tentative de chargement de la texture:', imagePath);
        
        return new Promise((resolve, reject) => {
            this.textureLoader.load(
                imagePath,
                (texture) => {
                    console.log('✅ Texture chargée avec succès:', imagePath);
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.flipY = false; // Important pour éviter que les cartes soient retournées
                    this.cardTextures.set(imagePath, texture);
                    resolve(texture);
                },
                (progress) => {
                    console.log('📦 Progression du chargement:', imagePath, progress);
                },
                (error) => {
                    console.error('❌ Erreur lors du chargement de la texture:', imagePath, error);
                    // Créer une texture par défaut avec le nom de la carte
                    const canvas = document.createElement('canvas');
                    canvas.width = 256;
                    canvas.height = 356;
                    const ctx = canvas.getContext('2d');
                    
                    // Fond blanc avec bordure
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, 256, 356);
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 4;
                    ctx.strokeRect(4, 4, 248, 348);
                    
                    // Texte de la carte
                    ctx.fillStyle = '#000000';
                    ctx.font = 'bold 24px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('CARTE', 128, 180);
                    
                    // Nom du fichier manquant
                    ctx.font = '12px Arial';
                    const fileName = imagePath.split('/').pop();
                    ctx.fillText(fileName, 128, 210);
                    
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.flipY = false;
                    this.cardTextures.set(imagePath, texture);
                    resolve(texture);
                }
            );
        });
    }
    
    async createCardMesh(card) {
        // Géométrie de la carte (plus grande pour mieux voir les détails)
        const cardGeometry = new THREE.BoxGeometry(2.5, 0.03, 3.6);
        
        // Matériaux
        const materials = [];
        
        // Face avant (image de la carte)
        let frontTexture;
        try {
            console.log('🔄 Chargement texture carte:', card.getImagePath());
            frontTexture = await this.loadCardTexture(card.getImagePath());
            console.log('✅ Texture carte chargée avec succès');
        } catch (error) {
            console.error('❌ Erreur chargement texture carte:', error);
            // Créer une texture par défaut colorée pour identifier le problème
            const canvas = document.createElement('canvas');
            canvas.width = 500;
            canvas.height = 726;
            const ctx = canvas.getContext('2d');
            
            // Fond coloré selon la couleur de la carte
            const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
            ctx.fillStyle = isRed ? '#ffeeee' : '#eeeeff';
            ctx.fillRect(0, 0, 500, 726);
            
            // Bordure
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, 492, 718);
            
            // Texte de la carte
            ctx.fillStyle = isRed ? '#cc0000' : '#000000';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(card.rank.toUpperCase(), 250, 200);
            
            // Symbole de la couleur
            const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
            ctx.font = 'bold 72px Arial';
            ctx.fillText(suitSymbols[card.suit] || '?', 250, 320);
            
            // Message d'erreur
            ctx.font = '24px Arial';
            ctx.fillStyle = '#666666';
            ctx.fillText('Texture manquante', 250, 450);
            ctx.fillText(card.getImagePath(), 250, 480);
            
            frontTexture = new THREE.CanvasTexture(canvas);
            frontTexture.flipY = false;
        }
        
        const frontMaterial = new THREE.MeshPhongMaterial({ 
            map: frontTexture,
            transparent: true
        });
        
        // Face arrière (dos de carte)
        let backMaterial;
        try {
            const backTexture = await this.loadCardTexture('/cards/back.png');
            backMaterial = new THREE.MeshPhongMaterial({ 
                map: backTexture,
                transparent: true
            });
        } catch (error) {
            // Créer une texture de dos par défaut
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 356;
            const ctx = canvas.getContext('2d');
            
            // Fond bleu navy
            ctx.fillStyle = '#003366';
            ctx.fillRect(0, 0, 256, 356);
            
            // Bordure dorée
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, 248, 348);
            
            // Motif central
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(64, 89, 128, 178);
            
            // Croix
            ctx.fillStyle = '#003366';
            ctx.fillRect(118, 89, 20, 178);
            ctx.fillRect(64, 167, 128, 22);
            
            // Coins décoratifs
            const corners = [[32, 44], [224, 44], [32, 312], [224, 312]];
            corners.forEach(([x, y]) => {
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, Math.PI * 2);
                ctx.fillStyle = '#FFD700';
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = '#003366';
                ctx.fill();
            });
            
            const backTexture = new THREE.CanvasTexture(canvas);
            backTexture.flipY = false;
            
            backMaterial = new THREE.MeshPhongMaterial({ 
                map: backTexture,
                transparent: true
            });
        }
        
        // Côtés
        const sideMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
        
        // Ordre des matériaux: droite, gauche, haut, bas, avant, arrière
        materials.push(sideMaterial, sideMaterial, sideMaterial, sideMaterial, frontMaterial, backMaterial);
        
        const cardMesh = new THREE.Mesh(cardGeometry, materials);
        cardMesh.castShadow = true;
        cardMesh.receiveShadow = true;
        
        // Si la carte est cachée, la retourner
        if (card.hidden) {
            cardMesh.rotation.y = Math.PI;
        }
        
        this.scene.add(cardMesh);
        this.cardMeshes.set(card, cardMesh);
        card.mesh = cardMesh;
        
        return cardMesh;
    }
    
    async dealCardAnimation(card, targetPosition, isDealer = false, cardIndex = 0) {
        const cardMesh = await this.createCardMesh(card);
        
        // Position initiale (paquet de cartes)
        const startPosition = { x: -6, y: 2, z: 0 };
        cardMesh.position.set(startPosition.x, startPosition.y, startPosition.z);
        cardMesh.rotation.z = Math.PI / 2; // Carte couchée
        
        // Animation de distribution
        const timeline = gsap.timeline();
        
        // Mouvement vers la position cible
        timeline.to(cardMesh.position, {
            duration: 0.8,
            x: targetPosition.x,
            y: targetPosition.y + 0.5,
            z: targetPosition.z,
            ease: "power2.out"
        });
        
        // Rotation pour poser la carte
        timeline.to(cardMesh.rotation, {
            duration: 0.3,
            z: 0,
            ease: "power2.out"
        }, "-=0.3");
        
        // Atterrissage
        timeline.to(cardMesh.position, {
            duration: 0.2,
            y: targetPosition.y,
            ease: "bounce.out"
        }, "-=0.2");
        
        // Si c'est une carte cachée du croupier, l'animer pour qu'elle se retourne plus tard
        if (card.hidden) {
            cardMesh.rotation.y = Math.PI;
        }
        
        return timeline;
    }
    
    flipCard(card) {
        if (!card.mesh) return;
        
        const timeline = gsap.timeline();
        
        // Rotation de 90 degrés
        timeline.to(card.mesh.rotation, {
            duration: 0.2,
            y: Math.PI / 2,
            ease: "power2.in"
        });
        
        // Changer la texture et finir la rotation
        timeline.call(() => {
            card.hidden = false;
        });
        
        timeline.to(card.mesh.rotation, {
            duration: 0.2,
            y: 0,
            ease: "power2.out"
        });
        
        return timeline;
    }
    
    clearCards() {
        for (const [card, mesh] of this.cardMeshes) {
            // Animation de sortie
            gsap.to(mesh.position, {
                duration: 0.5,
                y: -2,
                ease: "power2.in",
                onComplete: () => {
                    this.scene.remove(mesh);
                    mesh.geometry.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(mat => mat.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });
        }
        this.cardMeshes.clear();
    }
    
    getCardPosition(isDealer, cardIndex) {
        const baseX = -3 + (cardIndex * 2.8); // Plus d'espacement pour des cartes plus grandes
        const z = isDealer ? -4 : 4; // Plus de distance pour mieux voir
        const y = 0.1;
        
        return { x: baseX, y, z };
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        animate();
    }
}
