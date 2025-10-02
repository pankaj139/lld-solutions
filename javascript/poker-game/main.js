// Poker Game - JavaScript Implementation
// Texas Hold'em poker with hand evaluation and betting rounds

const Suit = { HEARTS: '♥', DIAMONDS: '♦', CLUBS: '♣', SPADES: '♠' };
const Rank = { TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10, JACK: 11, QUEEN: 12, KING: 13, ACE: 14 };
const HandRank = { HIGH_CARD: 1, PAIR: 2, TWO_PAIR: 3, THREE_KIND: 4, STRAIGHT: 5, FLUSH: 6, FULL_HOUSE: 7, FOUR_KIND: 8, STRAIGHT_FLUSH: 9, ROYAL_FLUSH: 10 };
const GamePhase = { PRE_FLOP: 'PRE_FLOP', FLOP: 'FLOP', TURN: 'TURN', RIVER: 'RIVER', SHOWDOWN: 'SHOWDOWN' };
const PlayerAction = { FOLD: 'FOLD', CHECK: 'CHECK', CALL: 'CALL', RAISE: 'RAISE', ALL_IN: 'ALL_IN' };

class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
    }
    toString() { return `${this.rank}${this.suit}`; }
}

class Deck {
    constructor() {
        this.cards = [];
        this.reset();
        this.shuffle();
    }
    
    reset() {
        this.cards = [];
        Object.values(Suit).forEach(suit => {
            Object.values(Rank).forEach(rank => {
                if (typeof rank === 'number') {
                    this.cards.push(new Card(suit, rank));
                }
            });
        });
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    deal() { return this.cards.pop(); }
}

class Hand {
    constructor(cards) {
        this.cards = cards;
        this.evaluation = this.evaluateHand();
    }
    
    evaluateHand() {
        const sortedCards = [...this.cards].sort((a, b) => b.rank - a.rank);
        const ranks = sortedCards.map(card => card.rank);
        const suits = sortedCards.map(card => card.suit);
        const rankCounts = {};
        ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
        const counts = Object.values(rankCounts).sort((a, b) => b - a);
        
        const isFlush = suits.every(suit => suit === suits[0]);
        const isStraight = this.isStraight(ranks);
        const isRoyalStraight = ranks[0] === 14 && ranks[1] === 13 && ranks[2] === 12 && ranks[3] === 11 && ranks[4] === 10;
        
        if (isFlush && isRoyalStraight) return { rank: HandRank.ROYAL_FLUSH, value: 14, kickers: [] };
        if (isFlush && isStraight) return { rank: HandRank.STRAIGHT_FLUSH, value: ranks[0], kickers: [] };
        if (counts[0] === 4) return { rank: HandRank.FOUR_KIND, value: this.getValueByCount(rankCounts, 4), kickers: [this.getValueByCount(rankCounts, 1)] };
        if (counts[0] === 3 && counts[1] === 2) return { rank: HandRank.FULL_HOUSE, value: this.getValueByCount(rankCounts, 3), kickers: [this.getValueByCount(rankCounts, 2)] };
        if (isFlush) return { rank: HandRank.FLUSH, value: ranks[0], kickers: ranks.slice(1) };
        if (isStraight) return { rank: HandRank.STRAIGHT, value: ranks[0], kickers: [] };
        if (counts[0] === 3) return { rank: HandRank.THREE_KIND, value: this.getValueByCount(rankCounts, 3), kickers: ranks.filter(r => rankCounts[r] !== 3) };
        if (counts[0] === 2 && counts[1] === 2) return { rank: HandRank.TWO_PAIR, value: Math.max(...Object.keys(rankCounts).filter(r => rankCounts[r] === 2)), kickers: ranks.filter(r => rankCounts[r] === 1) };
        if (counts[0] === 2) return { rank: HandRank.PAIR, value: this.getValueByCount(rankCounts, 2), kickers: ranks.filter(r => rankCounts[r] !== 2) };
        return { rank: HandRank.HIGH_CARD, value: ranks[0], kickers: ranks.slice(1) };
    }
    
