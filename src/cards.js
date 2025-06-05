export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

export class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getValue();
        this.isAce = rank === 'ace';
        this.hidden = false;
        this.mesh = null;
    }
    
    getValue() {
        if (this.rank === 'ace') return 11;
        if (['jack', 'queen', 'king'].includes(this.rank)) return 10;
        return parseInt(this.rank);
    }
    
    getImagePath() {
        // Construire le chemin vers l'image de la carte
        const path = `/cards/${this.rank}_of_${this.suit}.png`;
        console.log('🃏 Chemin de la carte généré:', path, 'pour', this.toString());
        return path;
    }
    
    toString() {
        return `${this.rank} of ${this.suit}`;
    }
}

export class Deck {
    constructor() {
        this.cards = [];
        this.initDeck();
        this.shuffle();
    }
    
    initDeck() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    dealCard() {
        if (this.cards.length === 0) {
            this.initDeck();
            this.shuffle();
        }
        return this.cards.pop();
    }
    
    reset() {
        this.initDeck();
        this.shuffle();
    }
}

export class Hand {
    constructor() {
        this.cards = [];
        this.isDealer = false;
    }
    
    addCard(card) {
        this.cards.push(card);
    }
    
    getValue() {
        let value = 0;
        let aces = 0;
        
        for (const card of this.cards) {
            if (card.hidden) continue;
            
            if (card.isAce) {
                aces++;
                value += 11;
            } else {
                value += card.value;
            }
        }
        
        // Ajuster les as si nécessaire
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }
    
    isBusted() {
        return this.getValue() > 21;
    }
    
    isBlackjack() {
        return this.cards.length === 2 && this.getValue() === 21;
    }
    
    clear() {
        this.cards = [];
    }
    
    getVisibleCards() {
        return this.cards.filter(card => !card.hidden);
    }
}
