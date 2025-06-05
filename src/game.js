import { Deck, Hand } from './cards.js';
import { Scene3D } from './scene3d.js';
import { gsap } from 'gsap';

export class BlackjackGame {
    constructor() {
        this.deck = new Deck();
        this.playerHand = new Hand();
        this.dealerHand = new Hand();
        this.dealerHand.isDealer = true;
        
        this.gameState = 'waiting'; // waiting, dealing, playing, dealer, finished
        this.playerMoney = 1000;
        this.currentBet = 50;
        this.gameResult = null;
        
        this.scene3d = null;
        this.ui = {
            playerScore: document.getElementById('playerScore'),
            dealerScore: document.getElementById('dealerScore'),
            playerCards: document.getElementById('playerCards'),
            dealerCards: document.getElementById('dealerCards'),
            playerMoney: document.getElementById('playerMoney'),
            betAmount: document.getElementById('betAmount'),
            message: document.getElementById('message'),
            hitBtn: document.getElementById('hitBtn'),
            standBtn: document.getElementById('standBtn'),
            newGameBtn: document.getElementById('newGameBtn'),
            // Debug UI
            textureCount: document.getElementById('textureCount'),
            cardCount: document.getElementById('cardCount'),
            lastError: document.getElementById('lastError')
        };
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initialisation du jeu...');
        
        // Test de chargement d'image basique
        await this.testImageLoading();
        
        // Initialiser la scène 3D
        const canvas = document.getElementById('canvas');
        this.scene3d = new Scene3D(canvas);
        
        // Démarrer la boucle de rendu
        this.scene3d.startRenderLoop();
        
        // Précharger quelques textures de cartes
        await this.preloadTextures();
        
        // Masquer l'écran de chargement
        document.getElementById('loadingScreen').style.display = 'none';
        
        // Initialiser l'interface
        this.updateUI();
        this.updateControls();
        
        // Sons (simulation)
        this.sounds = {
            cardDeal: () => console.log('🃏 Son: Distribution de carte'),
            cardFlip: () => console.log('🔄 Son: Carte retournée'),
            win: () => console.log('🎉 Son: Victoire!'),
            lose: () => console.log('😞 Son: Défaite'),
            push: () => console.log('🤝 Son: Égalité')
        };
        
        console.log('✅ Jeu initialisé avec succès !');
    }
    
    async testImageLoading() {
        console.log('🧪 Test de chargement d\'images détaillé...');
        
        const testPaths = [
            '/cards/ace_of_spades.png',
            '/cards/king_of_hearts.png',
            '/cards/queen_of_diamonds.png',
            'cards/ace_of_spades.png', // Test sans slash initial
            './cards/ace_of_spades.png' // Test avec ./
        ];
        
        for (const path of testPaths) {
            await new Promise((resolve) => {
                const testImg = new Image();
                testImg.onload = () => {
                    console.log(`✅ SUCCÈS - Image chargée: ${path} (${testImg.width}x${testImg.height})`);
                    resolve();
                };
                testImg.onerror = (error) => {
                    console.error(`❌ ÉCHEC - Image non trouvée: ${path}`, error);
                    resolve();
                };
                testImg.src = path;
                
                // Timeout de 2 secondes
                setTimeout(() => {
                    if (!testImg.complete) {
                        console.warn(`⏰ TIMEOUT - Image en cours: ${path}`);
                        resolve();
                    }
                }, 2000);
            });
        }
        
        console.log('🧪 Test de chargement terminé');
    }
    
    async preloadTextures() {
        console.log('🔄 Début du préchargement des textures...');
        
        // Liste de cartes à précharger pour tester
        const testCards = [
            '/cards/ace_of_spades.png',
            '/cards/king_of_hearts.png',
            '/cards/queen_of_diamonds.png',
            '/cards/jack_of_clubs.png',
            '/cards/10_of_hearts.png',
            '/cards/2_of_clubs.png'
        ];
        
        let loaded = 0;
        for (const imagePath of testCards) {
            try {
                await this.scene3d.loadCardTexture(imagePath);
                loaded++;
                console.log(`✅ Préchargé: ${imagePath} (${loaded}/${testCards.length})`);
            } catch (error) {
                console.warn('⚠️ Impossible de précharger:', imagePath, error);
            }
        }
        
        console.log(`🎯 Préchargement terminé: ${loaded}/${testCards.length} textures chargées`);
    }
    
    adjustBet(amount) {
        if (this.gameState !== 'waiting') return;
        
        const newBet = this.currentBet + amount;
        if (newBet >= 10 && newBet <= this.playerMoney) {
            this.currentBet = newBet;
            this.updateUI();
        }
    }
    