    isStraight(ranks) {
        for (let i = 0; i < ranks.length - 1; i++) {
            if (ranks[i] - ranks[i + 1] !== 1) {
                if (i === 0 && ranks[0] === 14 && ranks[1] === 5) continue; // A-5 straight
                return false;
            }
        }
        return true;
    }
    
    getValueByCount(rankCounts, count) {
        return parseInt(Object.keys(rankCounts).find(rank => rankCounts[rank] === count));
    }
    
    compareTo(other) {
        if (this.evaluation.rank !== other.evaluation.rank) {
            return this.evaluation.rank - other.evaluation.rank;
        }
        if (this.evaluation.value !== other.evaluation.value) {
            return this.evaluation.value - other.evaluation.value;
        }
        for (let i = 0; i < Math.min(this.evaluation.kickers.length, other.evaluation.kickers.length); i++) {
            if (this.evaluation.kickers[i] !== other.evaluation.kickers[i]) {
                return this.evaluation.kickers[i] - other.evaluation.kickers[i];
            }
        }
        return 0;
    }
}

class Player {
    constructor(playerId, name, chips = 1000) {
        this.playerId = playerId;
        this.name = name;
        this.chips = chips;
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.isActive = true;
        this.isFolded = false;
        this.isAllIn = false;
        this.bestHand = null;
    }
    
    receiveCards(cards) { this.holeCards = cards; }
    
    bet(amount) {
        const betAmount = Math.min(amount, this.chips);
        this.chips -= betAmount;
        this.currentBet += betAmount;
        this.totalBet += betAmount;
        if (this.chips === 0) this.isAllIn = true;
        return betAmount;
    }
    
    fold() { this.isFolded = true; }
    
    resetForNewHand() {
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBet = 0;
        this.isFolded = false;
        this.isAllIn = false;
        this.bestHand = null;
    }
    
    evaluateHand(communityCards) {
        const allCards = [...this.holeCards, ...communityCards];
        let bestHand = null;
        
        // Try all combinations of 5 cards
        for (let i = 0; i < allCards.length; i++) {
            for (let j = i + 1; j < allCards.length; j++) {
                for (let k = j + 1; k < allCards.length; k++) {
                    for (let l = k + 1; l < allCards.length; l++) {
                        for (let m = l + 1; m < allCards.length; m++) {
                            const hand = new Hand([allCards[i], allCards[j], allCards[k], allCards[l], allCards[m]]);
                            if (!bestHand || hand.compareTo(bestHand) > 0) {
                                bestHand = hand;
                            }
                        }
                    }
                }
            }
        }
        
        this.bestHand = bestHand;
        return bestHand;
    }
}

class PokerGame {
    constructor(playerNames, smallBlind = 10, bigBlind = 20) {
        this.players = playerNames.map((name, index) => new Player(index, name));
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = GamePhase.PRE_FLOP;
        this.dealerPosition = 0;
        this.currentPlayerIndex = 0;
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.sidePots = [];
        this.handNumber = 0;
    }
    
    startNewHand() {
        this.handNumber++;
        console.log(`\n=== Hand ${this.handNumber} ===`);
        
        // Reset game state
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.phase = GamePhase.PRE_FLOP;
        this.sidePots = [];
        
        // Reset players
        this.players.forEach(player => player.resetForNewHand());
        
        // Remove players with no chips
        this.players = this.players.filter(player => player.chips > 0);
        
        if (this.players.length < 2) {
            console.log("Game over - not enough players!");
            return false;
        }
        
        // Move dealer button
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        
        // Post blinds
        this.postBlinds();
        
        // Deal hole cards
        this.dealHoleCards();
        
        console.log("Hole cards dealt to players");
        this.displayPlayerCards();
        
        return true;
    }
    
