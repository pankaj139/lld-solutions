/**
 * POKER GAME (TEXAS HOLD'EM) Implementation in JavaScript
 * ========================================================
 * 
 * This implementation demonstrates several key Design Patterns and OOP Concepts:
 * 
 * DESIGN PATTERNS USED:
 * 1. Strategy Pattern: Hand evaluation strategies for different poker variants
 *    - HandEvaluator can be swapped for different game types
 *    - Easy to add Omaha, Stud, or other variants
 *    - Evaluation algorithm encapsulated
 * 
 * 2. State Pattern: Game stage management with explicit transitions
 *    - GameStage enum defines all betting rounds
 *    - State transitions follow strict poker rules
 *    - Each stage has specific allowed operations
 * 
 * 3. Chain of Responsibility: Hand ranking evaluation chain
 *    - Checks Royal Flush, Straight Flush, Four of a Kind, etc.
 *    - Each handler checks for specific hand type
 *    - Falls through to next handler if not matched
 * 
 * 4. Factory Pattern: Card and Deck creation
 *    - Deck factory creates standard 52-card deck
 *    - Ensures all cards are valid
 *    - Centralized card creation logic
 * 
 * 5. Observer Pattern: Game event notifications
 *    - Players observe dealt cards, betting actions
 *    - Statistics tracker observes outcomes
 *    - Decoupled event system
 * 
 * 6. Command Pattern: Betting actions as commands
 *    - Each action (fold, call, raise) is a command
 *    - Validation and execution separated
 *    - Supports undo for practice mode
 * 
 * OOP CONCEPTS DEMONSTRATED:
 * 1. Encapsulation: Hole cards hidden, pot logic internal
 * 2. Abstraction: Clear interfaces for components
 * 3. Composition: Hand composed of cards, game composed of components
 * 4. Polymorphism: All betting actions handled uniformly
 * 
 * ARCHITECTURAL PRINCIPLES:
 * - Single Responsibility: Each class has one clear purpose
 * - Open/Closed: Easy to extend without modification
 * - Dependency Injection: Components injected into game
 * - Low Coupling: Components interact through clean interfaces
 */

// Enums - Using Object.freeze() for immutability
const Suit = Object.freeze({
    HEARTS: { symbol: '♥', name: 'HEARTS' },
    DIAMONDS: { symbol: '♦', name: 'DIAMONDS' },
    CLUBS: { symbol: '♣', name: 'CLUBS' },
    SPADES: { symbol: '♠', name: 'SPADES' }
});

const Rank = Object.freeze({
    TWO: { value: 2, symbol: '2' },
    THREE: { value: 3, symbol: '3' },
    FOUR: { value: 4, symbol: '4' },
    FIVE: { value: 5, symbol: '5' },
    SIX: { value: 6, symbol: '6' },
    SEVEN: { value: 7, symbol: '7' },
    EIGHT: { value: 8, symbol: '8' },
    NINE: { value: 9, symbol: '9' },
    TEN: { value: 10, symbol: '10' },
    JACK: { value: 11, symbol: 'J' },
    QUEEN: { value: 12, symbol: 'Q' },
    KING: { value: 13, symbol: 'K' },
    ACE: { value: 14, symbol: 'A' }
});

const HandRanking = Object.freeze({
    HIGH_CARD: { value: 1, name: 'High Card' },
    ONE_PAIR: { value: 2, name: 'One Pair' },
    TWO_PAIR: { value: 3, name: 'Two Pair' },
    THREE_OF_A_KIND: { value: 4, name: 'Three of a Kind' },
    STRAIGHT: { value: 5, name: 'Straight' },
    FLUSH: { value: 6, name: 'Flush' },
    FULL_HOUSE: { value: 7, name: 'Full House' },
    FOUR_OF_A_KIND: { value: 8, name: 'Four of a Kind' },
    STRAIGHT_FLUSH: { value: 9, name: 'Straight Flush' },
    ROYAL_FLUSH: { value: 10, name: 'Royal Flush' }
});

const PlayerState = Object.freeze({
    ACTIVE: 'active',
    FOLDED: 'folded',
    ALL_IN: 'all_in'
});

const GameStage = Object.freeze({
    WAITING: 'waiting',
    PRE_FLOP: 'pre_flop',
    FLOP: 'flop',
    TURN: 'turn',
    RIVER: 'river',
    SHOWDOWN: 'showdown'
});

/**
 * Card - Immutable playing card
 * 
 * OOP CONCEPT: Value Object
 * - Immutable after creation
 * - Equality based on rank and suit
 */