    async newGame() {
        if (this.gameState === 'dealing') return;
        
        if (this.currentBet > this.playerMoney) {
            this.showMessage('Mise trop élevée!', 'lose');
            return;
        }
        
        if (this.playerMoney <= 0) {
            this.showMessage('Plus d\'argent! Rechargez la page pour recommencer.', 'lose');
            return;
        }
        
        this.gameState = 'dealing';
        this.gameResult = null;
        
        // Effacer les cartes précédentes
        this.scene3d.clearCards();
        this.playerHand.clear();
        this.dealerHand.clear();
        
        // Déduire la mise
        this.playerMoney -= this.currentBet;
        
        this.updateUI();
        this.updateControls();
        
        // Distribution initiale
        await this.dealInitialCards();
        
        // Vérifier le blackjack
        if (this.playerHand.isBlackjack()) {
            if (this.dealerHand.isBlackjack()) {
                await this.revealDealerCard();
                this.endGame('push');
            } else {
                await this.revealDealerCard();
                this.endGame('blackjack');
            }
        } else {
            this.gameState = 'playing';
            this.updateControls();
        }
    }
    
    async dealInitialCards() {
        console.log('🎴 Début de la distribution des cartes initiales...');
        const dealDelay = 500;
        
        // Première carte joueur
        let card = this.deck.dealCard();
        console.log('🃏 Distribution carte joueur 1:', card.toString(), 'Path:', card.getImagePath());
        this.playerHand.addCard(card);
        const pos1 = this.scene3d.getCardPosition(false, 0);
        await this.scene3d.dealCardAnimation(card, pos1);
        this.sounds.cardDeal();
        
        await new Promise(resolve => setTimeout(resolve, dealDelay));
        
        // Première carte croupier (visible)
        card = this.deck.dealCard();
        console.log('🃏 Distribution carte croupier 1:', card.toString(), 'Path:', card.getImagePath());
        this.dealerHand.addCard(card);
        const pos2 = this.scene3d.getCardPosition(true, 0);
        await this.scene3d.dealCardAnimation(card, pos2, true);
        this.sounds.cardDeal();
        
        await new Promise(resolve => setTimeout(resolve, dealDelay));
        
        // Deuxième carte joueur
        card = this.deck.dealCard();
        console.log('🃏 Distribution carte joueur 2:', card.toString(), 'Path:', card.getImagePath());
        this.playerHand.addCard(card);
        const pos3 = this.scene3d.getCardPosition(false, 1);
        await this.scene3d.dealCardAnimation(card, pos3);
        this.sounds.cardDeal();
        
        await new Promise(resolve => setTimeout(resolve, dealDelay));
        
        // Deuxième carte croupier (cachée)
        card = this.deck.dealCard();
        console.log('🃏 Distribution carte croupier 2 (cachée):', card.toString(), 'Path:', card.getImagePath());
        card.hidden = true;
        this.dealerHand.addCard(card);
        const pos4 = this.scene3d.getCardPosition(true, 1);
        await this.scene3d.dealCardAnimation(card, pos4, true);
        this.sounds.cardDeal();
        
        console.log('✅ Distribution initiale terminée');
        this.updateUI();
    }
    
    async hit() {
        if (this.gameState !== 'playing') return;
        
        const card = this.deck.dealCard();
        this.playerHand.addCard(card);
        
        const cardIndex = this.playerHand.cards.length - 1;
        const position = this.scene3d.getCardPosition(false, cardIndex);
        
        await this.scene3d.dealCardAnimation(card, position);
        this.sounds.cardDeal();
        
        this.updateUI();
        
        if (this.playerHand.isBusted()) {
            await this.revealDealerCard();
            this.endGame('bust');
        } else if (this.playerHand.getValue() === 21) {
            await this.stand();
        }
    }
    
    async stand() {
        if (this.gameState !== 'playing') return;
        
        this.gameState = 'dealer';
        this.updateControls();
        
        // Révéler la carte cachée du croupier
        await this.revealDealerCard();
        
        // Le croupier tire jusqu'à 17
        while (this.dealerHand.getValue() < 17) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const card = this.deck.dealCard();
            this.dealerHand.addCard(card);
            
            const cardIndex = this.dealerHand.cards.length - 1;
            const position = this.scene3d.getCardPosition(true, cardIndex);
            
            await this.scene3d.dealCardAnimation(card, position, true);
            this.sounds.cardDeal();
            
            this.updateUI();
        }
        