    postBlinds() {
        const smallBlindPos = (this.dealerPosition + 1) % this.players.length;
        const bigBlindPos = (this.dealerPosition + 2) % this.players.length;
        
        const smallBlindAmount = this.players[smallBlindPos].bet(this.smallBlind);
        const bigBlindAmount = this.players[bigBlindPos].bet(this.bigBlind);
        
        this.pot += smallBlindAmount + bigBlindAmount;
        this.currentBet = this.bigBlind;
        
        console.log(`${this.players[smallBlindPos].name} posts small blind: $${smallBlindAmount}`);
        console.log(`${this.players[bigBlindPos].name} posts big blind: $${bigBlindAmount}`);
    }
    
    dealHoleCards() {
        this.players.forEach(player => {
            player.receiveCards([this.deck.deal(), this.deck.deal()]);
        });
    }
    
    dealCommunityCards(count) {
        for (let i = 0; i < count; i++) {
            this.communityCards.push(this.deck.deal());
        }
    }
    
    bettingRound() {
        const startingPlayer = this.phase === GamePhase.PRE_FLOP ? 
            (this.dealerPosition + 3) % this.players.length : 
            (this.dealerPosition + 1) % this.players.length;
        
        this.currentPlayerIndex = startingPlayer;
        let playersToAct = this.players.filter(p => !p.isFolded && !p.isAllIn);
        let bettingComplete = false;
        
        while (!bettingComplete && playersToAct.length > 1) {
            const player = this.players[this.currentPlayerIndex];
            
            if (!player.isFolded && !player.isAllIn) {
                const action = this.getPlayerAction(player);
                this.processPlayerAction(player, action);
            }
            
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            
            // Check if betting round is complete
            playersToAct = this.players.filter(p => !p.isFolded && !p.isAllIn);
            const activePlayers = this.players.filter(p => !p.isFolded);
            
            if (activePlayers.length === 1) {
                bettingComplete = true;
            } else if (playersToAct.length === 0 || 
                      (playersToAct.length === 1 && activePlayers.every(p => p.currentBet === this.currentBet || p.isAllIn))) {
                bettingComplete = true;
            }
        }
        
        // Reset current bets for next round
        this.players.forEach(player => player.currentBet = 0);
    }
    
    getPlayerAction(player) {
        const callAmount = this.currentBet - player.currentBet;
        const canCheck = callAmount === 0;
        const canCall = callAmount > 0 && callAmount <= player.chips;
        const canRaise = player.chips > callAmount;
        
        // Simple AI strategy
        if (Math.random() < 0.2) return { type: PlayerAction.FOLD };
        if (canCheck && Math.random() < 0.4) return { type: PlayerAction.CHECK };
        if (canCall && Math.random() < 0.6) return { type: PlayerAction.CALL };
        if (canRaise && Math.random() < 0.3) {
            const raiseAmount = Math.min(player.chips, callAmount + this.bigBlind * (1 + Math.floor(Math.random() * 3)));
            return { type: PlayerAction.RAISE, amount: raiseAmount };
        }
        if (canCall) return { type: PlayerAction.CALL };
        return { type: PlayerAction.FOLD };
    }
    
    processPlayerAction(player, action) {
        switch (action.type) {
            case PlayerAction.FOLD:
                player.fold();
                console.log(`${player.name} folds`);
                break;
            case PlayerAction.CHECK:
                console.log(`${player.name} checks`);
                break;
            case PlayerAction.CALL:
                const callAmount = this.currentBet - player.currentBet;
                const actualCall = player.bet(callAmount);
                this.pot += actualCall;
                console.log(`${player.name} calls $${actualCall}`);
                break;
            case PlayerAction.RAISE:
                const raiseAmount = action.amount;
                const actualRaise = player.bet(raiseAmount);
                this.pot += actualRaise;
                this.currentBet = player.currentBet;
                console.log(`${player.name} raises to $${this.currentBet}`);
                break;
        }
    }
    