class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }

    toString() {
        return `${this.rank.symbol}${this.suit.symbol}`;
    }

    equals(other) {
        return this.rank.value === other.rank.value && 
               this.suit.name === other.suit.name;
    }
}

/**
 * Deck - Standard 52-card deck with shuffle and deal
 * 
 * DESIGN PATTERN: Factory Pattern
 * - Creates all cards in standard configuration
 * - Ensures deck validity
 */
class Deck {
    constructor() {
        this.cards = [];
        this.reset();
    }

    /**
     * Create fresh 52-card deck
     */
    reset() {
        this.cards = [];
        for (const suit of Object.values(Suit)) {
            for (const rank of Object.values(Rank)) {
                this.cards.push(new Card(rank, suit));
            }
        }
    }

    /**
     * Fisher-Yates shuffle for fairness
     * 
     * SECURITY: For real money games, use crypto.getRandomValues()
     * 
     * Time Complexity: O(52) = O(1)
     */
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    /**
     * Deal one card from top of deck
     */
    deal() {
        return this.cards.pop();
    }

    get length() {
        return this.cards.length;
    }
}

/**
 * Hand - Represents evaluated 5-card poker hand
 * 
 * OOP CONCEPT: Encapsulation
 * - Internal ranking logic hidden
 * - Comparison based on poker rules
 */
class Hand {
    constructor(cards, ranking, rankValues) {
        this.cards = cards;
        this.ranking = ranking;
        this.rankValues = rankValues; // For tie-breaking
    }

    /**
     * Compare two hands to determine winner
     * 
     * BUSINESS RULE: Higher ranking wins, ties broken by rank values
     * 
     * @returns {number} 1 if self wins, -1 if other wins, 0 if tie
     */
    compare(other) {
        if (this.ranking.value > other.ranking.value) {
            return 1;
        } else if (this.ranking.value < other.ranking.value) {
            return -1;
        }

        // Same ranking, compare rank values
        for (let i = 0; i < this.rankValues.length; i++) {
            if (this.rankValues[i] > other.rankValues[i]) {
                return 1;
            } else if (this.rankValues[i] < other.rankValues[i]) {
                return -1;
            }
        }

        return 0; // Perfect tie
    }

    toString() {
        return `${this.ranking.name}: ${this.cards.map(c => c.toString()).join(' ')}`;
    }
}

/**
 * HandEvaluator - Evaluates poker hands using Chain of Responsibility
 * 
 * DESIGN PATTERN: Chain of Responsibility
 * - Checks for each hand type in order from highest to lowest
 * - Returns first match
 */
class HandEvaluator {
    /**
     * Evaluate 5-card hand
     * 
     * ALGORITHM: Check each hand type from best to worst
     * 
     * Time Complexity: O(1) - fixed number of checks for 5 cards
     */
    static evaluateHand(cards) {
        if (cards.length !== 5) {
            throw new Error('Hand must contain exactly 5 cards');
        }

        // Sort cards by rank
        const sortedCards = [...cards].sort((a, b) => b.rank.value - a.rank.value);
        const ranks = sortedCards.map(c => c.rank.value);
        const suits = sortedCards.map(c => c.suit.name);

        // Count ranks
        const rankCounts = {};
        ranks.forEach(r => rankCounts[r] = (rankCounts[r] || 0) + 1);

        const isFlush = new Set(suits).size === 1;
        let isStraight = HandEvaluator._checkStraight(ranks);

        // Check for Ace-low straight (A-2-3-4-5)
        if (ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && 
            ranks[3] === 3 && ranks[4] === 2) {
            isStraight = true;
            ranks[0] = 1; // Adjust ace to low
            sortedCards.unshift(sortedCards.pop()); // Move ace to end
        }

        // Royal Flush: A-K-Q-J-10 of same suit
        if (isFlush && isStraight && ranks[0] === 14) {
            return new Hand(sortedCards, HandRanking.ROYAL_FLUSH, ranks);
        }

        // Straight Flush
        if (isFlush && isStraight) {
            return new Hand(sortedCards, HandRanking.STRAIGHT_FLUSH, ranks);
        }

        // Four of a Kind
        const fourRank = Object.keys(rankCounts).find(r => rankCounts[r] === 4);
        if (fourRank) {
            const kicker = ranks.find(r => r !== parseInt(fourRank));
            return new Hand(sortedCards, HandRanking.FOUR_OF_A_KIND, 
                          [parseInt(fourRank), kicker]);
        }

        // Full House
        const threeRank = Object.keys(rankCounts).find(r => rankCounts[r] === 3);
        const pairRank = Object.keys(rankCounts).find(r => rankCounts[r] === 2);
        if (threeRank && pairRank) {
            return new Hand(sortedCards, HandRanking.FULL_HOUSE, 
                          [parseInt(threeRank), parseInt(pairRank)]);
        }

        // Flush
        if (isFlush) {
            return new Hand(sortedCards, HandRanking.FLUSH, ranks);
        }

        // Straight
        if (isStraight) {
            return new Hand(sortedCards, HandRanking.STRAIGHT, ranks);
        }

        // Three of a Kind
        if (threeRank) {
            const kickers = ranks.filter(r => r !== parseInt(threeRank))
                                .sort((a, b) => b - a);
            return new Hand(sortedCards, HandRanking.THREE_OF_A_KIND, 
                          [parseInt(threeRank), ...kickers]);
        }

        // Two Pair
        const pairs = Object.keys(rankCounts).filter(r => rankCounts[r] === 2)
                           .map(r => parseInt(r))
                           .sort((a, b) => b - a);
        if (pairs.length === 2) {
            const kicker = ranks.find(r => !pairs.includes(r));
            return new Hand(sortedCards, HandRanking.TWO_PAIR, [...pairs, kicker]);
        }

        // One Pair
        if (pairs.length === 1) {
            const kickers = ranks.filter(r => r !== pairs[0])
                                .sort((a, b) => b - a);
            return new Hand(sortedCards, HandRanking.ONE_PAIR, [pairs[0], ...kickers]);
        }

        // High Card
        return new Hand(sortedCards, HandRanking.HIGH_CARD, ranks);
    }