        // Déterminer le gagnant
        this.determineWinner();
    }
    
    async revealDealerCard() {
        const hiddenCard = this.dealerHand.cards.find(card => card.hidden);
        if (hiddenCard) {
            await this.scene3d.flipCard(hiddenCard);
            this.sounds.cardFlip();
            this.updateUI();
        }
    }
    
    determineWinner() {
        const playerValue = this.playerHand.getValue();
        const dealerValue = this.dealerHand.getValue();
        
        if (this.dealerHand.isBusted()) {
            this.endGame('win');
        } else if (playerValue > dealerValue) {
            this.endGame('win');
        } else if (playerValue < dealerValue) {
            this.endGame('lose');
        } else {
            this.endGame('push');
        }
    }
    
    endGame(result) {
        this.gameState = 'finished';
        this.gameResult = result;
        
        let message = '';
        let messageClass = '';
        let winnings = 0;
        
        switch (result) {
            case 'blackjack':
                message = 'BLACKJACK! 🎉';
                messageClass = 'win';
                winnings = Math.floor(this.currentBet * 2.5);
                this.sounds.win();
                break;
            case 'win':
                message = 'VICTOIRE! 🎉';
                messageClass = 'win';
                winnings = this.currentBet * 2;
                this.sounds.win();
                break;
            case 'push':
                message = 'ÉGALITÉ 🤝';
                messageClass = 'push';
                winnings = this.currentBet;
                this.sounds.push();
                break;
            case 'lose':
            case 'bust':
                message = result === 'bust' ? 'BUST! PERDU 😞' : 'PERDU 😞';
                messageClass = 'lose';
                winnings = 0;
                this.sounds.lose();
                break;
        }
        
        this.playerMoney += winnings;
        this.showMessage(message, messageClass);
        this.updateUI();
        this.updateControls();
        
        // Auto nouvelle partie après quelques secondes
        setTimeout(() => {
            if (this.gameState === 'finished') {
                this.gameState = 'waiting';
                this.updateControls();
                this.hideMessage();
            }
        }, 3000);
    }
    
    showMessage(text, className = '') {
        this.ui.message.textContent = text;
        this.ui.message.className = className ? `show ${className}` : 'show';
    }
    
    hideMessage() {
        this.ui.message.classList.remove('show');
    }
    
    updateUI() {
        // Scores
        this.ui.playerScore.textContent = `Score: ${this.playerHand.getValue()}`;
        
        const dealerValue = this.dealerHand.cards.some(card => card.hidden) 
            ? '?' 
            : this.dealerHand.getValue();
        this.ui.dealerScore.textContent = `Score: ${dealerValue}`;
        
        // Nombre de cartes
        this.ui.playerCards.textContent = `Cartes: ${this.playerHand.cards.length}`;
        this.ui.dealerCards.textContent = `Cartes: ${this.dealerHand.getVisibleCards().length}`;
        
        // Argent et mise
        this.ui.playerMoney.textContent = `Argent: ${this.playerMoney}€`;
        this.ui.betAmount.textContent = `${this.currentBet}€`;
        
        // Debug info
        if (this.scene3d) {
            this.ui.textureCount.textContent = `Textures: ${this.scene3d.cardTextures.size}`;
            this.ui.cardCount.textContent = `Cartes 3D: ${this.scene3d.cardMeshes.size}`;
        }
    }
    
    updateControls() {
        const isPlaying = this.gameState === 'playing';
        const isWaiting = this.gameState === 'waiting';
        
        this.ui.hitBtn.disabled = !isPlaying;
        this.ui.standBtn.disabled = !isPlaying;
        this.ui.newGameBtn.disabled = this.gameState === 'dealing';
        
        // Mettre en évidence le bouton nouvelle partie si on peut jouer
        if (isWaiting) {
            this.ui.newGameBtn.style.boxShadow = '0 0 20px rgba(0, 210, 211, 0.5)';
        } else {
            this.ui.newGameBtn.style.boxShadow = '';
        }
    }
    
    // Méthode de test pour diagnostiquer les problèmes de cartes
    async testCards() {
        console.log('🧪 TEST MANUEL DES CARTES');
        
        // Test 1: Créer une carte de test simple
        const testCard = this.deck.dealCard();
        console.log('🃏 Carte de test:', testCard.toString(), testCard.getImagePath());
        
        // Test 2: Essayer de créer un mesh de carte
        try {
            const mesh = await this.scene3d.createCardMesh(testCard);
            console.log('✅ Mesh créé avec succès');
            
            // Positionner la carte au centre pour la voir
            mesh.position.set(0, 2, 0);
            mesh.rotation.x = -Math.PI / 6; // Incliner pour mieux voir
            
            // L'enlever après 5 secondes
            setTimeout(() => {
                this.scene3d.scene.remove(mesh);
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
                console.log('🗑️ Carte de test supprimée');
            }, 5000);
            
        } catch (error) {
            console.error('❌ Erreur création mesh:', error);
        }
        
        // Test 3: Tester le chargement direct de texture
        try {
            const texture = await this.scene3d.loadCardTexture(testCard.getImagePath());
            console.log('✅ Texture chargée directement:', texture);
        } catch (error) {
            console.error('❌ Erreur chargement texture direct:', error);
        }
    }
}

// Fonction globale pour accéder au jeu depuis l'HTML
window.game = null;

// Initialiser le jeu quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.game = new BlackjackGame();
});