    nextPhase() {
        switch (this.phase) {
            case GamePhase.PRE_FLOP:
                this.phase = GamePhase.FLOP;
                this.dealCommunityCards(3);
                console.log(`\nFlop: ${this.communityCards.map(c => c.toString()).join(' ')}`);
                break;
            case GamePhase.FLOP:
                this.phase = GamePhase.TURN;
                this.dealCommunityCards(1);
                console.log(`\nTurn: ${this.communityCards.map(c => c.toString()).join(' ')}`);
                break;
            case GamePhase.TURN:
                this.phase = GamePhase.RIVER;
                this.dealCommunityCards(1);
                console.log(`\nRiver: ${this.communityCards.map(c => c.toString()).join(' ')}`);
                break;
            case GamePhase.RIVER:
                this.phase = GamePhase.SHOWDOWN;
                break;
        }
        this.currentBet = 0;
    }
    
    showdown() {
        console.log("\n=== Showdown ===");
        const activePlayers = this.players.filter(p => !p.isFolded);
        
        activePlayers.forEach(player => {
            player.evaluateHand(this.communityCards);
            console.log(`${player.name}: ${player.holeCards.map(c => c.toString()).join(' ')} - ${this.getHandName(player.bestHand)}`);
        });
        
        // Determine winner
        const winners = this.determineWinners(activePlayers);
        const winnings = Math.floor(this.pot / winners.length);
        
        console.log(`\nWinner(s): ${winners.map(p => p.name).join(', ')}`);
        winners.forEach(winner => {
            winner.chips += winnings;
            console.log(`${winner.name} wins $${winnings}`);
        });
        
        console.log(`\nChip counts:`);
        this.players.forEach(player => {
            console.log(`${player.name}: $${player.chips}`);
        });
    }
    
    determineWinners(players) {
        if (players.length === 1) return players;
        
        let bestPlayers = [players[0]];
        
        for (let i = 1; i < players.length; i++) {
            const comparison = players[i].bestHand.compareTo(bestPlayers[0].bestHand);
            if (comparison > 0) {
                bestPlayers = [players[i]];
            } else if (comparison === 0) {
                bestPlayers.push(players[i]);
            }
        }
        
        return bestPlayers;
    }
    
    getHandName(hand) {
        const rankNames = {
            [HandRank.HIGH_CARD]: 'High Card',
            [HandRank.PAIR]: 'Pair',
            [HandRank.TWO_PAIR]: 'Two Pair',
            [HandRank.THREE_KIND]: 'Three of a Kind',
            [HandRank.STRAIGHT]: 'Straight',
            [HandRank.FLUSH]: 'Flush',
            [HandRank.FULL_HOUSE]: 'Full House',
            [HandRank.FOUR_KIND]: 'Four of a Kind',
            [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
            [HandRank.ROYAL_FLUSH]: 'Royal Flush'
        };
        return rankNames[hand.evaluation.rank] || 'Unknown';
    }
    
    displayPlayerCards() {
        this.players.forEach(player => {
            if (player.holeCards.length > 0) {
                console.log(`${player.name}: ${player.holeCards.map(c => c.toString()).join(' ')} (Chips: $${player.chips})`);
            }
        });
    }
    
    playHand() {
        if (!this.startNewHand()) return false;
        
        // Pre-flop betting
        this.bettingRound();
        if (this.players.filter(p => !p.isFolded).length === 1) {
            this.showdown();
            return true;
        }
        
        // Flop
        this.nextPhase();
        this.bettingRound();
        if (this.players.filter(p => !p.isFolded).length === 1) {
            this.showdown();
            return true;
        }
        
        // Turn
        this.nextPhase();
        this.bettingRound();
        if (this.players.filter(p => !p.isFolded).length === 1) {
            this.showdown();
            return true;
        }
        
        // River
        this.nextPhase();
        this.bettingRound();
        
        // Showdown
        this.nextPhase();
        this.showdown();
        
        return true;
    }
}

function runDemo() {
    console.log("=== Poker Game Demo ===");
    
    const game = new PokerGame(['Alice', 'Bob', 'Charlie', 'Diana']);
    
    // Play a few hands
    for (let i = 0; i < 3; i++) {
        if (!game.playHand()) break;
    }
    
    console.log("\nFinal chip counts:");
    game.players.forEach(player => {
        console.log(`${player.name}: $${player.chips}`);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PokerGame, Player, Hand, Card, Deck };
}

if (typeof require !== 'undefined' && require.main === module) {
    runDemo();
}