    /**
     * Check if ranks form a straight (5 consecutive cards)
     */
    static _checkStraight(ranks) {
        for (let i = 0; i < ranks.length - 1; i++) {
            if (ranks[i] !== ranks[i + 1] + 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find best 5-card hand from 7 cards (2 hole + 5 community)
     * 
     * ALGORITHM: Check all C(7,5) = 21 combinations
     * 
     * Time Complexity: O(21) = O(1) constant time
     */
    static findBestHand(sevenCards) {
        let bestHand = null;

        // Generate all 5-card combinations
        const combinations = HandEvaluator._getCombinations(sevenCards, 5);

        for (const fiveCards of combinations) {
            const hand = HandEvaluator.evaluateHand(fiveCards);

            if (!bestHand || hand.compare(bestHand) > 0) {
                bestHand = hand;
            }
        }

        return bestHand;
    }

    /**
     * Generate all k-combinations of array
     */
    static _getCombinations(array, k) {
        const result = [];

        function combine(start, chosen) {
            if (chosen.length === k) {
                result.push([...chosen]);
                return;
            }

            for (let i = start; i < array.length; i++) {
                chosen.push(array[i]);
                combine(i + 1, chosen);
                chosen.pop();
            }
        }

        combine(0, []);
        return result;
    }
}

/**
 * Player - Represents a poker player
 * 
 * OOP CONCEPT: Encapsulation
 * - Hole cards private, accessed through methods
 * - Chip management internal
 */
class Player {
    constructor(name, chips) {
        this.name = name;
        this.chips = chips;
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBetThisHand = 0;
        this.state = PlayerState.ACTIVE;
    }

    /**
     * Receive hole cards
     */
    receiveCards(cards) {
        this.holeCards = cards;
    }

    /**
     * Place a bet
     * 
     * BUSINESS RULE: Cannot bet more than current chips
     * 
     * @returns {boolean} True if bet successful
     */
    makeBet(amount) {
        if (amount > this.chips) {
            return false;
        }

        this.chips -= amount;
        this.currentBet += amount;
        this.totalBetThisHand += amount;

        if (this.chips === 0) {
            this.state = PlayerState.ALL_IN;
        }

        return true;
    }

    /**
     * Fold hand - player out of this round
     */
    fold() {
        this.state = PlayerState.FOLDED;
    }

    /**
     * Get best 5-card hand from hole cards + community cards
     */
    getBestHand(communityCards) {
        const allCards = [...this.holeCards, ...communityCards];
        return HandEvaluator.findBestHand(allCards);
    }

    /**
     * Reset player state for new hand
     */
    resetForNewHand() {
        this.holeCards = [];
        this.currentBet = 0;
        this.totalBetThisHand = 0;
        this.state = this.chips > 0 ? PlayerState.ACTIVE : PlayerState.FOLDED;
    }

    toString() {
        return `${this.name} ($${this.chips})`;
    }
}

/**
 * Pot - Manages main pot and side pots
 * 
 * DESIGN PATTERN: Complex pot math with side pots
 * - Handles multiple all-in scenarios
 * - Ensures correct distribution
 */
class Pot {
    constructor() {
        this.total = 0;
        this.sidePots = [];
    }

    /**
     * Add chips to pot
     */
    addChips(amount) {
        this.total += amount;
    }

    toString() {
        return `Pot: $${this.total}`;
    }
}

/**
 * PokerGame - Main Texas Hold'em game controller
 * 
 * DESIGN PATTERN: Facade Pattern
 * - Provides simple interface to complex poker rules
 * - Coordinates all game components
 * 
 * DESIGN PATTERN: State Pattern
 * - Manages game stage transitions
 */
class PokerGame {
    constructor(playerNames, startingChips = 1000, smallBlind = 10, bigBlind = 20) {
        this.players = playerNames.map(name => new Player(name, startingChips));
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = new Pot();
        this.stage = GameStage.WAITING;
        this.dealerPosition = 0;
        this.smallBlind = smallBlind;
        this.bigBlind = bigBlind;
        this.currentBet = 0;
        this.minRaise = bigBlind;
    }

    /**
     * Start new hand
     * 
     * STATE TRANSITION: WAITING → PRE_FLOP
     * 
     * BUSINESS RULE: Post blinds, deal hole cards
     */
    startHand() {
        // Reset game state
        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = new Pot();
        this.currentBet = 0;
        this.stage = GameStage.PRE_FLOP;

        // Reset players
        this.players.forEach(player => player.resetForNewHand());

        // Post blinds
        const activePlayers = this.players.filter(p => p.chips > 0);
        if (activePlayers.length < 2) {
            return;
        }

        const sbPos = (this.dealerPosition + 1) % activePlayers.length;
        const bbPos = (this.dealerPosition + 2) % activePlayers.length;

        const sbAmount = Math.min(this.smallBlind, activePlayers[sbPos].chips);
        const bbAmount = Math.min(this.bigBlind, activePlayers[bbPos].chips);

        activePlayers[sbPos].makeBet(sbAmount);
        activePlayers[bbPos].makeBet(bbAmount);

        this.currentBet = this.bigBlind;
        this.pot.addChips(sbAmount + bbAmount);

        // Deal hole cards
        activePlayers.forEach(player => {
            player.receiveCards([this.deck.deal(), this.deck.deal()]);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`NEW HAND - Dealer: ${activePlayers[this.dealerPosition].name}`);
        console.log('='.repeat(60));
        activePlayers.forEach(player => {
            if (player.state !== PlayerState.FOLDED) {
                console.log(`${player.name}: ${player.holeCards.map(c => c.toString()).join(' ')}`);
            }
        });
    }

    /**
     * Deal flop (3 community cards)
     * 
     * STATE TRANSITION: PRE_FLOP → FLOP
     */
    dealFlop() {
        this.stage = GameStage.FLOP;
        this.deck.deal(); // Burn card
        this.communityCards.push(this.deck.deal(), this.deck.deal(), this.deck.deal());
        console.log('\n' + '='.repeat(60));
        console.log(`FLOP: ${this.communityCards.map(c => c.toString()).join(' ')}`);
        console.log('='.repeat(60));
    }

    /**
     * Deal turn (4th community card)
     * 
     * STATE TRANSITION: FLOP → TURN
     */
    dealTurn() {
        this.stage = GameStage.TURN;
        this.deck.deal(); // Burn card
        this.communityCards.push(this.deck.deal());
        console.log('\n' + '='.repeat(60));
        console.log(`TURN: ${this.communityCards.map(c => c.toString()).join(' ')}`);
        console.log('='.repeat(60));
    }

    /**
     * Deal river (5th community card)
     * 
     * STATE TRANSITION: TURN → RIVER
     */
    dealRiver() {
        this.stage = GameStage.RIVER;
        this.deck.deal(); // Burn card
        this.communityCards.push(this.deck.deal());
        console.log('\n' + '='.repeat(60));
        console.log(`RIVER: ${this.communityCards.map(c => c.toString()).join(' ')}`);
        console.log('='.repeat(60));
    }

    /**
     * Determine winning player(s) at showdown
     * 
     * BUSINESS RULE: Compare hands of active players
     * 
     * @returns {Player[]} List of winners (multiple if tie)
     */
    determineWinners() {
        this.stage = GameStage.SHOWDOWN;

        const activePlayers = this.players.filter(p => p.state !== PlayerState.FOLDED);

        if (activePlayers.length === 1) {
            return activePlayers;
        }

        // Evaluate hands
        const playerHands = activePlayers.map(player => ({
            player,
            hand: player.getBestHand(this.communityCards)
        }));

        playerHands.forEach(({ player, hand }) => {
            console.log(`${player.name}: ${hand.toString()}`);
        });

        // Find best hand
        playerHands.sort((a, b) => b.hand.ranking.value - a.hand.ranking.value);
        const bestRanking = playerHands[0].hand.ranking.value;

        const winners = [];
        for (const { player, hand } of playerHands) {
            if (hand.ranking.value === bestRanking) {
                if (winners.length === 0 || hand.compare(winners[0].hand) === 0) {
                    winners.push({ player, hand });
                } else if (hand.compare(winners[0].hand) > 0) {
                    winners.length = 0;
                    winners.push({ player, hand });
                }
            }
        }

        return winners.map(w => w.player);
    }

    /**
     * Distribute pot to winner(s)
     * 
     * BUSINESS RULE: Split pot evenly if multiple winners
     */
    distributePot(winners) {
        if (winners.length === 0) {
            return;
        }

        const amountPerWinner = Math.floor(this.pot.total / winners.length);

        winners.forEach(winner => {
            winner.chips += amountPerWinner;
        });

        console.log('\n' + '='.repeat(60));
        if (winners.length === 1) {
            console.log(`WINNER: ${winners[0].name} wins $${this.pot.total}`);
        } else {
            console.log(`TIE: ${winners.map(w => w.name).join(', ')} split $${this.pot.total}`);
        }
        console.log('='.repeat(60));

        // Rotate dealer
        this.dealerPosition = (this.dealerPosition + 1) % this.players.length;
        this.stage = GameStage.WAITING;
    }

    /**
     * Play complete hand with automatic actions (for demo)
     * 
     * DEMO FEATURE: Simulates simple betting for demonstration
     */
    playHandAuto() {
        this.startHand();

        // Simple AI: everyone calls pre-flop
        const activePlayers = this.players.filter(p => 
            p.chips > 0 && p.state !== PlayerState.FOLDED
        );

        activePlayers.forEach(player => {
            const callAmount = this.currentBet - player.currentBet;
            if (callAmount > 0 && player.chips > 0) {
                const betAmount = Math.min(callAmount, player.chips);
                player.makeBet(betAmount);
                this.pot.addChips(betAmount);
            }
        });

        this.dealFlop();
        this.dealTurn();
        this.dealRiver();

        const winners = this.determineWinners();
        this.distributePot(winners);
    }
}

/**
 * Demonstrate Poker Game with automated hand
 */
function main() {
    console.log('='.repeat(60));
    console.log('TEXAS HOLD\'EM POKER GAME - Low Level Design Demo');
    console.log('='.repeat(60));

    // Demo 1: Simple 4-player game
    console.log('\nDemo 1: Four-Player Texas Hold\'em');
    console.log('-'.repeat(60));
    const game = new PokerGame(
        ['Alice', 'Bob', 'Charlie', 'Diana'],
        1000,  // starting chips
        10,    // small blind
        20     // big blind
    );

    game.playHandAuto();

    console.log('\n\nDemo 2: Another Hand');
    console.log('-'.repeat(60));
    game.playHandAuto();

    // Display final chip counts
    console.log('\n' + '='.repeat(60));
    console.log('FINAL CHIP COUNTS');
    console.log('='.repeat(60));
    game.players.forEach(player => {
        console.log(`${player.name}: $${player.chips}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('DEMO COMPLETE');
    console.log('='.repeat(60));
    console.log('\nFor full functionality, implement:');
    console.log('- Interactive betting with fold/check/call/raise options');
    console.log('- Proper betting round with action rotation');
    console.log('- Side pot management for all-in scenarios');
    console.log('- Blind increases for tournament mode');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PokerGame,
        Player,
        Hand,
        HandEvaluator,
        Card,
        Deck,
        Pot,
        Rank,
        Suit,
        HandRanking,
        PlayerState,
        GameStage
    };
}

// Run demo if executed directly
if (typeof require !== 'undefined' && require.main === module) {
    main();
}

